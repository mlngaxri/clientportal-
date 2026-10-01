-- Preserve the lifecycle transaction and validate its inputs before delegation.
alter function public.project_command(uuid,text,jsonb,integer,uuid) rename to project_command_internal;
revoke all on function public.project_command_internal(uuid,text,jsonb,integer,uuid) from public, authenticated;
alter table public.commands add column request jsonb;
create or replace function public.project_command(pid uuid, action text, payload jsonb, expected integer, command_key uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare prior commands; result jsonb; request_value jsonb; item jsonb;
begin
 if auth.uid() is null or not public.can_access(pid) then raise exception 'Project not found or access denied'; end if;
 if command_key is null or expected is null or expected < 0 or action is null or jsonb_typeof(payload) is distinct from 'object' then raise exception 'Invalid command'; end if;
 -- Same lock ordering as the original transaction. Serializes replay validation.
 perform 1 from projects where id=pid for update;
 request_value=jsonb_build_object('action',action,'payload',payload,'expected',expected);
 select * into prior from commands where project_id=pid and key=command_key;
 if found then
  if prior.action<>action or (prior.request is not null and prior.request<>request_value) then raise exception 'Idempotency key reused with a different request'; end if;
  return prior.result;
 end if;
 if action='save_business' then
  if jsonb_typeof(payload->'name') is distinct from 'string' or length(trim(payload->>'name'))=0 or length(payload->>'name')>160 or jsonb_typeof(payload->'brief') is distinct from 'object' or jsonb_typeof(payload->'objects') is distinct from 'array' then raise exception 'Invalid business information'; end if;
 end if;
 if action in ('save_business','save_board') then
  if octet_length(payload::text)>2000000 then raise exception 'Direction is too large'; end if;
  if action='save_board' and (jsonb_typeof(payload->'data') is distinct from 'object' or jsonb_typeof(payload->'data'->'objects') is distinct from 'array') then raise exception 'Invalid Direction document'; end if;
  for item in select value from jsonb_array_elements(case when action='save_business' then payload->'objects' else payload->'data'->'objects' end) loop
   if jsonb_typeof(item) is distinct from 'object' or jsonb_typeof(item->'id') is distinct from 'string' or length(item->>'id')=0 or coalesce(item->>'type','') not in ('text','image','video','audio','file','link','drawing') then raise exception 'Invalid Direction item'; end if;
   if item->>'type'='link' and (jsonb_typeof(item->'url') is distinct from 'string' or item->>'url' !~ '^https?://') then raise exception 'Use an HTTP or HTTPS link'; end if;
   if item->>'type' in ('image','video','audio','file') and (jsonb_typeof(item->'assetId') is distinct from 'string' or jsonb_typeof(item->'url') is distinct from 'string' or item->>'url' <> '/api/assets/'||(item->>'assetId') or not exists(select 1 from assets where id::text=item->>'assetId' and project_id=pid)) then raise exception 'Invalid project asset'; end if;
  end loop;
  if exists(select 1 from jsonb_array_elements(case when action='save_business' then payload->'objects' else payload->'data'->'objects' end) v group by v->>'id' having count(*)>1) then raise exception 'Direction IDs must be unique'; end if;
 end if;
 result=public.project_command_internal(pid,action,payload,expected,command_key);
 update commands set request=request_value where project_id=pid and key=command_key;
 return result;
end $$;
-- Avoid PL/pgSQL ambiguity between the request variable and column.
revoke all on function public.project_command(uuid,text,jsonb,integer,uuid) from public;
grant execute on function public.project_command(uuid,text,jsonb,integer,uuid) to authenticated;

-- Account lock makes retrying onboarding creation deterministic across tabs.
create or replace function public.ensure_onboarding_project() returns jsonb
language plpgsql security definer set search_path=public as $$
declare p projects; actor uuid=auth.uid();
begin
 if actor is null then raise exception 'Please sign in to continue'; end if;
 perform 1 from auth.users where id=actor for update;
 select * into p from projects where owner_id=actor and phase in ('DRAFT_ONBOARDING','AWAITING_INITIAL_PAYMENT') order by created_at limit 1;
 if p.id is null then insert into projects(owner_id) values(actor) returning * into p; end if;
 return to_jsonb(p);
end $$;
revoke all on function public.ensure_onboarding_project() from public;
grant execute on function public.ensure_onboarding_project() to authenticated;
