-- Persistent customer sites. No anonymous reads of drafts, inboxes or analytics.
create table public.site_documents (
 project_id uuid primary key references public.projects(id) on delete cascade,
 revision integer not null default 1,
 manifest jsonb not null,
 content jsonb not null,
 published_id uuid,
 updated_at timestamptz not null default now()
);
create table public.site_versions (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
 manifest jsonb not null, content jsonb not null, revision integer not null,
 created_by uuid references auth.users(id), created_at timestamptz not null default now(),
 unique(project_id,revision)
);
alter table public.site_documents add foreign key (published_id) references public.site_versions(id);
create table public.site_commands (
 project_id uuid not null references public.projects(id) on delete cascade, key uuid not null,
 request jsonb not null, result jsonb not null, primary key(project_id,key)
);
create table public.site_domains (
 hostname text primary key check(hostname=lower(hostname) and length(hostname)<254),
 project_id uuid not null references public.projects(id) on delete cascade,
 token uuid not null default gen_random_uuid(), status text not null default 'pending' check(status in ('pending','owned','connected')),
 verified_at timestamptz, created_at timestamptz not null default now()
);
create unique index one_connected_domain on public.site_domains(project_id) where status='connected';
create table public.project_settings (
 project_id uuid primary key references public.projects(id) on delete cascade,
 revision integer not null default 0, timezone text not null default 'Australia/Brisbane',
 notify_forms boolean not null default true, notify_project boolean not null default true,
 connections jsonb not null default '{}'
);
create table public.form_submissions (
 id uuid primary key, project_id uuid not null references public.projects(id) on delete cascade,
 page_id text not null, name text not null, email text not null, message text not null,
 status text not null default 'new' check(status in ('new','read','archived')),
 created_at timestamptz not null default now()
);
create index form_inbox on public.form_submissions(project_id,created_at desc);
create table public.analytics_events (
 id uuid primary key, project_id uuid not null references public.projects(id) on delete cascade,
 page_id text not null, kind text not null check(kind in ('pageview','cta','form')),
 visitor text not null, source text not null, device text not null, country text,
 created_at timestamptz not null default now()
);
create index analytics_window on public.analytics_events(project_id,created_at);
create table public.notification_outbox (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
 dedupe text not null unique, kind text not null check(kind in ('form','project')),
 recipient text not null, subject text not null, message text not null,
 attempts integer not null default 0, next_attempt timestamptz not null default now(),
 lease_until timestamptz, sent_at timestamptz, last_error text, created_at timestamptz not null default now()
);
do $$ declare t text; begin foreach t in array array['site_documents','site_versions','site_commands','site_domains','project_settings','form_submissions','analytics_events','notification_outbox'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon,authenticated',t);
 execute format('grant all on public.%I to service_role',t);
end loop;
foreach t in array array['site_documents','site_versions','site_domains','project_settings','form_submissions'] loop
 execute format('create policy member_read on public.%I for select to authenticated using(public.can_access(project_id))',t);
 execute format('grant select on public.%I to authenticated',t);
end loop; end $$;

-- Schema limits are enforced inside SQL too, so direct RPC access cannot bypass the API.
create function public.validate_site_content(pid uuid, definition jsonb, value jsonb) returns void
language plpgsql security definer set search_path=public as $$
declare field jsonb; page jsonb; item record; meta jsonb;
begin
 if jsonb_typeof(value) is distinct from 'object' or jsonb_typeof(value->'fields') is distinct from 'object' or jsonb_typeof(value->'seo') is distinct from 'object' or octet_length(value::text)>2000000 then raise exception 'Invalid website content'; end if;
 for item in select * from jsonb_each(value->'fields') loop
  select f into field from jsonb_array_elements(definition->'pages') p cross join lateral jsonb_array_elements(p->'fields') f where f->>'id'=item.key;
  if field is null or jsonb_typeof(item.value)<>'string' or length(item.value#>>'{}')>coalesce((field->>'maxLength')::int,10000) then raise exception 'Invalid website field'; end if;
  if field->>'kind'='link' and item.value#>>'{}'<>'' and item.value#>>'{}' !~ '^(https://|mailto:|tel:|/[^/]|#[a-zA-Z0-9_-]+$)' then raise exception 'Unsafe website link'; end if;
  if field->>'kind'='image' and item.value#>>'{}'<>'' and not exists(select 1 from assets where project_id=pid and id::text=item.value#>>'{}' and mime in ('image/png','image/jpeg','image/webp','image/gif')) then raise exception 'Invalid project image'; end if;
 end loop;
 for item in select * from jsonb_each(value->'seo') loop
  if not exists(select 1 from jsonb_array_elements(definition->'pages') p where p->>'id'=item.key) then raise exception 'Unknown website page'; end if;
  meta=item.value;
  if jsonb_typeof(meta->'title') is distinct from 'string' or length(trim(meta->>'title'))=0 or length(meta->>'title')>160 or jsonb_typeof(meta->'description') is distinct from 'string' or length(meta->>'description')>500 or jsonb_typeof(meta->'noindex') is distinct from 'boolean' then raise exception 'Invalid search metadata'; end if;
 end loop;
 for page in select * from jsonb_array_elements(definition->'pages') loop
  if not (value->'seo' ? (page->>'id')) then raise exception 'Every page needs search metadata'; end if;
 end loop;
end $$;
revoke all on function public.validate_site_content(uuid,jsonb,jsonb) from public,anon,authenticated;

create function public.site_command(pid uuid, action text, payload jsonb, expected integer, command_key uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare p projects; d site_documents; old site_commands; request_value jsonb; v site_versions; result jsonb; value jsonb;
begin
 select * into p from projects where id=pid for update;
 if auth.uid() is null or not public.can_access(pid) then raise exception 'Project not found or access denied'; end if;
 if command_key is null or expected is null or expected<1 or jsonb_typeof(payload) is distinct from 'object' then raise exception 'Invalid website command'; end if;
 request_value=jsonb_build_object('action',action,'payload',payload,'expected',expected);
 select * into old from site_commands where project_id=pid and key=command_key;
 if found then if old.request<>request_value then raise exception 'Idempotency key reused with a different request'; end if; return old.result; end if;
 select * into d from site_documents where project_id=pid for update;
 if d.project_id is null then raise exception 'Website has not been set up'; end if;
 if d.revision<>expected then raise exception 'Save conflict: website changed. Reload before continuing'; end if;
 if action not in ('save','publish','rollback') then raise exception 'Unknown website action'; end if;
 if p.phase not in ('REVIEW','REVISION_IN_PROGRESS','APPROVED_AWAITING_FINAL_PAYMENT','LAUNCH','LIVE') and not public.is_operator() then raise exception 'Website editing is unavailable at this stage'; end if;
 if action in ('publish','rollback') and p.phase<>'LIVE' then raise exception 'Website publishing begins after launch'; end if;
 if action='rollback' then
  select * into v from site_versions where id=(payload->>'versionId')::uuid and project_id=pid;
  if v.id is null then raise exception 'Website version unavailable'; end if;
  value=v.content;
 else value=payload->'content'; end if;
 perform public.validate_site_content(pid,d.manifest,value);
 update site_documents set content=value,revision=revision+1,updated_at=now() where project_id=pid returning * into d;
 if action<>'save' then
  insert into site_versions(project_id,manifest,content,revision,created_by) values(pid,d.manifest,value,d.revision,auth.uid()) returning * into v;
  update site_documents set published_id=v.id where project_id=pid returning * into d;
 end if;
 insert into audit_events(project_id,actor_id,type,metadata) values(pid,auth.uid(),'website_'||action,jsonb_build_object('revision',d.revision,'versionId',v.id));
 result=jsonb_build_object('document',to_jsonb(d),'version',case when v.id is null then null else to_jsonb(v) end);
 insert into site_commands values(pid,command_key,request_value,result);
 return result;
end $$;
revoke all on function public.site_command(uuid,text,jsonb,integer,uuid) from public,anon;
grant execute on function public.site_command(uuid,text,jsonb,integer,uuid) to authenticated;

-- The initial customer-site definition is supplied by the agency, never by an anonymous signup.
create function public.register_site(pid uuid, definition jsonb, value jsonb) returns void
language plpgsql security definer set search_path=public as $$
begin
 perform 1 from projects where id=pid for update;
 if not found or not public.is_operator() or auth.uid() is null then raise exception 'Only Fourthform can define a website'; end if;
 if exists(select 1 from site_documents where project_id=pid) then raise exception 'Website is already set up'; end if;
 if jsonb_typeof(definition->'pages') is distinct from 'array' or jsonb_array_length(definition->'pages')<1 or jsonb_array_length(definition->'pages')>100 or octet_length(definition::text)>500000 then raise exception 'Invalid website definition'; end if;
 perform public.validate_site_content(pid,definition,value);
 insert into site_documents(project_id,manifest,content) values(pid,definition,value);
 insert into project_settings(project_id) values(pid) on conflict do nothing;
end $$;
revoke all on function public.register_site(uuid,jsonb,jsonb) from public,anon;
grant execute on function public.register_site(uuid,jsonb,jsonb) to authenticated;

create function public.prepare_site_release(pid uuid, expected integer) returns jsonb
language plpgsql security definer set search_path=public as $$
declare d site_documents; p projects; v site_versions;
begin
 select * into p from projects where id=pid for update;
 if p.phase<>'LAUNCH' then raise exception 'Approval and payment are required before launch'; end if;
 select * into d from site_documents where project_id=pid for update;
 if d.project_id is null or d.revision<>expected then raise exception 'Save conflict: website changed'; end if;
 perform public.validate_site_content(pid,d.manifest,d.content);
 insert into site_versions(project_id,manifest,content,revision) values(pid,d.manifest,d.content,d.revision) on conflict(project_id,revision) do nothing;
 select * into v from site_versions where project_id=pid and revision=d.revision;
 update site_documents set published_id=v.id where project_id=pid;
 return to_jsonb(v);
end $$;
revoke all on function public.prepare_site_release(uuid,integer) from public,anon,authenticated;
grant execute on function public.prepare_site_release(uuid,integer) to service_role;

create function public.update_project_settings(pid uuid, expected integer, value jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$
declare s project_settings;
begin
 perform 1 from projects where id=pid for update;
 if auth.uid() is null or not public.can_access(pid) then raise exception 'Project not found or access denied'; end if;
 insert into project_settings(project_id) values(pid) on conflict do nothing;
 select * into s from project_settings where project_id=pid for update;
 if s.revision<>expected then raise exception 'Save conflict: settings changed'; end if;
 if not exists(select 1 from pg_timezone_names where name=value->>'timezone') or jsonb_typeof(value->'notifyForms') is distinct from 'boolean' or jsonb_typeof(value->'notifyProject') is distinct from 'boolean' then raise exception 'Invalid account settings'; end if;
 update project_settings set timezone=value->>'timezone',notify_forms=(value->>'notifyForms')::boolean,notify_project=(value->>'notifyProject')::boolean,revision=revision+1 where project_id=pid returning * into s;
 return to_jsonb(s);
end $$;
revoke all on function public.update_project_settings(uuid,integer,jsonb) from public,anon;
grant execute on function public.update_project_settings(uuid,integer,jsonb) to authenticated;

create function public.save_connections(pid uuid, expected integer, value jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$
declare s project_settings; item record;
begin
 perform 1 from projects where id=pid for update;
 if auth.uid() is null or not public.can_access(pid) then raise exception 'Project not found or access denied'; end if;
 if jsonb_typeof(value) is distinct from 'object' or octet_length(value::text)>10000 then raise exception 'Invalid connections'; end if;
 for item in select * from jsonb_each(value) loop
  if item.key not in ('booking','social') or jsonb_typeof(item.value)<>'string' or (item.value#>>'{}'<>'' and item.value#>>'{}' !~ '^https://') then raise exception 'Invalid connection link'; end if;
 end loop;
 insert into project_settings(project_id) values(pid) on conflict do nothing;
 select * into s from project_settings where project_id=pid for update;
 if s.revision<>expected then raise exception 'Save conflict: connections changed'; end if;
 update project_settings set connections=value,revision=revision+1 where project_id=pid returning * into s;
 return to_jsonb(s);
end $$;
revoke all on function public.save_connections(uuid,integer,jsonb) from public,anon;
grant execute on function public.save_connections(uuid,integer,jsonb) to authenticated;

create function public.analytics_summary(pid uuid, days integer) returns jsonb
language plpgsql security definer set search_path=public as $$
declare result jsonb; since timestamptz=now()-make_interval(days=>days);
begin
 if auth.uid() is null or not public.can_access(pid) then raise exception 'Project not found or access denied'; end if;
 if days not in (7,30,90) then raise exception 'Invalid analytics range'; end if;
 select jsonb_build_object('views',count(*) filter(where kind='pageview'),'visitors',count(distinct visitor) filter(where kind='pageview'),'actions',count(*) filter(where kind='cta'),'forms',(select count(*) from form_submissions where project_id=pid and created_at>=since)) into result from analytics_events where project_id=pid and created_at>=since;
 return result||jsonb_build_object(
  'daily',coalesce((select jsonb_agg(t) from (select date_trunc('day',created_at)::date as date,count(*) filter(where kind='pageview') as views from analytics_events where project_id=pid and created_at>=since group by 1 order by 1) t),'[]'::jsonb),
  'pages',coalesce((select jsonb_agg(t) from (select page_id as page,count(*) as views from analytics_events where project_id=pid and created_at>=since and kind='pageview' group by 1 order by 2 desc) t),'[]'::jsonb),
  'sources',coalesce((select jsonb_agg(t) from (select source,count(*) as views from analytics_events where project_id=pid and created_at>=since and kind='pageview' group by 1 order by 2 desc) t),'[]'::jsonb),
  'devices',coalesce((select jsonb_agg(t) from (select device,count(*) as views from analytics_events where project_id=pid and created_at>=since and kind='pageview' group by 1 order by 2 desc) t),'[]'::jsonb));
end $$;
revoke all on function public.analytics_summary(uuid,integer) from public,anon;
grant execute on function public.analytics_summary(uuid,integer) to authenticated;

create function public.set_form_status(pid uuid, submission uuid, new_status text) returns void
language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null or not public.can_access(pid) then raise exception 'Project not found or access denied'; end if;
 if new_status not in ('new','read','archived') then raise exception 'Invalid form status'; end if;
 update form_submissions set status=new_status where project_id=pid and id=submission;
 if not found then raise exception 'Form message not found'; end if;
end $$;
revoke all on function public.set_form_status(uuid,uuid,text) from public,anon;
grant execute on function public.set_form_status(uuid,uuid,text) to authenticated;

-- Public domain resolution discloses only the ID of an already-live website.
create function public.resolve_public_domain(host text) returns uuid language sql stable security definer set search_path=public as $$
 select d.project_id from site_domains d join projects p on p.id=d.project_id where d.hostname=lower(host) and d.status='connected' and p.phase='LIVE'
$$;
revoke all on function public.resolve_public_domain(text) from public;
grant execute on function public.resolve_public_domain(text) to anon,authenticated,service_role;

create function public.claim_notifications(batch_size integer) returns setof notification_outbox
language sql security definer set search_path=public as $$
 update notification_outbox set lease_until=now()+interval '5 minutes',attempts=attempts+1
 where id in (select id from notification_outbox where sent_at is null and attempts<8 and next_attempt<=now() and (lease_until is null or lease_until<now()) order by created_at for update skip locked limit least(greatest(batch_size,1),50)) returning *
$$;
revoke all on function public.claim_notifications(integer) from public,anon,authenticated;
grant execute on function public.claim_notifications(integer) to service_role;
