-- ------------------------------------------------------------
-- Enable Row Level Security (RLS) on the comments table
-- ------------------------------------------------------------
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- Policy: Allow anyone (public) to SELECT rows – needed for the
-- comment list displayed on the website. Adjust if you prefer
-- to restrict reads to authenticated users only.
-- ------------------------------------------------------------
CREATE POLICY comments_select_all ON public.comments
  FOR SELECT USING (true);

-- ------------------------------------------------------------
-- Policy: Allow authenticated users to INSERT new comments.
-- The policy checks that the request comes from an authenticated
-- session (auth.role() = 'authenticated').
-- ------------------------------------------------------------
CREATE POLICY comments_insert_auth ON public.comments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ------------------------------------------------------------
-- (Optional) Policy: Allow comment authors to UPDATE or DELETE
-- their own rows. This uses the `auth.uid()` value which matches the
-- `user_id` column you should have on the table. If you do not have
-- a `user_id` column, remove these policies or adapt the condition.
-- ------------------------------------------------------------
-- ALTER TABLE public.comments ADD COLUMN user_id uuid;  -- Uncomment if needed
-- CREATE POLICY comments_update_own ON public.comments
--   FOR UPDATE USING (auth.uid() = user_id)
--   WITH CHECK (auth.uid() = user_id);
-- CREATE POLICY comments_delete_own ON public.comments
--   FOR DELETE USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- Secure the rls_auto_enable function (security definer).
-- Option A: Revoke public execution permissions.
-- ------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated;

-- ------------------------------------------------------------
-- Option B: If the function does not need elevated privileges,
-- switch it to SECURITY INVOKER instead of SECURITY DEFINER.
-- ------------------------------------------------------------
-- ALTER FUNCTION public.rls_auto_enable() SECURITY INVOKER;

-- ------------------------------------------------------------
-- Option C: If you never use this helper function, simply drop it.
-- ------------------------------------------------------------
-- DROP FUNCTION IF EXISTS public.rls_auto_enable();
