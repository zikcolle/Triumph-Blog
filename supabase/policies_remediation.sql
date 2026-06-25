-- ------------------------------------------------------------
-- Remediation Script for Supabase Security Issues
-- ------------------------------------------------------------

-- 1️⃣ Drop permissive INSERT policy (if it exists)
DROP POLICY IF EXISTS comments_insert_public ON public.comments;

-- 2️⃣ Ensure RLS is enabled on the comments table
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- 3️⃣ Secure SELECT policy (public read access is intentional)
CREATE POLICY IF NOT EXISTS comments_select_all ON public.comments
  FOR SELECT USING (true);

-- 4️⃣ Secure INSERT policy – only authenticated users may insert
CREATE POLICY IF NOT EXISTS comments_insert_auth ON public.comments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 5️⃣ (Optional) Author‑only UPDATE / DELETE policies – uncomment and adjust if needed
-- ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS user_id uuid;
-- CREATE POLICY comments_update_own ON public.comments
--   FOR UPDATE USING (auth.uid() = user_id)
--   WITH CHECK (auth.uid() = user_id);
-- CREATE POLICY comments_delete_own ON public.comments
--   FOR DELETE USING (auth.uid() = user_id);

-- 6️⃣ Revoke public execution rights for the insecure helper function
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated;

-- 7️⃣ If the function does not need elevated privileges, switch to SECURITY INVOKER
-- ALTER FUNCTION public.rls_auto_enable() SECURITY INVOKER;

-- 8️⃣ Or, if the function is unused, drop it entirely
-- DROP FUNCTION IF EXISTS public.rls_auto_enable();

-- ------------------------------------------------------------
-- End of remediation script
-- ------------------------------------------------------------
