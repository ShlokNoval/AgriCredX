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
