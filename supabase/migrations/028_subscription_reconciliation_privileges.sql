-- Subscription reconciliation mutates Pro entitlement and must only be callable by trusted webhook/server code.
revoke all on function public.record_subscription(text,uuid,text,bigint) from public,anon,authenticated;
grant execute on function public.record_subscription(text,uuid,text,bigint) to service_role;
