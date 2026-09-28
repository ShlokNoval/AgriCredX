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
