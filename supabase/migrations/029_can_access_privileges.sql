-- can_access is an internal RLS helper for signed-in customer/operator sessions.
-- PostgreSQL grants function execution to PUBLIC by default, so make the
-- intended boundary explicit for existing databases.
revoke all on function public.can_access(uuid) from public, anon;
grant execute on function public.can_access(uuid) to authenticated;
