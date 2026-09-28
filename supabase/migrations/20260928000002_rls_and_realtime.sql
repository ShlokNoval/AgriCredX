-- ============================================================
-- AgriCredX — Row Level Security (RLS) & Realtime
-- Migration: 20260928000002_rls_and_realtime.sql
-- ============================================================
-- Complete multi-tenant isolation policies for all tables,
-- storage.objects policies for the private documents bucket,
-- and Realtime publication configuration.
-- ============================================================

-- -------------------------------------------------------
-- Helper Functions (SECURITY DEFINER to avoid recursion)
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION auth_role()
RETURNS user_role AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION auth_org_id()
RETURNS UUID AS $$
    SELECT organization_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public, pg_temp;

-- ============================================================
-- 1. Organizations
-- ============================================================
DROP POLICY IF EXISTS organizations_select ON organizations;
CREATE POLICY organizations_select ON organizations
    FOR SELECT USING (
        id = auth_org_id()
        OR auth_role() = 'admin'
    );

DROP POLICY IF EXISTS organizations_insert ON organizations;
CREATE POLICY organizations_insert ON organizations
    FOR INSERT WITH CHECK (auth_role() = 'admin');

DROP POLICY IF EXISTS organizations_update ON organizations;
CREATE POLICY organizations_update ON organizations
    FOR UPDATE USING (auth_role() = 'admin');

-- ============================================================
-- 2. Profiles
-- ============================================================
DROP POLICY IF EXISTS profiles_select ON profiles;
CREATE POLICY profiles_select ON profiles
    FOR SELECT USING (
        id = auth.uid()
        OR auth_role() = 'admin'
    );

DROP POLICY IF EXISTS profiles_insert ON profiles;
CREATE POLICY profiles_insert ON profiles
    FOR INSERT WITH CHECK (
        id = auth.uid()
        -- Regular signup cannot assign admin role
        AND (role != 'admin' OR auth_role() = 'admin')
    );

DROP POLICY IF EXISTS profiles_update ON profiles;
CREATE POLICY profiles_update ON profiles
    FOR UPDATE USING (
        id = auth.uid() OR auth_role() = 'admin'
    )
    WITH CHECK (
        -- User cannot escalate their own role from non-admin to admin
        (id = auth.uid() AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()))
        OR auth_role() = 'admin'
    );

-- ============================================================
-- 3. Receivables
-- ============================================================
DROP POLICY IF EXISTS receivables_select ON receivables;
CREATE POLICY receivables_select ON receivables
    FOR SELECT USING (
        -- Supplier: receivable belongs to their organization
        supplier_id = auth_org_id()
        -- Buyer: receivable names their organization as buyer
        OR buyer_id = auth_org_id()
        -- Financier: only post-attestation / financeable statuses
        OR (
            auth_role() = 'financier'
            AND status IN ('FINANCEABLE', 'FUNDED', 'OUTSTANDING', 'REPAID', 'CLOSED')
        )
        -- Admin: full operational visibility
        OR auth_role() = 'admin'
    );

DROP POLICY IF EXISTS receivables_insert ON receivables;
CREATE POLICY receivables_insert ON receivables
    FOR INSERT WITH CHECK (
        auth_role() = 'supplier'
        AND supplier_id = auth_org_id()
    );

DROP POLICY IF EXISTS receivables_update ON receivables;
CREATE POLICY receivables_update ON receivables
    FOR UPDATE USING (
        supplier_id = auth_org_id()
        OR buyer_id = auth_org_id()
        OR auth_role() = 'admin'
    );

-- ============================================================
-- 4. Documents
-- ============================================================
DROP POLICY IF EXISTS documents_select ON documents;
CREATE POLICY documents_select ON documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM receivables r
            WHERE r.id = documents.receivable_id
            AND (
                r.supplier_id = auth_org_id()
                OR r.buyer_id = auth_org_id()
                OR (
                    auth_role() = 'financier'
                    AND r.status IN ('FINANCEABLE', 'FUNDED', 'OUTSTANDING', 'REPAID', 'CLOSED')
                )
            )
        )
        OR auth_role() = 'admin'
    );

DROP POLICY IF EXISTS documents_insert ON documents;
CREATE POLICY documents_insert ON documents
    FOR INSERT WITH CHECK (
        uploaded_by = auth.uid()
        AND EXISTS (
            SELECT 1 FROM receivables r
            WHERE r.id = documents.receivable_id
            AND r.supplier_id = auth_org_id()
        )
    );

DROP POLICY IF EXISTS documents_update ON documents;
CREATE POLICY documents_update ON documents
    FOR UPDATE USING (
        uploaded_by = auth.uid()
        OR auth_role() = 'admin'
    );

-- ============================================================
-- 5. Verification Results
-- ============================================================
DROP POLICY IF EXISTS verification_results_select ON verification_results;
CREATE POLICY verification_results_select ON verification_results
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM receivables r
            WHERE r.id = verification_results.receivable_id
            AND (
                r.supplier_id = auth_org_id()
                OR r.buyer_id = auth_org_id()
                OR (
                    auth_role() = 'financier'
                    AND r.status IN ('FINANCEABLE', 'FUNDED', 'OUTSTANDING', 'REPAID', 'CLOSED')
                )
            )
        )
        OR auth_role() = 'admin'
    );

-- INSERT: service-role key or admin only (Edge Function writes AI results)
DROP POLICY IF EXISTS verification_results_insert ON verification_results;
CREATE POLICY verification_results_insert ON verification_results
    FOR INSERT WITH CHECK (auth_role() = 'admin');

-- ============================================================
-- 6. Attestations
-- ============================================================
DROP POLICY IF EXISTS attestations_select ON attestations;
CREATE POLICY attestations_select ON attestations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM receivables r
            WHERE r.id = attestations.receivable_id
            AND (
                r.supplier_id = auth_org_id()
                OR r.buyer_id = auth_org_id()
                OR (
                    auth_role() = 'financier'
                    AND r.status IN ('FINANCEABLE', 'FUNDED', 'OUTSTANDING', 'REPAID', 'CLOSED')
                )
            )
        )
        OR auth_role() = 'admin'
    );

DROP POLICY IF EXISTS attestations_insert ON attestations;
CREATE POLICY attestations_insert ON attestations
    FOR INSERT WITH CHECK (auth_role() = 'admin');

-- ============================================================
-- 7. Financing Requests
-- ============================================================
DROP POLICY IF EXISTS financing_requests_select ON financing_requests;
CREATE POLICY financing_requests_select ON financing_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM receivables r
            WHERE r.id = financing_requests.receivable_id
            AND r.supplier_id = auth_org_id()
        )
        OR auth_role() = 'financier'
        OR auth_role() = 'admin'
    );

DROP POLICY IF EXISTS financing_requests_insert ON financing_requests;
CREATE POLICY financing_requests_insert ON financing_requests
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM receivables r
            WHERE r.id = financing_requests.receivable_id
            AND r.supplier_id = auth_org_id()
            AND r.status = 'FINANCEABLE'
        )
    );

DROP POLICY IF EXISTS financing_requests_update ON financing_requests;
CREATE POLICY financing_requests_update ON financing_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM receivables r
            WHERE r.id = financing_requests.receivable_id
            AND r.supplier_id = auth_org_id()
        )
        OR auth_role() = 'admin'
    );

-- ============================================================
-- 8. Financing Bids
-- ============================================================
DROP POLICY IF EXISTS financing_bids_select ON financing_bids;
CREATE POLICY financing_bids_select ON financing_bids
    FOR SELECT USING (
        -- Financier sees their own bids
        financier_id = auth.uid()
        -- Supplier sees bids on their own receivables
        OR EXISTS (
            SELECT 1 FROM financing_requests fr
            JOIN receivables r ON r.id = fr.receivable_id
            WHERE fr.id = financing_bids.request_id
            AND r.supplier_id = auth_org_id()
        )
        OR auth_role() = 'admin'
    );

DROP POLICY IF EXISTS financing_bids_insert ON financing_bids;
CREATE POLICY financing_bids_insert ON financing_bids
    FOR INSERT WITH CHECK (
        auth_role() = 'financier'
        AND financier_id = auth.uid()
        AND EXISTS (
            SELECT 1
            FROM financing_requests fr
            JOIN receivables r ON r.id = fr.receivable_id
            WHERE fr.id = financing_bids.request_id
              AND fr.status = 'OPEN'
              AND r.status = 'FINANCEABLE'
        )
    );

DROP POLICY IF EXISTS financing_bids_update ON financing_bids;
CREATE POLICY financing_bids_update ON financing_bids
    FOR UPDATE USING (
        financier_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM financing_requests fr
            JOIN receivables r ON r.id = fr.receivable_id
            WHERE fr.id = financing_bids.request_id
            AND r.supplier_id = auth_org_id()
        )
        OR auth_role() = 'admin'
    );

-- ============================================================
-- 9. Financings
-- ============================================================
DROP POLICY IF EXISTS financings_select ON financings;
CREATE POLICY financings_select ON financings
    FOR SELECT USING (
        financier_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM receivables r
            WHERE r.id = financings.receivable_id
            AND (
                r.supplier_id = auth_org_id()
                OR r.buyer_id = auth_org_id()
            )
        )
        OR auth_role() = 'admin'
    );

DROP POLICY IF EXISTS financings_insert ON financings;
CREATE POLICY financings_insert ON financings
    FOR INSERT WITH CHECK (auth_role() = 'admin');

-- ============================================================
-- 10. Repayments
-- ============================================================
DROP POLICY IF EXISTS repayments_select ON repayments;
CREATE POLICY repayments_select ON repayments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM receivables r
            LEFT JOIN financings f ON f.receivable_id = r.id
            WHERE r.id = repayments.receivable_id
            AND (
                r.supplier_id = auth_org_id()
                OR r.buyer_id = auth_org_id()
                OR f.financier_id = auth.uid()
            )
        )
        OR auth_role() = 'admin'
    );

DROP POLICY IF EXISTS repayments_insert ON repayments;
CREATE POLICY repayments_insert ON repayments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM receivables r
            WHERE r.id = repayments.receivable_id
            AND r.buyer_id = auth_org_id()
        )
        OR auth_role() = 'admin'
    );

-- ============================================================
-- 11. Audit Logs
-- ============================================================
DROP POLICY IF EXISTS audit_logs_select ON audit_logs;
CREATE POLICY audit_logs_select ON audit_logs
    FOR SELECT USING (auth_role() = 'admin');

-- Anti-forgery: only admin (or service-role) can insert audit records
DROP POLICY IF EXISTS audit_logs_insert ON audit_logs;
CREATE POLICY audit_logs_insert ON audit_logs
    FOR INSERT WITH CHECK (auth_role() = 'admin');

-- ============================================================
-- Storage Policies (storage.objects for 'documents' bucket)
-- ============================================================
-- Ensure bucket exists in storage.buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'documents', 
    'documents', 
    false, 
    10485760, 
    ARRAY['application/pdf', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Storage SELECT: Supplier, Buyer, Financier (if financeable+), Admin
DROP POLICY IF EXISTS "documents_storage_select" ON storage.objects;
CREATE POLICY "documents_storage_select" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'documents'
        AND (
            auth_role() = 'admin'
            OR EXISTS (
                SELECT 1 FROM public.documents d
                JOIN public.receivables r ON r.id = d.receivable_id
                WHERE d.object_key = name
                AND (
                    r.supplier_id = auth_org_id()
                    OR r.buyer_id = auth_org_id()
                    OR (
                        auth_role() = 'financier'
                        AND r.status IN ('FINANCEABLE', 'FUNDED', 'OUTSTANDING', 'REPAID', 'CLOSED')
                    )
                )
            )
        )
    );

-- Storage INSERT: Supplier uploading only to paths belonging to their own organization's receivable
DROP POLICY IF EXISTS "documents_storage_insert" ON storage.objects;
CREATE POLICY "documents_storage_insert" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'documents'
        AND (
            auth_role() = 'admin'
            OR (
                auth_role() = 'supplier'
                AND EXISTS (
                    SELECT 1 FROM public.receivables r
                    WHERE (
                        r.id::text = (storage.foldername(name))[1]
                        OR r.id::text = (storage.foldername(name))[2]
                        OR r.id::text = split_part(name, '/', 1)
                        OR r.id::text = split_part(name, '/', 2)
                    )
                    AND r.supplier_id = auth_org_id()
                )
            )
        )
    );

-- Storage DELETE: Uploader or admin only
DROP POLICY IF EXISTS "documents_storage_delete" ON storage.objects;
CREATE POLICY "documents_storage_delete" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'documents'
        AND (
            auth_role() = 'admin'
            OR owner = auth.uid()
        )
    );

-- ============================================================
-- Realtime Configuration
-- ============================================================
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE receivables;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE verification_results;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE receivables REPLICA IDENTITY FULL;
ALTER TABLE verification_results REPLICA IDENTITY FULL;
