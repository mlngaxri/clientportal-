alter table public.notification_outbox add column first_attempt_at timestamptz;
alter table public.notification_outbox add column delivery_status text not null default 'queued';
alter table public.notification_outbox add column delivery_updated_at timestamptz;
create table public.email_events(id text primary key,created_at timestamptz not null default now());
alter table public.email_events enable row level security;
revoke all on public.email_events from anon,authenticated;
grant all on public.email_events to service_role;
create or replace function public.claim_notifications(batch_size integer) returns setof notification_outbox
language sql security definer set search_path=public as $$
 update notification_outbox set lease_until=now()+interval '5 minutes',attempts=attempts+1,first_attempt_at=coalesce(first_attempt_at,now())
 where id in (select id from notification_outbox where sent_at is null and attempts<8 and next_attempt<=now() and (lease_until is null or lease_until<now()) order by created_at for update skip locked limit least(greatest(batch_size,1),50)) returning *
$$;
create function public.notify_project_event() returns trigger language plpgsql security definer set search_path=public as $$
declare recipient_email text;
begin
 if new.type not in ('send_initial','deliver','submit_revision','withdraw_revision','start_revision','complete_revision','approve','launch','website_publish','website_rollback') or not coalesce((select notify_project from project_settings where project_id=new.project_id),true) then return new; end if;
 select u.email into recipient_email from projects p join auth.users u on u.id=p.owner_id where p.id=new.project_id;
 if recipient_email is not null then insert into notification_outbox(project_id,dedupe,kind,recipient,subject,message) values(new.project_id,'project:'||new.id,'project',recipient_email,'Your Fourthform project has an update','Open your workspace to view the latest confirmed project activity.') on conflict(dedupe) do nothing; end if;
 return new;
end $$;
revoke all on function public.notify_project_event() from public,anon,authenticated;
create trigger project_notification after insert on public.audit_events for each row execute function public.notify_project_event();
create function public.record_email_event(event_id text,email_id text,new_status text,event_time timestamptz) returns void
language plpgsql security definer set search_path=public as $$
begin
 if new_status not in ('delivered','bounced','complained','suppressed','failed') then return; end if;
 if not exists(select 1 from notification_outbox where provider_id=email_id) then raise exception 'Email acknowledgement is still pending'; end if;
 insert into email_events values(event_id,now()) on conflict do nothing;
 if not found then return; end if;
 update notification_outbox set delivery_status=new_status,delivery_updated_at=event_time where provider_id=email_id and (delivery_updated_at is null or delivery_updated_at<=event_time);
end $$;
revoke all on function public.record_email_event(text,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.record_email_event(text,text,text,timestamptz) to service_role;
