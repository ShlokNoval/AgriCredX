-- ============================================================
-- AgriCredX — Clean Infrastructure & Security Deployment Bundle
-- Target: Hosted Supabase Project (PostgreSQL / RLS / Storage / Realtime)
-- NOTE: Zero demo records or seed Auth users included.
-- Pure schema, constraints, indexes, triggers, RLS, and storage rules.
-- ============================================================

-- ============================================================
-- SOURCE: supabase/migrations/20260928000001_complete_schema.sql
-- ============================================================

-- ============================================================
-- AgriCredX — Core Database Schema
-- Migration: 20260928000001_complete_schema.sql
-- ============================================================
-- Defines all 11 application tables, custom enum types,
-- foreign keys, indexes, triggers, and anti-double-funding constraint.
-- ============================================================

-- -------------------------------------------------------
-- Custom Types / Enums
-- -------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('supplier', 'buyer', 'financier', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE receivable_status AS ENUM (
        'CREATED', 'VERIFIED', 'BUYER_ACCEPTED', 'ATTESTED', 
        'FINANCEABLE', 'FUNDED', 'OUTSTANDING', 'REPAID', 'CLOSED', 'DISPUTED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE document_type AS ENUM (
        'invoice', 'purchase_order', 'grn', 'quality_certificate', 'lab_report'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE financing_request_status AS ENUM ('OPEN', 'SELECTED', 'FUNDED', 'CLOSED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE financing_bid_status AS ENUM ('OPEN', 'SELECTED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- -------------------------------------------------------
-- 1. Organizations
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type user_role NOT NULL,
    contact_metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------
-- 2. Profiles (extends auth.users)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'supplier',
    email TEXT NOT NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    wallet_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Compatibility view for existing code referencing user_profiles
-- Configured WITH (security_invoker = true) so RLS policies on profiles are strictly enforced
CREATE OR REPLACE VIEW user_profiles WITH (security_invoker = true) AS 
    SELECT * FROM profiles;

-- -------------------------------------------------------
-- 3. Receivables
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS receivables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id TEXT NOT NULL UNIQUE,
    supplier_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    buyer_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    amount NUMERIC(18, 2) NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'INR',
    due_date DATE NOT NULL,
    commodity TEXT NOT NULL,
    status receivable_status NOT NULL DEFAULT 'CREATED',
    attestation_digest TEXT,
    on_chain_id NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_receivables_supplier ON receivables(supplier_id);
CREATE INDEX IF NOT EXISTS idx_receivables_buyer ON receivables(buyer_id);
CREATE INDEX IF NOT EXISTS idx_receivables_status ON receivables(status);
CREATE INDEX IF NOT EXISTS idx_receivables_created_at ON receivables(created_at DESC);

-- -------------------------------------------------------
-- 4. Documents
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receivable_id UUID NOT NULL REFERENCES receivables(id) ON DELETE CASCADE,
    type document_type NOT NULL,
    filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    sha256 TEXT NOT NULL,
    object_key TEXT NOT NULL,
    version INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_receivable ON documents(receivable_id);
CREATE INDEX IF NOT EXISTS idx_documents_sha256 ON documents(sha256);

-- -------------------------------------------------------
-- 5. Verification Results
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS verification_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receivable_id UUID NOT NULL REFERENCES receivables(id) ON DELETE CASCADE,
    check_code TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('PASS', 'WARN', 'FAIL')),
    extracted_value TEXT,
    expected_value TEXT,
    explanation TEXT NOT NULL,
    engine_version TEXT NOT NULL DEFAULT 'v1',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_results_receivable ON verification_results(receivable_id);
CREATE INDEX IF NOT EXISTS idx_verification_results_status ON verification_results(status);

-- -------------------------------------------------------
-- 6. Attestations
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS attestations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receivable_id UUID NOT NULL REFERENCES receivables(id) ON DELETE CASCADE,
    digest TEXT NOT NULL,
    signer_wallet TEXT NOT NULL,
    tx_hash TEXT,
    block_reference TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    schema_version TEXT NOT NULL DEFAULT '1.0'
);

CREATE INDEX IF NOT EXISTS idx_attestations_receivable ON attestations(receivable_id);
CREATE INDEX IF NOT EXISTS idx_attestations_digest ON attestations(digest);

-- -------------------------------------------------------
-- 7. Financing Requests
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS financing_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receivable_id UUID NOT NULL REFERENCES receivables(id) ON DELETE CASCADE,
    requested_amount NUMERIC(15, 2) NOT NULL CHECK (requested_amount > 0),
    desired_term INTEGER,
    status financing_request_status NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financing_requests_receivable ON financing_requests(receivable_id);
CREATE INDEX IF NOT EXISTS idx_financing_requests_status ON financing_requests(status);

-- -------------------------------------------------------
-- 8. Financing Bids
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS financing_bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES financing_requests(id) ON DELETE CASCADE,
    financier_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    fee_or_discount NUMERIC(5, 2) CHECK (fee_or_discount >= 0 AND fee_or_discount <= 100),
    maturity DATE,
    status financing_bid_status NOT NULL DEFAULT 'OPEN',
    tx_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financing_bids_request ON financing_bids(request_id);
CREATE INDEX IF NOT EXISTS idx_financing_bids_financier ON financing_bids(financier_id);

-- -------------------------------------------------------
-- 9. Financings (Funded Receivables)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS financings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receivable_id UUID NOT NULL REFERENCES receivables(id) ON DELETE CASCADE,
    financier_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    funded_amount NUMERIC(15, 2) NOT NULL CHECK (funded_amount > 0),
    funded_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    tx_hash TEXT
);

CREATE INDEX IF NOT EXISTS idx_financings_receivable ON financings(receivable_id);
CREATE INDEX IF NOT EXISTS idx_financings_financier ON financings(financier_id);

-- Anti-double-financing constraint: exactly one ACTIVE financing per receivable
CREATE UNIQUE INDEX IF NOT EXISTS idx_financings_receivable_unique
    ON financings(receivable_id)
    WHERE status = 'ACTIVE';

-- -------------------------------------------------------
-- 10. Repayments
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS repayments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receivable_id UUID NOT NULL REFERENCES receivables(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    paid_at TIMESTAMPTZ DEFAULT NOW(),
    tx_hash TEXT,
    status TEXT NOT NULL DEFAULT 'CONFIRMED'
);

CREATE INDEX IF NOT EXISTS idx_repayments_receivable ON repayments(receivable_id);

-- -------------------------------------------------------
-- 11. Audit Logs
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    metadata_json JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- -------------------------------------------------------
-- Enable RLS on all 11 tables
-- -------------------------------------------------------
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE receivables ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE attestations ENABLE ROW LEVEL SECURITY;
ALTER TABLE financing_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE financing_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE financings ENABLE ROW LEVEL SECURITY;
ALTER TABLE repayments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------
-- Trigger: Auto-update receivables.updated_at
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_receivables_updated_at ON receivables;
CREATE TRIGGER trg_receivables_updated_at
    BEFORE UPDATE ON receivables
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- SOURCE: supabase/migrations/20260928000002_rls_and_realtime.sql
-- ============================================================

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


-- ============================================================
-- SOURCE: supabase/migrations/20260928000003_auth_profiles_trigger.sql
-- ============================================================

-- ============================================================
-- AgriCredX — Auth to Profiles Synchronization Trigger
-- Migration: 20260928000003_auth_profiles_trigger.sql
-- ============================================================
-- Automatically provisions a public.profiles row when a new
-- user is created in auth.users.
-- Prevents unauthorized role escalation to 'admin'.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    assigned_role public.user_role;
    raw_role TEXT;
    target_org UUID;
    target_wallet TEXT;
BEGIN
    raw_role := NEW.raw_user_meta_data->>'role';

    -- Safe role assignment: only allow supplier, buyer, financier
    -- Never allow public self-signup to claim 'admin'
    IF raw_role = 'buyer' THEN
        assigned_role := 'buyer'::public.user_role;
    ELSIF raw_role = 'financier' THEN
        assigned_role := 'financier'::public.user_role;
    ELSIF raw_role = 'admin' AND current_user IN ('postgres', 'supabase_admin', 'service_role') THEN
        assigned_role := 'admin'::public.user_role;
    ELSE
        assigned_role := 'supplier'::public.user_role;
    END IF;

    -- Extract organization_id if provided and valid UUID
    BEGIN
        IF NEW.raw_user_meta_data->>'organization_id' IS NOT NULL THEN
            target_org := (NEW.raw_user_meta_data->>'organization_id')::UUID;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        target_org := NULL;
    END;

    target_wallet := NEW.raw_user_meta_data->>'wallet_address';

    INSERT INTO public.profiles (id, role, email, organization_id, wallet_address)
    VALUES (
        NEW.id,
        assigned_role,
        NEW.email,
        target_org,
        target_wallet
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        wallet_address = COALESCE(EXCLUDED.wallet_address, profiles.wallet_address),
        organization_id = COALESCE(EXCLUDED.organization_id, profiles.organization_id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


