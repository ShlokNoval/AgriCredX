-- ============================================================
-- AgriCredX — Database Schema Baseline
-- ============================================================

-- Custom Types
CREATE TYPE user_role AS ENUM ('supplier', 'buyer', 'financier', 'admin');
CREATE TYPE receivable_status AS ENUM (
  'CREATED', 'VERIFIED', 'BUYER_ACCEPTED', 'ATTESTED', 
  'FINANCEABLE', 'FUNDED', 'OUTSTANDING', 'REPAID', 'CLOSED', 'DISPUTED'
);
CREATE TYPE document_type AS ENUM (
  'invoice', 'purchase_order', 'grn', 'quality_certificate', 'lab_report'
);

-- Organizations Table
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type user_role NOT NULL,
    contact_metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users Profile Table (Extends Supabase Auth)
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    role user_role NOT NULL,
    email TEXT NOT NULL,
    organization_id UUID REFERENCES organizations(id),
    wallet_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Receivables Table
CREATE TABLE receivables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id TEXT NOT NULL,
    supplier_id UUID REFERENCES organizations(id),
    buyer_id UUID REFERENCES organizations(id),
    amount NUMERIC(18, 2) NOT NULL,
    currency TEXT DEFAULT 'INR',
    due_date DATE,
    commodity TEXT,
    status receivable_status DEFAULT 'CREATED',
    attestation_digest TEXT,
    on_chain_id NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents Table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receivable_id UUID REFERENCES receivables(id) ON DELETE CASCADE,
    type document_type NOT NULL,
    filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    sha256 TEXT NOT NULL,
    object_key TEXT NOT NULL,
    version INT DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    uploaded_by UUID REFERENCES user_profiles(id),
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS) setup to be completed by Dev 2
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE receivables ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
