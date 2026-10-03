-- Keep Stripe trialing subscriptions entitled while preserving stale-event protection.
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
 entitled=exists(select 1 from subscriptions where project_id=pid and status in ('active','trialing'));
 update projects set pro=entitled,version=version+1,updated_at=now() where id=pid and pro is distinct from entitled;
end $$;
revoke all on function public.record_subscription(text,uuid,text,bigint) from public,authenticated,anon;
grant execute on function public.record_subscription(text,uuid,text,bigint) to service_role;
