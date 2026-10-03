-- Payment reconciliation mutates paid state and must only be callable by trusted webhook/server code.
revoke all on function public.record_payment(text,text,uuid,text,integer,text) from public,anon,authenticated;
grant execute on function public.record_payment(text,text,uuid,text,integer,text) to service_role;
