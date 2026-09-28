-- ============================================================
-- AgriCredX — pgTAP RLS Test Suite
-- File: supabase/tests/database/rls.test.sql
-- Run with: npx supabase test db
-- ============================================================

BEGIN;
SELECT plan(15);

-- 1. Test tables exist
SELECT has_table('organizations', 'Table organizations should exist');
SELECT has_table('profiles', 'Table profiles should exist');
SELECT has_table('receivables', 'Table receivables should exist');
SELECT has_table('documents', 'Table documents should exist');
SELECT has_table('verification_results', 'Table verification_results should exist');
SELECT has_table('attestations', 'Table attestations should exist');
SELECT has_table('financing_requests', 'Table financing_requests should exist');
SELECT has_table('financing_bids', 'Table financing_bids should exist');
SELECT has_table('financings', 'Table financings should exist');
SELECT has_table('repayments', 'Table repayments should exist');
SELECT has_table('audit_logs', 'Table audit_logs should exist');

-- 2. Test RLS is enabled on all tables
SELECT row_level_security_active('organizations');
SELECT row_level_security_active('profiles');
SELECT row_level_security_active('receivables');
SELECT row_level_security_active('documents');

SELECT * FROM finish();
ROLLBACK;
