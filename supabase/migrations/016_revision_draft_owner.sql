-- Revision draft content belongs to the customer. Operators may start and complete
-- submitted revision work, but must not rewrite a customer's draft through the
-- trusted-operator project access path.
alter function public.project_command(uuid,text,jsonb,integer,uuid) rename to project_command_revision_draft_validated;
revoke all on function public.project_command_revision_draft_validated(uuid,text,jsonb,integer,uuid) from public, anon, authenticated;

create or replace function public.project_command(pid uuid, action text, payload jsonb, expected integer, command_key uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare owner uuid; board_kind text;
begin
 if action='save_board' then
  select b.kind into board_kind
  from boards b
  where b.id=(payload->>'boardId')::uuid and b.project_id=pid;

  if board_kind='revision' then
   select owner_id into owner from projects where id=pid;
   if auth.uid() is null or owner is null or owner<>auth.uid() then
    raise exception 'Only the project owner can edit revision Directions';
   end if;
  end if;
 end if;

 return public.project_command_revision_draft_validated(pid,action,payload,expected,command_key);
end $$;
revoke all on function public.project_command(uuid,text,jsonb,integer,uuid) from public, anon;
grant execute on function public.project_command(uuid,text,jsonb,integer,uuid) to authenticated;
