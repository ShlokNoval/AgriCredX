-- ============================================================
-- AgriCredX — Complete Schema (Missing Tables + Constraints)
-- ============================================================
-- Adds tables defined in the master plan but absent from the
-- bootstrap migration: verification_results, attestations,
-- financing_requests, financing_bids, financings, repayments,
-- audit_logs.  Also patches existing tables with missing
-- constraints (UNIQUE on invoice_id, CHECK on status fields).
-- ============================================================

-- -------------------------------------------------------
-- Patch existing tables
-- -------------------------------------------------------

-- Duplicate-detection requires a unique invoice_id
ALTER TABLE receivables
  ADD CONSTRAINT receivables_invoice_id_unique UNIQUE (invoice_id);

-- Enforce status enum values via CHECK (defence-in-depth on top of the PG enum)
-- (The enum type already constrains values, but this documents intent.)

-- -------------------------------------------------------
-- Verification Results
-- -------------------------------------------------------
CREATE TABLE verification_results (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receivable_id UUID NOT NULL REFERENCES receivables(id) ON DELETE CASCADE,
    check_code    TEXT NOT NULL,
    status        TEXT NOT NULL CHECK (status IN ('PASS', 'WARN', 'FAIL')),
    extracted_value TEXT,
    expected_value  TEXT,
    explanation   TEXT NOT NULL,
    engine_version TEXT NOT NULL DEFAULT 'v1',
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_verification_results_receivable
    ON verification_results(receivable_id);

-- -------------------------------------------------------
-- Attestations
-- -------------------------------------------------------
CREATE TABLE attestations (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receivable_id  UUID NOT NULL REFERENCES receivables(id) ON DELETE CASCADE,
    digest         TEXT NOT NULL,
    signer_wallet  TEXT NOT NULL,
    tx_hash        TEXT,
    block_reference TEXT,
    timestamp      TIMESTAMPTZ DEFAULT NOW(),
    schema_version TEXT NOT NULL DEFAULT '1.0'
);

CREATE INDEX idx_attestations_receivable
    ON attestations(receivable_id);

-- -------------------------------------------------------
-- Financing Requests
-- -------------------------------------------------------
CREATE TYPE financing_request_status AS ENUM ('OPEN', 'SELECTED', 'FUNDED', 'CLOSED');

CREATE TABLE financing_requests (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receivable_id    UUID NOT NULL REFERENCES receivables(id) ON DELETE CASCADE,
    requested_amount NUMERIC(15, 2) NOT NULL,
    desired_term     INTEGER,
    status           financing_request_status NOT NULL DEFAULT 'OPEN',
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_financing_requests_receivable
    ON financing_requests(receivable_id);

-- -------------------------------------------------------
-- Financing Bids
-- -------------------------------------------------------
CREATE TYPE financing_bid_status AS ENUM ('OPEN', 'SELECTED', 'REJECTED');

CREATE TABLE financing_bids (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id      UUID NOT NULL REFERENCES financing_requests(id) ON DELETE CASCADE,
    financier_id    UUID NOT NULL REFERENCES user_profiles(id),
    amount          NUMERIC(15, 2) NOT NULL,
    fee_or_discount NUMERIC(5, 2),
    maturity        DATE,
    status          financing_bid_status NOT NULL DEFAULT 'OPEN',
    tx_hash         TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_financing_bids_request
    ON financing_bids(request_id);

CREATE INDEX idx_financing_bids_financier
    ON financing_bids(financier_id);

-- -------------------------------------------------------
-- Financings (Funded receivables)
-- -------------------------------------------------------
CREATE TABLE financings (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receivable_id UUID NOT NULL REFERENCES receivables(id) ON DELETE CASCADE,
    financier_id  UUID NOT NULL REFERENCES user_profiles(id),
    funded_amount NUMERIC(15, 2) NOT NULL,
    funded_at     TIMESTAMPTZ,
    status        TEXT NOT NULL DEFAULT 'ACTIVE',
    tx_hash       TEXT
);

-- Anti-double-financing: only one active financing per receivable
CREATE UNIQUE INDEX idx_financings_receivable_unique
    ON financings(receivable_id)
    WHERE status = 'ACTIVE';

-- -------------------------------------------------------
-- Repayments
-- -------------------------------------------------------
CREATE TABLE repayments (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receivable_id UUID NOT NULL REFERENCES receivables(id) ON DELETE CASCADE,
    amount        NUMERIC(15, 2) NOT NULL,
    paid_at       TIMESTAMPTZ DEFAULT NOW(),
    tx_hash       TEXT,
    status        TEXT NOT NULL DEFAULT 'CONFIRMED'
);

CREATE INDEX idx_repayments_receivable
    ON repayments(receivable_id);

-- -------------------------------------------------------
-- Audit Logs
-- -------------------------------------------------------
CREATE TABLE audit_logs (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id      UUID REFERENCES user_profiles(id),
    action        TEXT NOT NULL,
    entity_type   TEXT NOT NULL,
    entity_id     UUID,
    metadata_json JSONB,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_entity
    ON audit_logs(entity_type, entity_id);

CREATE INDEX idx_audit_logs_actor
    ON audit_logs(actor_id);

CREATE INDEX idx_audit_logs_created_at
    ON audit_logs(created_at DESC);

-- -------------------------------------------------------
-- Enable RLS on all new tables
-- -------------------------------------------------------
ALTER TABLE verification_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE attestations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE financing_requests    ENABLE ROW LEVEL SECURITY;
ALTER TABLE financing_bids        ENABLE ROW LEVEL SECURITY;
ALTER TABLE financings            ENABLE ROW LEVEL SECURITY;
ALTER TABLE repayments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs            ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------
-- Helper: updated_at trigger for receivables
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_receivables_updated_at
    BEFORE UPDATE ON receivables
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
