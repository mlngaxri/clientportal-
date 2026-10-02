-- Revision work is immutable once submitted. A customer may edit only the active
-- DRAFT revision; submitted/in-progress/done boards are historical work records.
alter function public.project_command(uuid,text,jsonb,integer,uuid) rename to project_command_revision_draft_state_validated;
revoke all on function public.project_command_revision_draft_state_validated(uuid,text,jsonb,integer,uuid) from public, anon, authenticated;

create or replace function public.project_command(pid uuid, action text, payload jsonb, expected integer, command_key uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare board_kind text; board_status text;
begin
 if action='save_board' then
  select b.kind,b.status into board_kind,board_status
  from boards b
  where b.id=(payload->>'boardId')::uuid and b.project_id=pid;

  if board_kind='revision' and board_status is distinct from 'DRAFT' then
   raise exception 'Only a draft revision can be edited';
  end if;
 end if;

 return public.project_command_revision_draft_state_validated(pid,action,payload,expected,command_key);
end $$;
revoke all on function public.project_command(uuid,text,jsonb,integer,uuid) from public, anon;
grant execute on function public.project_command(uuid,text,jsonb,integer,uuid) to authenticated;
