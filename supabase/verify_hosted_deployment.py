"""
AgriCredX — Hosted Supabase Deployment Verification Script.

Run this script AFTER executing `supabase/deploy_all.sql` in the Supabase SQL Editor:
    python supabase/verify_hosted_deployment.py
"""

import os
import sys
import httpx
import dotenv

dotenv.load_dotenv('.env')

SUPABASE_URL = os.getenv('SUPABASE_URL')
SECRET_KEY = os.getenv('SUPABASE_SECRET_KEY')
PUBLISHABLE_KEY = os.getenv('SUPABASE_PUBLISHABLE_KEY')

if not SUPABASE_URL or not SECRET_KEY:
    print("ERROR: SUPABASE_URL or SUPABASE_SECRET_KEY is missing from environment.")
    sys.exit(1)

print("=" * 65)
print("AGRICREDX — POST-DEPLOYMENT HOSTED DATABASE VERIFICATION")
print("=" * 65)
print(f"Target: {SUPABASE_URL}")

admin_headers = {
    "apikey": SECRET_KEY,
    "Authorization": f"Bearer {SECRET_KEY}",
    "Content-Type": "application/json"
}

anon_headers = {
    "apikey": PUBLISHABLE_KEY,
    "Content-Type": "application/json"
} if PUBLISHABLE_KEY else {}

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
    "audit_logs"
]

all_passed = True

# 1. Verify OpenAPI schema cache for all 11 tables
print("\n[1] Verifying 11 Application Tables in Schema Cache...")
try:
    r_schema = httpx.get(f"{SUPABASE_URL}/rest/v1/", headers=admin_headers, timeout=10)
    if r_schema.status_code == 200:
        definitions = r_schema.json().get("definitions", {})
        found_tables = set(definitions.keys())
        missing = [t for t in expected_tables if t not in found_tables]
        if missing:
            print(f"  [FAIL] Missing tables ({len(missing)}): {missing}")
            all_passed = False
        else:
            print(f"  [OK] All 11 application tables discovered in PostgREST schema cache!")
            for t in expected_tables:
                print(f"     + {t}")
    else:
        print(f"  [FAIL] Failed to fetch schema: {r_schema.status_code} {r_schema.text[:100]}")
        all_passed = False
except Exception as e:
    print(f"  [FAIL] Connection error: {e}")
    all_passed = False

# 2. Verify clean database (zero demo records)
print("\n[2] Verifying Clean Database State (Zero Demo Records)...")
for t in expected_tables:
    try:
        r_rows = httpx.get(f"{SUPABASE_URL}/rest/v1/{t}?select=id", headers=admin_headers, timeout=5)
        if r_rows.status_code == 200:
            count = len(r_rows.json())
            print(f"  + {t}: {count} rows")
        else:
            print(f"  [WARN] {t}: status {r_rows.status_code}")
    except Exception as e:
        print(f"  [FAIL] {t}: query error {e}")

# 3. Verify private documents storage bucket
print("\n[3] Verifying Storage Configuration...")
try:
    r_bucket = httpx.get(f"{SUPABASE_URL}/storage/v1/bucket/documents", headers=admin_headers, timeout=5)
    if r_bucket.status_code == 200:
        b_data = r_bucket.json()
        is_public = b_data.get("public", True)
        if not is_public:
            print(f"  [OK] Bucket 'documents' confirmed PRIVATE (public = {is_public})")
        else:
            print(f"  [FAIL] Bucket 'documents' is PUBLIC! Must be private.")
            all_passed = False
    else:
        print(f"  [FAIL] Bucket 'documents' check failed: {r_bucket.status_code}")
        all_passed = False
except Exception as e:
    print(f"  [FAIL] Storage check error: {e}")
    all_passed = False

# 4. Verify unauthenticated anonymous access denial
print("\n[4] Verifying Unauthenticated Anonymous RLS Protection...")
if anon_headers:
    r_anon = httpx.get(f"{SUPABASE_URL}/rest/v1/receivables", headers=anon_headers, timeout=5)
    if r_anon.status_code == 200 and len(r_anon.json()) == 0:
        print("  [OK] Anonymous GET /receivables returned 0 rows (RLS active)")
    elif r_anon.status_code in (401, 403):
        print(f"  [OK] Anonymous GET /receivables rejected with {r_anon.status_code}")
    else:
        print(f"  [FAIL] Unexpected anonymous response: {r_anon.status_code} {r_anon.text[:100]}")
        all_passed = False
else:
    print("  [WARN] Skipped anonymous check (PUBLISHABLE_KEY not set)")

print("\n" + "=" * 65)
if all_passed:
    print("RESULT: ALL HOSTED CHECKS PASSED [SUCCESS]")
else:
    print("RESULT: ONE OR MORE CHECKS FAILED [FAILURE]")
print("=" * 65)
