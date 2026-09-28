-- ============================================================
-- AgriCredX — Row-Level Security Policies
-- ============================================================
-- Complete tenant-isolation policies for every table.
--
-- Design principles:
--   • Suppliers see their own receivables and related data.
--   • Buyers see receivables where they are the buyer.
--   • Financiers see only FINANCEABLE / FUNDED / OUTSTANDING /
--     REPAID / CLOSED receivables (and related child rows).
--   • Admins see everything.
--   • Service-role key bypasses RLS (Edge Functions only).
--   • INSERT / UPDATE / DELETE are scoped per role where needed.
--
-- Helper function: get the caller's profile from auth.uid().
-- ============================================================

-- -------------------------------------------------------
-- Helper: return the current user's role
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION auth_role()
RETURNS user_role AS $$
    SELECT role FROM user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- -------------------------------------------------------
-- Helper: return the current user's organization_id
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION auth_org_id()
RETURNS UUID AS $$
    SELECT organization_id FROM user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- 1. organizations
-- ============================================================

-- Everyone can read their own org; admins read all
CREATE POLICY organizations_select ON organizations
    FOR SELECT USING (
        id = auth_org_id()
        OR auth_role() = 'admin'
    );

-- Only admins can mutate organisations
CREATE POLICY organizations_insert ON organizations
    FOR INSERT WITH CHECK (auth_role() = 'admin');

CREATE POLICY organizations_update ON organizations
    FOR UPDATE USING (auth_role() = 'admin');

-- ============================================================
-- 2. user_profiles
-- ============================================================

-- Users see own profile; admins see all
CREATE POLICY user_profiles_select ON user_profiles
    FOR SELECT USING (
        id = auth.uid()
        OR auth_role() = 'admin'
    );

-- Users can update only their own profile
CREATE POLICY user_profiles_update ON user_profiles
    FOR UPDATE USING (id = auth.uid());

-- Insert is allowed for the auth trigger / signup flow
CREATE POLICY user_profiles_insert ON user_profiles
    FOR INSERT WITH CHECK (id = auth.uid());

-- ============================================================
-- 3. receivables
-- ============================================================

-- SELECT: supplier owns, buyer is named, financier sees financeable+, admin sees all
CREATE POLICY receivables_select ON receivables
    FOR SELECT USING (
        -- Supplier: receivable belongs to their org
        supplier_id = auth_org_id()
        -- Buyer: receivable names their org as buyer
        OR buyer_id = auth_org_id()
        -- Financier: only post-attestation statuses
        OR (
            auth_role() = 'financier'
            AND status IN ('FINANCEABLE', 'FUNDED', 'OUTSTANDING', 'REPAID', 'CLOSED')
        )
        -- Admin: everything
        OR auth_role() = 'admin'
    );

-- INSERT: only suppliers can create receivables
CREATE POLICY receivables_insert ON receivables
    FOR INSERT WITH CHECK (
        auth_role() = 'supplier'
        AND supplier_id = auth_org_id()
    );

-- UPDATE: suppliers update own receivables; buyers can update status for acceptance
CREATE POLICY receivables_update ON receivables
    FOR UPDATE USING (
        supplier_id = auth_org_id()
        OR buyer_id = auth_org_id()
        OR auth_role() = 'admin'
    );

-- ============================================================
-- 4. documents
-- ============================================================

-- SELECT: supplier (owner of receivable) + buyer (of that receivable)
CREATE POLICY documents_select ON documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM receivables r
            WHERE r.id = documents.receivable_id
            AND (
                r.supplier_id = auth_org_id()
                OR r.buyer_id = auth_org_id()
            )
        )
        OR auth_role() = 'admin'
    );

-- INSERT: only the supplier who owns the receivable
CREATE POLICY documents_insert ON documents
    FOR INSERT WITH CHECK (
        uploaded_by = auth.uid()
        AND EXISTS (
            SELECT 1 FROM receivables r
            WHERE r.id = documents.receivable_id
            AND r.supplier_id = auth_org_id()
        )
    );

-- UPDATE: only the supplier who uploaded
CREATE POLICY documents_update ON documents
    FOR UPDATE USING (
        uploaded_by = auth.uid()
    );

-- ============================================================
-- 5. verification_results
-- ============================================================

-- SELECT: supplier, buyer of that receivable, financier (for financeable+)
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

-- INSERT: service-role only (Edge Function writes verification results)
-- No anon/authenticated insert policy needed; service role bypasses RLS.

-- ============================================================
-- 6. attestations
-- ============================================================

-- SELECT: supplier, buyer, financier (for financeable+) of that receivable
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

-- INSERT: service-role only (Edge Function / system process)

-- ============================================================
-- 7. financing_requests
-- ============================================================

-- SELECT: supplier (own receivable), all financiers, admin
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

-- INSERT: only the supplier who owns the receivable
CREATE POLICY financing_requests_insert ON financing_requests
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM receivables r
            WHERE r.id = financing_requests.receivable_id
            AND r.supplier_id = auth_org_id()
            AND r.status = 'FINANCEABLE'
        )
    );

-- UPDATE: supplier (to close), admin
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
-- 8. financing_bids
-- ============================================================

-- SELECT: financier sees own bids, supplier sees bids on own receivables
CREATE POLICY financing_bids_select ON financing_bids
    FOR SELECT USING (
        -- Financier sees their own bids
        financier_id = auth.uid()
        -- Supplier sees bids on their receivables
        OR EXISTS (
            SELECT 1 FROM financing_requests fr
            JOIN receivables r ON r.id = fr.receivable_id
            WHERE fr.id = financing_bids.request_id
            AND r.supplier_id = auth_org_id()
        )
        OR auth_role() = 'admin'
    );

-- INSERT: only financiers can submit bids
CREATE POLICY financing_bids_insert ON financing_bids
    FOR INSERT WITH CHECK (
        auth_role() = 'financier'
        AND financier_id = auth.uid()
    );

-- UPDATE: financier (own bids), supplier (to select/reject)
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
-- 9. financings
-- ============================================================

-- SELECT: supplier + financier of that receivable
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

-- INSERT: service-role only (system process after bid selection + funding)

-- ============================================================
-- 10. repayments
-- ============================================================

-- SELECT: supplier, buyer, financier of that receivable
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

-- INSERT: buyer (repayer) or service-role
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
-- 11. audit_logs
-- ============================================================

-- SELECT: admin only
CREATE POLICY audit_logs_select ON audit_logs
    FOR SELECT USING (auth_role() = 'admin');

-- INSERT: any authenticated user (system logs actions on their behalf)
CREATE POLICY audit_logs_insert ON audit_logs
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- Storage Policies (for the 'documents' bucket)
-- ============================================================
-- NOTE: Storage bucket + policies are typically configured via
-- Supabase Dashboard or supabase CLI `storage` config.
-- The SQL below documents the intended policy rules.
-- ============================================================

-- INSERT into storage: authenticated users, path scoped to org
-- SELECT from storage: supplier (owner) or buyer (of that receivable)
-- These must be configured in the Supabase Dashboard under
-- Storage → documents → Policies, or via supabase CLI.

COMMENT ON TABLE organizations IS 'AgriCredX organizations — suppliers, buyers, financiers';
COMMENT ON TABLE user_profiles IS 'User profiles extending Supabase Auth — one per auth.users row';
COMMENT ON TABLE receivables IS 'Trade receivables — the core entity of the lifecycle';
COMMENT ON TABLE documents IS 'Uploaded evidence documents — PDFs, certificates';
COMMENT ON TABLE verification_results IS 'AI verification check results per receivable';
COMMENT ON TABLE attestations IS 'Blockchain attestation records with tx hashes';
COMMENT ON TABLE financing_requests IS 'Supplier requests for financing on financeable receivables';
COMMENT ON TABLE financing_bids IS 'Financier bids on financing requests';
COMMENT ON TABLE financings IS 'Funded receivable records — anti-double-financing enforced';
COMMENT ON TABLE repayments IS 'Repayment records for funded receivables';
COMMENT ON TABLE audit_logs IS 'Immutable audit trail — admin-readable only';
