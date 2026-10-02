-- Editing a State is a draft operation. Public sites use only an explicit release.
create table public.state_releases (
  project_id uuid primary key references public.projects(id),
  states jsonb not null default '[]'::jsonb,
  board_version integer not null,
  activated_at timestamptz not null default now(),
  constraint state_release_valid check (public.valid_states_payload(jsonb_build_object('states',states)))
);
alter table public.state_releases enable row level security;
create policy state_release_read on public.state_releases for select to authenticated using (public.can_access(project_id));
grant select on public.state_releases to authenticated;
grant all on public.state_releases to service_role;
-- Preserve previously active schedules during migration. Subsequent edits stay drafts.
insert into public.state_releases(project_id,states,board_version)
select distinct on (b.project_id) b.project_id,coalesce(b.data->'states','[]'::jsonb),b.version
from public.boards b join public.projects p on p.id=b.project_id
where b.kind='states' and p.phase='LIVE' and p.pro
order by b.project_id,b.created_at desc;
create function public.activate_state_schedules(pid uuid,board_id uuid,expected integer,command_key uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare p projects; b boards; prior commands; release state_releases; request_value jsonb;
begin
  if auth.uid() is null or not public.can_access(pid) then raise exception 'Project not found or access denied'; end if;
  if command_key is null then raise exception 'Idempotency key required'; end if;
  select * into p from projects where id=pid for update;
  if p.phase<>'LIVE' or not p.pro then raise exception 'Pro is required to activate States on a live website'; end if;
  request_value=jsonb_build_object('boardId',board_id,'expected',expected);
  select * into prior from commands where project_id=pid and key=command_key;
  if found then
    if prior.action<>'activate_states' or prior.request<>request_value then raise exception 'Idempotency key reused with a different request'; end if;
    return prior.result;
  end if;
  select * into b from boards where id=board_id and project_id=pid and kind='states' for update;
  if b.id is null or b.version<>expected then raise exception 'Save conflict. Reload your State drafts before activating'; end if;
  if not public.valid_states_payload(b.data) then raise exception 'Invalid State schedules'; end if;
  insert into state_releases(project_id,states,board_version) values(pid,coalesce(b.data->'states','[]'::jsonb),b.version)
  on conflict(project_id) do update set states=excluded.states,board_version=excluded.board_version,activated_at=now()
  returning * into release;
  insert into commands(project_id,key,action,result,request) values(pid,command_key,'activate_states',to_jsonb(release),request_value);
  insert into audit_events(project_id,type,metadata) values(pid,'states_activated',jsonb_build_object('boardVersion',b.version,'count',jsonb_array_length(release.states)));
  return to_jsonb(release);
end $$;
revoke all on function public.activate_state_schedules(uuid,uuid,integer,uuid) from public,anon;
grant execute on function public.activate_state_schedules(uuid,uuid,integer,uuid) to authenticated;
