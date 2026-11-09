-- ============================================================================
-- Migration 008: Unified Profiles, Device-Bound Guest Sessions, Event Cohorts
--                & Hardened Row-Level Security (Privilege Escalation Lock)
-- ============================================================================

-- 1. Reconcile profiles columns across workspace & academy schemas
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'student',
  ADD COLUMN IF NOT EXISTS account_type TEXT NOT NULL DEFAULT 'workspace',
  ADD COLUMN IF NOT EXISTS access_tier TEXT NOT NULL DEFAULT 'pro_student',
  ADD COLUMN IF NOT EXISTS audience_track TEXT NOT NULL DEFAULT 'foundation',
  ADD COLUMN IF NOT EXISTS event_code TEXT,
  ADD COLUMN IF NOT EXISTS device_fingerprint TEXT;

-- 2. Prevent privilege self-escalation on public.profiles
--    Users may update their own display_name, avatar_url, audience_track, etc.,
--    but ONLY service_role can modify role, account_type, access_tier, or academy_id.
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_role TEXT := COALESCE(
    current_setting('request.jwt.claim.role', true),
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role'),
    ''
  );
BEGIN
  IF jwt_role <> 'service_role' AND current_user NOT IN ('postgres', 'supabase_admin') THEN
    NEW.role := OLD.role;
    NEW.account_type := OLD.account_type;
    NEW.access_tier := OLD.access_tier;
    NEW.academy_id := OLD.academy_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_privilege_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_privilege_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- 3. Event Cohorts table (for K-12 camps, University workshops & VIP professor codes)
CREATE TABLE IF NOT EXISTS public.event_cohorts (
  code              TEXT PRIMARY KEY,
  title             TEXT NOT NULL,
  audience_track    TEXT NOT NULL DEFAULT 'foundation'
                      CHECK (audience_track IN ('foundation', 'engineering')),
  unlocked_tier     TEXT NOT NULL DEFAULT 'event_cohort'
                      CHECK (unlocked_tier IN ('guest_restricted', 'event_cohort', 'pro_student', 'vip_full')),
  unlocked_modules  JSONB NOT NULL DEFAULT '["fuselage","wings","airfoil","tail","engines"]'::jsonb,
  active            BOOLEAN NOT NULL DEFAULT true,
  created_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.event_cohorts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "event_cohorts_select_active" ON public.event_cohorts;
CREATE POLICY "event_cohorts_select_active"
  ON public.event_cohorts FOR SELECT
  USING (active = true);

-- 4. Device-Bound Guest Sessions table
--    Tracks frictionless name-only guests & event participants by device fingerprint
--    and allows the Founder Admin panel to upgrade any guest to VIP/Professor in real time.
CREATE TABLE IF NOT EXISTS public.device_guest_sessions (
  device_fingerprint TEXT PRIMARY KEY,
  display_name       TEXT NOT NULL DEFAULT 'Guest Student',
  ip_hash            TEXT,
  user_agent         TEXT,
  role               TEXT NOT NULL DEFAULT 'guest',
  access_tier        TEXT NOT NULL DEFAULT 'guest_restricted'
                       CHECK (access_tier IN ('guest_restricted', 'event_cohort', 'pro_student', 'vip_full')),
  audience_track     TEXT NOT NULL DEFAULT 'foundation'
                       CHECK (audience_track IN ('foundation', 'engineering')),
  event_code         TEXT REFERENCES public.event_cohorts(code) ON DELETE SET NULL,
  current_route      TEXT DEFAULT '/explore',
  progress           JSONB NOT NULL DEFAULT '{}'::jsonb,
  quiz_scores        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.device_guest_sessions ENABLE ROW LEVEL SECURITY;

-- Enable Realtime notifications so Founder Admin overrides push immediately to connected clients
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.device_guest_sessions;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 5. Fix handle_new_user() trigger so every new signup gets BOTH a profile AND a personal workspace
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_workspace_id UUID;
  resolved_name    TEXT;
BEGIN
  resolved_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'first_name', '') || ' ' || COALESCE(NEW.raw_user_meta_data->>'last_name', '')), ''),
    split_part(COALESCE(NEW.email, 'Student'), '@', 1)
  );

  INSERT INTO public.profiles (id, display_name, role, account_type, access_tier)
  VALUES (NEW.id, resolved_name, 'student', 'workspace', 'pro_student')
  ON CONFLICT (id) DO UPDATE
    SET display_name = COALESCE(public.profiles.display_name, EXCLUDED.display_name);

  INSERT INTO public.workspaces (name, owner_id, plan)
  VALUES (resolved_name || '''s Workspace', NEW.id, 'pro')
  RETURNING id INTO new_workspace_id;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (new_workspace_id, NEW.id, 'owner')
  ON CONFLICT DO NOTHING;

  UPDATE public.profiles
  SET active_workspace_id = new_workspace_id
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
