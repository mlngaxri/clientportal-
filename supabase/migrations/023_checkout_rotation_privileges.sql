-- Checkout rotation changes the provider-binding reservation and must only be callable by trusted server code.
revoke all on function public.rotate_checkout(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.rotate_checkout(uuid,text,uuid) to service_role;
