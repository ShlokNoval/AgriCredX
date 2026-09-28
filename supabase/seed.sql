-- ============================================================
-- AgriCredX — Demo Seed Data (OPTIONAL / DEMO ONLY)
-- ============================================================
-- NOTE: This file is intentionally separate from schema deployment.
-- Do NOT execute this during clean infrastructure deployment.
-- Developer 1 will create Auth users first, and demo records can
-- optionally be added afterward if desired.
-- ============================================================

-- -------------------------------------------------------
-- 1. Demo Organizations
-- -------------------------------------------------------
INSERT INTO organizations (id, name, type, contact_metadata) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'Demo Basmati Exporter', 'supplier', '{"city": "Karnal", "state": "Haryana", "country": "India", "gstin": "06AAAAA0000A1Z5"}'),
  ('b2222222-2222-2222-2222-222222222222', 'ABC Foods (Demo Buyer)', 'buyer', '{"city": "Mumbai", "state": "Maharashtra", "country": "India", "gstin": "27BBBBB1111B1Z2"}'),
  ('c3333333-3333-3333-3333-333333333333', 'Demo Financier A', 'financier', '{"institution": "AgriCredit Capital", "tier": "Tier-1 NBFC"}'),
  ('c4444444-4444-4444-4444-444444444444', 'Demo Financier B', 'financier', '{"institution": "Rural Trade Liquidity", "tier": "Institutional Fund"}'),
  ('c5555555-5555-5555-5555-555555555555', 'Demo Financier C', 'financier', '{"institution": "Global Agri Trade Credit", "tier": "Commercial Bank"}'),
  ('d6666666-6666-6666-6666-666666666666', 'AgriCredX Admin Org', 'admin', '{"system": "AgriCredX Protocol Operations"}')
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    type = EXCLUDED.type,
    contact_metadata = EXCLUDED.contact_metadata;

-- -------------------------------------------------------
-- 2. Demo User Profiles (Requires corresponding auth.users)
-- -------------------------------------------------------
-- Note: Requires matching auth.users to satisfy foreign key constraint.
-- If auth.users do not exist yet, skip profile insertion.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM auth.users WHERE id = '11111111-1111-1111-1111-111111111111') THEN
        INSERT INTO profiles (id, role, email, organization_id, wallet_address) VALUES
          ('11111111-1111-1111-1111-111111111111', 'supplier', 'supplier@demo.agricredx.com', 'a1111111-1111-1111-1111-111111111111', '0x1111111111111111111111111111111111111111'),
          ('22222222-2222-2222-2222-222222222222', 'buyer', 'buyer@demo.agricredx.com', 'b2222222-2222-2222-2222-222222222222', '0x2222222222222222222222222222222222222222'),
          ('33333333-3333-3333-3333-333333333333', 'financier', 'financier-a@demo.agricredx.com', 'c3333333-3333-3333-3333-333333333333', '0x3333333333333333333333333333333333333333'),
          ('44444444-4444-4444-4444-444444444444', 'financier', 'financier-b@demo.agricredx.com', 'c4444444-4444-4444-4444-444444444444', '0x4444444444444444444444444444444444444444'),
          ('55555555-5555-5555-5555-555555555555', 'financier', 'financier-c@demo.agricredx.com', 'c5555555-5555-5555-5555-555555555555', '0x5555555555555555555555555555555555555555'),
          ('66666666-6666-6666-6666-666666666666', 'admin', 'admin@demo.agricredx.com', 'd6666666-6666-6666-6666-666666666666', '0x6666666666666666666666666666666666666666')
        ON CONFLICT (id) DO UPDATE SET
            role = EXCLUDED.role,
            email = EXCLUDED.email,
            organization_id = EXCLUDED.organization_id,
            wallet_address = EXCLUDED.wallet_address;
    END IF;
END $$;

-- -------------------------------------------------------
-- 3. Canonical Receivable (INV-2026-09124)
-- -------------------------------------------------------
INSERT INTO receivables (
    id, invoice_id, supplier_id, buyer_id, amount, currency, 
    due_date, commodity, status, attestation_digest, on_chain_id
) VALUES (
    'e1111111-1111-1111-1111-111111111111',
    'INV-2026-09124',
    'a1111111-1111-1111-1111-111111111111',
    'b2222222-2222-2222-2222-222222222222',
    850000.00,
    'INR',
    CURRENT_DATE + INTERVAL '60 days',
    'Basmati Rice',
    'FINANCEABLE',
    '0x4a5b6c7d8e9f0123456789abcdef0123456789abcdef0123456789abcdef0123',
    1
)
ON CONFLICT (invoice_id) DO UPDATE SET
    amount = EXCLUDED.amount,
    status = EXCLUDED.status,
    attestation_digest = EXCLUDED.attestation_digest,
    on_chain_id = EXCLUDED.on_chain_id;

-- -------------------------------------------------------
-- 4. Document Metadata
-- -------------------------------------------------------
INSERT INTO documents (
    id, receivable_id, type, filename, mime_type, 
    sha256, object_key, version, is_active, uploaded_by
) VALUES
  (
    'd1111111-1111-1111-1111-111111111111',
    'e1111111-1111-1111-1111-111111111111',
    'invoice',
    'INV-2026-09124.pdf',
    'application/pdf',
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    'e1111111-1111-1111-1111-111111111111/INV-2026-09124.pdf',
    1,
    true,
    NULL
  ),
  (
    'd2222222-2222-2222-2222-222222222222',
    'e1111111-1111-1111-1111-111111111111',
    'purchase_order',
    'PO-ABC-2026-088.pdf',
    'application/pdf',
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    'e1111111-1111-1111-1111-111111111111/PO-ABC-2026-088.pdf',
    1,
    true,
    NULL
  ),
  (
    'd3333333-3333-3333-3333-333333333333',
    'e1111111-1111-1111-1111-111111111111',
    'grn',
    'GRN-2026-1044.pdf',
    'application/pdf',
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    'e1111111-1111-1111-1111-111111111111/GRN-2026-1044.pdf',
    1,
    true,
    NULL
  ),
  (
    'd4444444-4444-4444-4444-444444444444',
    'e1111111-1111-1111-1111-111111111111',
    'quality_certificate',
    'QC-AGMARK-2026-99.pdf',
    'application/pdf',
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    'e1111111-1111-1111-1111-111111111111/QC-AGMARK-2026-99.pdf',
    1,
    true,
    NULL
  )
ON CONFLICT (id) DO NOTHING;

-- -------------------------------------------------------
-- 5. Verification Results (AI Risk 18/100 LOW)
-- -------------------------------------------------------
INSERT INTO verification_results (
    id, receivable_id, check_code, status, 
    extracted_value, expected_value, explanation, engine_version
) VALUES
  (
    'c1111111-1111-1111-1111-111111111111',
    'e1111111-1111-1111-1111-111111111111',
    'AMOUNT_MATCH',
    'PASS',
    '850000.00',
    '850000.00',
    'Invoice amount exactly matches Purchase Order amount.',
    'v1'
  ),
  (
    'c2222222-2222-2222-2222-222222222222',
    'e1111111-1111-1111-1111-111111111111',
    'BUYER_MATCH',
    'PASS',
    'ABC Foods',
    'ABC Foods',
    'Buyer identity matches across Invoice, PO, and GRN.',
    'v1'
  ),
  (
    'c3333333-3333-3333-3333-333333333333',
    'e1111111-1111-1111-1111-111111111111',
    'QTY_MATCH',
    'PASS',
    '5000 kg',
    '5000 kg',
    'GRN received quantity (5000 kg) equals invoice billing quantity.',
    'v1'
  ),
  (
    'c4444444-4444-4444-4444-444444444444',
    'e1111111-1111-1111-1111-111111111111',
    'DATE_CONSISTENCY',
    'PASS',
    '2026-09-20',
    '2026-09-18',
    'Document chronological sequence is valid (PO -> GRN -> Invoice).',
    'v1'
  ),
  (
    'c5555555-5555-5555-5555-555555555555',
    'e1111111-1111-1111-1111-111111111111',
    'DUPLICATE_ID',
    'PASS',
    'INV-2026-09124',
    'UNIQUE',
    'Invoice number is unique across all historical receivables.',
    'v1'
  ),
  (
    'c6666666-6666-6666-6666-666666666666',
    'e1111111-1111-1111-1111-111111111111',
    'DOCUMENT_HASH',
    'PASS',
    'MATCH',
    'MATCH',
    'All 4 document binary SHA-256 hashes match uploaded metadata.',
    'v1'
  )
ON CONFLICT (id) DO NOTHING;

-- -------------------------------------------------------
-- 6. Attestation Metadata
-- -------------------------------------------------------
INSERT INTO attestations (
    id, receivable_id, digest, signer_wallet, tx_hash, block_reference, schema_version
) VALUES (
    'a1111111-2222-3333-4444-555555555555',
    'e1111111-1111-1111-1111-111111111111',
    '0x4a5b6c7d8e9f0123456789abcdef0123456789abcdef0123456789abcdef0123',
    '0x2222222222222222222222222222222222222222',
    'demo-mock-tx-0x7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f',
    'demo-mock-block-142857',
    '1.0'
)
ON CONFLICT (id) DO NOTHING;

-- -------------------------------------------------------
-- 7. Financing Request
-- -------------------------------------------------------
INSERT INTO financing_requests (
    id, receivable_id, requested_amount, desired_term, status
) VALUES (
    'f1111111-1111-1111-1111-111111111111',
    'e1111111-1111-1111-1111-111111111111',
    820000.00,
    60,
    'OPEN'
)
ON CONFLICT (id) DO NOTHING;
