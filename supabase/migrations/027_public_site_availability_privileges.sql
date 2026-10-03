-- Public route availability needs anonymous execution, not authenticated customer execution.
revoke all on function public.public_site_available(uuid,text) from public,authenticated;
grant execute on function public.public_site_available(uuid,text) to anon,service_role;
