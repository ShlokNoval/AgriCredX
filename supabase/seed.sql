-- ============================================================
-- AgriCredX — Seed Data
-- ============================================================
-- Explicitly labeled as demo data per requirements

INSERT INTO organizations (id, name, type) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'Demo Basmati Exporter', 'supplier'),
  ('b2222222-2222-2222-2222-222222222222', 'ABC Foods (Demo Buyer)', 'buyer'),
  ('c3333333-3333-3333-3333-333333333333', 'Demo Financier A', 'financier');

-- The auth users and user_profiles will be created through the app to ensure proper linking,
-- or added here later by Dev 2 using auth.users() functions.
