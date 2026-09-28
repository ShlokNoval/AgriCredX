"""
AgriCredX — Comprehensive RLS Automated Test Suite.

Verifies tenant isolation and security boundaries against Supabase:
  1. Anonymous / unauthenticated user cannot access protected tables (receivables, documents, audit_logs)
  2. Anonymous / unauthenticated user cannot insert into protected tables (receivables, audit_logs, bids)
  3. Storage bucket 'documents' is private (public = False)
  4. Compatibility view 'public.user_profiles' cannot be used to bypass profiles RLS
  5. Deployment architecture is clean and independent of pre-existing demo Auth users

Run via:
    python -m pytest supabase/tests/test_rls_policies.py -v
"""

import os
import pytest
import httpx
import dotenv

dotenv.load_dotenv('.env')

SUPABASE_URL = os.getenv('SUPABASE_URL')
PUBLISHABLE_KEY = os.getenv('SUPABASE_PUBLISHABLE_KEY')
SECRET_KEY = os.getenv('SUPABASE_SECRET_KEY')


@pytest.fixture(scope="module")
def base_url():
    if not SUPABASE_URL:
        pytest.skip("SUPABASE_URL not configured")
    return SUPABASE_URL


@pytest.fixture(scope="module")
def anon_client(base_url):
    """Unauthenticated client with publishable key."""
    headers = {"apikey": PUBLISHABLE_KEY} if PUBLISHABLE_KEY else {}
    return httpx.Client(base_url=base_url, headers=headers)


@pytest.fixture(scope="module")
def admin_client(base_url):
    """Admin / service client with secret key."""
    if not SECRET_KEY:
        pytest.skip("SUPABASE_SECRET_KEY not configured")
    headers = {
        "apikey": SECRET_KEY,
        "Authorization": f"Bearer {SECRET_KEY}",
        "Content-Type": "application/json",
    }
    return httpx.Client(base_url=base_url, headers=headers)


def test_anonymous_access_denied_to_receivables(anon_client):
    """Anonymous user must not receive protected receivable records."""
    r = anon_client.get("/rest/v1/receivables")
    if r.status_code == 200:
        assert r.json() == [], "Anonymous user must see 0 receivables"
    else:
        assert r.status_code in (401, 403)


def test_anonymous_access_denied_to_documents(anon_client):
    """Anonymous user must not receive document metadata."""
    r = anon_client.get("/rest/v1/documents")
    if r.status_code == 200:
        assert r.json() == [], "Anonymous user must see 0 documents"
    else:
        assert r.status_code in (401, 403)


def test_anonymous_access_denied_to_audit_logs(anon_client):
    """Anonymous user must not read audit logs."""
    r = anon_client.get("/rest/v1/audit_logs")
    if r.status_code == 200:
        assert r.json() == [], "Anonymous user must see 0 audit logs"
    else:
        assert r.status_code in (401, 403)


def test_anonymous_insert_denied_to_audit_logs(anon_client):
    """Anonymous client must never be able to insert audit logs (anti-forgery)."""
    payload = {
        "action": "FORGED_EVENT",
        "entity_type": "receivable",
        "metadata_json": {"forged": True},
    }
    r = anon_client.post("/rest/v1/audit_logs", json=payload)
    assert r.status_code in (401, 403), f"Expected 401/403 but got {r.status_code}: {r.text}"


def test_anonymous_insert_denied_to_receivables(anon_client):
    """Anonymous client must not be able to create receivables."""
    payload = {
        "invoice_id": "INV-UNAUTHORIZED-001",
        "amount": 100000,
        "currency": "INR",
        "commodity": "Rice",
        "due_date": "2026-12-31",
    }
    r = anon_client.post("/rest/v1/receivables", json=payload)
    assert r.status_code in (401, 403), f"Expected 401/403 but got {r.status_code}: {r.text}"


def test_anonymous_insert_denied_to_financing_bids(anon_client):
    """Anonymous client must not be able to submit financing bids."""
    payload = {
        "amount": 50000,
        "fee_or_discount": 2.5,
    }
    r = anon_client.post("/rest/v1/financing_bids", json=payload)
    assert r.status_code in (401, 403), f"Expected 401/403 but got {r.status_code}: {r.text}"


def test_storage_bucket_is_private(admin_client):
    """Storage bucket 'documents' must exist and have public = False."""
    r = admin_client.get("/storage/v1/bucket/documents")
    assert r.status_code == 200, f"Bucket 'documents' not found: {r.text}"
    bucket = r.json()
    assert bucket.get("public") is False, "Documents bucket MUST NOT be public!"


def test_user_profiles_view_cannot_bypass_rls(anon_client):
    """Compatibility view user_profiles must enforce security_invoker (0 rows for anonymous)."""
    r = anon_client.get("/rest/v1/user_profiles")
    if r.status_code == 200:
        assert r.json() == [], "Anonymous user must see 0 user_profiles via view"
    else:
        assert r.status_code in (401, 403)


def test_clean_deployment_schema_independent_of_demo_users(admin_client):
    """
    Verifies the clean-deployment architecture:
    All 11 application tables exist in the PostgREST schema cache and are ready for use
    without requiring any pre-existing demo Auth users or seed records.
    """
    r = admin_client.get("/rest/v1/")
    assert r.status_code == 200
    definitions = r.json().get("definitions", {})

    expected_tables = [
        "organizations",
        "profiles",
        "receivables",
        "documents",
        "verification_results",
        "attestations",
        "financing_requests",
        "financing_bids",
        "financings",
        "repayments",
        "audit_logs",
    ]

    for table in expected_tables:
        assert table in definitions, f"Table '{table}' missing from clean deployment schema cache"
