-- Fail closed when a caller attempts to rotate a checkout reservation that no longer matches.
create or replace function public.rotate_checkout(pid uuid,payment_kind text,old_key uuid) returns void language plpgsql security definer set search_path=public as $$
begin
 perform 1 from projects where id=pid for update;
 update checkout_intents
 set key=gen_random_uuid(),session_id=null,subscription_id=null,expires_at=now()+interval '1 hour'
 where project_id=pid and kind=payment_kind and key=old_key;
 if not found then raise exception 'Checkout reservation mismatch'; end if;
end $$;
