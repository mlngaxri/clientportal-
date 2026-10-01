-- Receive public enquiries atomically with their owner-only notification.
create function public.receive_site_form(pid uuid,submission uuid,page text,sender_name text,sender_email text,message_text text) returns void
language plpgsql security definer set search_path=public as $$
declare p projects; v site_versions; prior form_submissions; recipient_email text;
begin
 select * into p from projects where id=pid;
 if p.phase is distinct from 'LIVE' then raise exception 'Website unavailable'; end if;
 select sv.* into v from site_documents d join site_versions sv on sv.id=d.published_id where d.project_id=pid;
 if not exists(select 1 from jsonb_array_elements(v.manifest->'pages') x where x->>'id'=page) then raise exception 'Unknown website page'; end if;
 if length(trim(sender_name)) not between 1 and 160 or length(sender_email)>254 or sender_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' or length(trim(message_text)) not between 10 and 5000 then raise exception 'Invalid enquiry'; end if;
 insert into form_submissions(id,project_id,page_id,name,email,message) values(submission,pid,page,sender_name,sender_email,message_text) on conflict(id) do nothing;
 select * into prior from form_submissions where id=submission;
 if prior.project_id<>pid or prior.page_id<>page or prior.name<>sender_name or prior.email<>sender_email or prior.message<>message_text then raise exception 'Enquiry key reused'; end if;
 if coalesce((select notify_forms from project_settings where project_id=pid),true) then
  select email into recipient_email from auth.users where id=p.owner_id;
  if recipient_email is not null then insert into notification_outbox(project_id,dedupe,kind,recipient,subject,message) values(pid,'form:'||submission,'form',recipient_email,'New website enquiry',sender_name||E'\n'||sender_email||E'\n\n'||message_text) on conflict(dedupe) do nothing; end if;
 end if;
end $$;
revoke all on function public.receive_site_form(uuid,uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.receive_site_form(uuid,uuid,text,text,text,text) to service_role;

alter table public.notification_outbox add column provider_id text;
-- An acknowledged inbox probe tests the real write path without creating traffic or enquiries.
create table public.service_probes (id uuid primary key,project_id uuid not null references public.projects(id),created_at timestamptz not null default now());
alter table public.service_probes enable row level security;
revoke all on public.service_probes from anon,authenticated;
grant all on public.service_probes to service_role;
create function public.probe_site_storage(pid uuid) returns boolean language plpgsql security definer set search_path=public as $$
declare key uuid=gen_random_uuid();begin
 insert into service_probes values(key,pid,now());
 insert into form_submissions(id,project_id,page_id,name,email,message) values(key,pid,'probe','Service check','check@example.invalid','Launch storage check');
 insert into analytics_events(id,project_id,page_id,kind,visitor,source,device) values(key,pid,'probe','pageview','probe','probe','probe');
 if not exists(select 1 from service_probes where id=key) then raise exception 'Storage acknowledgement failed'; end if;
 delete from service_probes where id=key;
 delete from form_submissions where id=key;
 delete from analytics_events where id=key;
 return true;
end $$;
revoke all on function public.probe_site_storage(uuid) from public,anon,authenticated;
grant execute on function public.probe_site_storage(uuid) to service_role;

-- Fresh launch checks are bound to the exact website revision, not just the project ID.
alter function public.project_command(uuid,text,jsonb,integer,uuid) rename to project_command_validated;
revoke all on function public.project_command_validated(uuid,text,jsonb,integer,uuid) from public,anon,authenticated;
create function public.project_command(pid uuid,action text,payload jsonb,expected integer,command_key uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare d site_documents; b boards; state jsonb; field record; result jsonb; package_value text; opened date; current_package text;
begin
 if auth.uid() is null or not public.can_access(pid) then raise exception 'Project not found or access denied'; end if;
 perform 1 from projects where id=pid for update;
 if exists(select 1 from commands where project_id=pid and key=command_key) then return public.project_command_validated(pid,action,payload,expected,command_key); end if;
 if action='launch' then
  select * into d from site_documents where project_id=pid;
  if d.project_id is null or d.published_id is null or (select count(*) from integration_receipts where project_id=pid and kind in ('domain','analytics','forms','seo','deployment') and evidence->>'revision'=d.revision::text and verified_at>now()-interval '24 hours')<>5 then raise exception 'Launch checks must be repeated for this website version'; end if;
 end if;
 if action='save_business' and payload ? 'package' then
  package_value=payload->>'package';select package into current_package from projects where id=pid;
  if package_value not in ('SITE','FIRST') then raise exception 'Business package is invalid'; end if;
  if package_value<>current_package and exists(select 1 from checkout_intents where project_id=pid and session_id is not null and expires_at>now()) then raise exception 'Business package cannot change while checkout is open. Return when that checkout expires'; end if;
  if package_value='FIRST' then
   begin opened=(payload->'brief'->>'openedOn')::date;exception when others then raise exception 'Business opening date is required for First';end;
   if opened is null or opened>current_date or opened<(current_date-interval '6 months')::date then raise exception 'Business opening date must be within the last six months for First'; end if;
  end if;
 end if;
 if action='save_board' then
  select * into b from boards where id=(payload->>'boardId')::uuid and project_id=pid;
  if b.kind='states' then
   if jsonb_typeof(payload->'data'->'states') is distinct from 'array' or jsonb_array_length(payload->'data'->'states')>100 then raise exception 'Invalid State schedules'; end if;
   select * into d from site_documents where project_id=pid;
   if (select count(distinct x->>'id') from jsonb_array_elements(payload->'data'->'states') x)<>jsonb_array_length(payload->'data'->'states') then raise exception 'State IDs must be unique'; end if;
   for state in select * from jsonb_array_elements(payload->'data'->'states') loop
    if jsonb_typeof(state->'id') is distinct from 'string' or length(state->>'id') not between 1 and 100 or length(state->>'title')>160 or jsonb_typeof(state->'priority') is distinct from 'number' or coalesce(state->>'priority','') !~ '^(100|[0-9]{1,2})$' or jsonb_typeof(state->'start') is distinct from 'string' or jsonb_typeof(state->'end') is distinct from 'string' or jsonb_typeof(state->'title') is distinct from 'string' or length(trim(state->>'title'))=0 or jsonb_typeof(state->'enabled') is distinct from 'boolean' or not exists(select 1 from pg_timezone_names where name=state->>'timezone') or state->>'start' !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or state->>'end' !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or state->>'start'=state->>'end' or jsonb_typeof(state->'days') is distinct from 'array' or jsonb_array_length(state->'days')=0 or jsonb_typeof(state->'overrides') is distinct from 'object' then raise exception 'Invalid State schedule'; end if;
    if (select count(distinct day) from jsonb_array_elements(state->'days') day)<>jsonb_array_length(state->'days') or exists(select 1 from jsonb_array_elements(state->'days') day where day::text !~ '^[0-6]$') then raise exception 'Invalid State days'; end if;
    for field in select * from jsonb_each(state->'overrides') loop
     if not exists(select 1 from jsonb_array_elements(d.manifest->'pages') p cross join lateral jsonb_array_elements(p->'fields') f where f->>'id'=field.key and f->>'kind'='text' and length(field.value#>>'{}')<=coalesce((f->>'maxLength')::integer,10000)) or jsonb_typeof(field.value)<>'string' or length(field.value#>>'{}')>10000 then raise exception 'Invalid State content field'; end if;
    end loop;
   end loop;
  end if;
 end if;
 if action='save_business' and package_value is not null then update projects set package=package_value,revision_limit=case when package_value='FIRST' then 1 else 3 end where id=pid; end if;
 result=public.project_command_validated(pid,action,payload,expected,command_key);
 return result;
end $$;
revoke all on function public.project_command(uuid,text,jsonb,integer,uuid) from public,anon;
grant execute on function public.project_command(uuid,text,jsonb,integer,uuid) to authenticated;
