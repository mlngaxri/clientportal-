-- Bind provider receipts to the checkout reservation created by the account owner.
alter table public.checkout_intents add column subscription_id text;
create unique index unique_checkout_session on public.checkout_intents(session_id) where session_id is not null;
create unique index unique_checkout_subscription on public.checkout_intents(subscription_id) where subscription_id is not null;
create or replace function public.bind_checkout(pid uuid,payment_kind text,reservation_key uuid,session_id text,subscription_id text default null) returns void language plpgsql security definer set search_path=public as $$
begin
 perform 1 from projects where id=pid for update;
 update checkout_intents i set session_id=bind_checkout.session_id,subscription_id=coalesce(bind_checkout.subscription_id,i.subscription_id)
 where i.project_id=pid and i.kind=payment_kind and i.key=reservation_key
 and (i.session_id is null or i.session_id=bind_checkout.session_id)
 and (i.subscription_id is null or i.subscription_id=bind_checkout.subscription_id);
 if not found then raise exception 'Checkout reservation mismatch'; end if;
end $$;
revoke all on function public.bind_checkout(uuid,text,uuid,text,text) from public,anon,authenticated;
grant execute on function public.bind_checkout(uuid,text,uuid,text,text) to service_role;
create or replace function public.rotate_checkout(pid uuid,payment_kind text,old_key uuid) returns void language plpgsql security definer set search_path=public as $$
begin
 perform 1 from projects where id=pid for update;
 update checkout_intents set key=gen_random_uuid(),session_id=null,subscription_id=null,expires_at=now()+interval '1 hour' where project_id=pid and kind=payment_kind and key=old_key;
end $$;
create or replace function public.record_payment(event_id text,session_id text,pid uuid,payment_kind text,amount integer,currency_code text) returns void language plpgsql security definer set search_path=public as $$
declare p projects; expected_amount integer; receipt payments;
begin
 select * into p from projects where id=pid for update;
 if p.id is null then raise exception 'Unknown project'; end if;
 select * into receipt from payments where id=session_id;
 if found then
  if receipt.project_id<>pid or receipt.kind<>payment_kind or receipt.amount<>amount or receipt.currency<>currency_code then raise exception 'Payment receipt mismatch'; end if;
  insert into payment_events(id) values(event_id) on conflict do nothing; return;
 end if;
 if exists(select 1 from payment_events where id=event_id) then raise exception 'Payment event already belongs to another receipt'; end if;
 if not exists(select 1 from checkout_intents i where i.project_id=pid and i.kind=payment_kind and i.session_id=record_payment.session_id) then raise exception 'Unreserved payment'; end if;
 expected_amount=case payment_kind when 'initial' then case when p.package='FIRST' then 19900 else 20000 end when 'final' then 130000 when 'revision' then 15000 else null end;
 if expected_amount is null or amount<>expected_amount or currency_code is distinct from 'aud' then raise exception 'Payment amount mismatch'; end if;
 if payment_kind='initial' then
  if p.phase<>'AWAITING_INITIAL_PAYMENT' then raise exception 'Invalid initial payment state'; end if;
  update projects set phase='DIRECTION',initial_paid_at=now() where id=pid;
 elsif payment_kind='final' then
  if p.package<>'SITE' or p.phase<>'APPROVED_AWAITING_FINAL_PAYMENT' then raise exception 'Approval required'; end if;
  update projects set phase='LAUNCH',final_paid_at=now() where id=pid;
 elsif payment_kind='revision' then
  if p.phase<>'REVIEW' or p.revision_used<p.revision_limit then raise exception 'Additional revision payment unavailable'; end if;
  update projects set revision_limit=revision_limit+1 where id=pid;
 end if;
 insert into payments(id,project_id,kind,amount,currency) values(session_id,pid,payment_kind,amount,currency_code);
 insert into payment_events(id) values(event_id);
 update projects set version=version+1,updated_at=now() where id=pid;
 insert into audit_events(project_id,type,metadata) values(pid,'payment_confirmed',jsonb_build_object('kind',payment_kind,'amount',amount,'sessionId',session_id));
end $$;
create or replace function public.record_subscription(sid text,pid uuid,new_status text,event_time bigint) returns void language plpgsql security definer set search_path=public as $$
declare previous subscriptions; entitled boolean;
begin
 perform 1 from projects where id=pid and phase='LIVE' for update;
 if not found then raise exception 'Subscription requires a live project'; end if;
 if new_status not in ('active','trialing','past_due','canceled','unpaid','incomplete','incomplete_expired','paused') then raise exception 'Invalid subscription status'; end if;
 select * into previous from subscriptions where id=sid;
 if found and previous.project_id<>pid then raise exception 'Subscription project mismatch'; end if;
 if not found and not exists(select 1 from checkout_intents where project_id=pid and kind='pro' and subscription_id=sid) then raise exception 'Unreserved subscription'; end if;
 insert into subscriptions(id,project_id,status,event_created) values(sid,pid,new_status,event_time)
 on conflict(id) do update set status=excluded.status,event_created=excluded.event_created where subscriptions.event_created<=excluded.event_created;
 entitled=exists(select 1 from subscriptions where project_id=pid and status='active');
 update projects set pro=entitled,version=version+1,updated_at=now() where id=pid and pro is distinct from entitled;
end $$;
