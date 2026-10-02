-- Customer revision accounting commands must not be executable by operators.
-- Operators retain their explicit start/complete lifecycle commands.
alter function public.project_command(uuid,text,jsonb,integer,uuid) rename to project_command_validated;
revoke all on function public.project_command_validated(uuid,text,jsonb,integer,uuid) from public, anon, authenticated;

create or replace function public.project_command(pid uuid, action text, payload jsonb, expected integer, command_key uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare owner uuid;
begin
 if action in ('submit_revision','withdraw_revision') then
  select owner_id into owner from projects where id=pid;
  if auth.uid() is null or owner is null or owner<>auth.uid() then
   raise exception 'Only the project owner can manage revision submissions';
  end if;
 end if;
 return public.project_command_validated(pid,action,payload,expected,command_key);
end $$;
revoke all on function public.project_command(uuid,text,jsonb,integer,uuid) from public, anon;
grant execute on function public.project_command(uuid,text,jsonb,integer,uuid) to authenticated;
