-- Public custom-domain routing needs anonymous execution, not PostgreSQL's broad PUBLIC default.
revoke all on function public.resolve_public_domain(text) from public,authenticated;
grant execute on function public.resolve_public_domain(text) to anon,service_role;
