-- An unbound checkout reservation must still be live when it is first attached to a provider session.
-- Once a session is bound, idempotent same-session replay remains valid after the local reservation TTL.
create or replace function public.bind_checkout(pid uuid,payment_kind text,reservation_key uuid,session_id text,subscription_id text default null) returns void language plpgsql security definer set search_path=public as $$
begin
 perform 1 from projects where id=pid for update;
 update checkout_intents i set session_id=bind_checkout.session_id,subscription_id=coalesce(bind_checkout.subscription_id,i.subscription_id)
 where i.project_id=pid and i.kind=payment_kind and i.key=reservation_key
 and (i.session_id=bind_checkout.session_id or (i.session_id is null and i.expires_at>now()))
 and (i.subscription_id is null or i.subscription_id=bind_checkout.subscription_id);
 if not found then raise exception 'Checkout reservation mismatch'; end if;
end $$;
