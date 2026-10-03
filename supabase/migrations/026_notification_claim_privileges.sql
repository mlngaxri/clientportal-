-- Notification claiming leases queued email work and must only be callable by trusted server workers.
revoke all on function public.claim_notifications(integer) from public,anon,authenticated;
grant execute on function public.claim_notifications(integer) to service_role;
