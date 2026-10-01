-- Enforce the scheduled-State contract at the persistence boundary.
-- API validation remains useful for friendly errors; this trigger prevents alternate
-- writers from persisting schedules the runtime evaluator would reject.

create or replace function public.valid_states_payload(doc jsonb)
returns boolean
language plpgsql
stable
set search_path=public
as $$
declare
  state jsonb;
  day_value jsonb;
  override_pair record;
  seen_ids text[] := array[]::text[];
  seen_days text[];
  priority_text text;
begin
  if jsonb_typeof(doc) <> 'object' then return false; end if;
  if not (doc ? 'states') then return true; end if;
  if jsonb_typeof(doc->'states') <> 'array' or jsonb_array_length(doc->'states') > 100 then return false; end if;

  for state in select value from jsonb_array_elements(doc->'states') loop
    if jsonb_typeof(state) <> 'object'
      or jsonb_typeof(state->'id') <> 'string'
      or jsonb_typeof(state->'title') <> 'string'
      or jsonb_typeof(state->'enabled') <> 'boolean'
      or jsonb_typeof(state->'timezone') <> 'string'
      or jsonb_typeof(state->'days') <> 'array'
      or jsonb_typeof(state->'start') <> 'string'
      or jsonb_typeof(state->'end') <> 'string'
      or jsonb_typeof(state->'priority') <> 'number'
      or jsonb_typeof(state->'overrides') <> 'object'
    then return false; end if;

    if length(state->>'id') = 0 or length(state->>'id') > 100
      or state->>'id' = any(seen_ids)
      or length(trim(state->>'title')) = 0 or length(state->>'title') > 160
      or length(state->>'timezone') = 0 or length(state->>'timezone') > 100
    then return false; end if;
    seen_ids := array_append(seen_ids, state->>'id');

    begin
      perform timezone(state->>'timezone', now());
    exception when others then
      return false;
    end;

    if jsonb_array_length(state->'days') = 0 or jsonb_array_length(state->'days') > 7 then return false; end if;
    seen_days := array[]::text[];
    for day_value in select value from jsonb_array_elements(state->'days') loop
      if jsonb_typeof(day_value) <> 'number'
        or (day_value #>> '{}') !~ '^[0-6]$'
        or (day_value #>> '{}') = any(seen_days)
      then return false; end if;
      seen_days := array_append(seen_days, day_value #>> '{}');
    end loop;

    if (state->>'start') !~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$'
      or (state->>'end') !~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$'
      or state->>'start' = state->>'end'
    then return false; end if;

    priority_text := state->>'priority';
    if priority_text !~ '^[0-9]+$' or priority_text::numeric > 100 then return false; end if;

    for override_pair in select key, value from jsonb_each(state->'overrides') loop
      if override_pair.key !~ '^[a-zA-Z0-9][a-zA-Z0-9._-]{0,199}$'
        or override_pair.key in ('__proto__','constructor','prototype')
        or jsonb_typeof(override_pair.value) <> 'string'
        or length(override_pair.value #>> '{}') > 10000
      then return false; end if;
    end loop;
  end loop;
  return true;
end
$$;

create or replace function public.enforce_states_board()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  if new.kind = 'states' and not public.valid_states_payload(new.data) then
    raise exception 'Invalid State schedule payload';
  end if;
  return new;
end
$$;

drop trigger if exists boards_states_contract on public.boards;
create trigger boards_states_contract
before insert or update of data, kind on public.boards
for each row execute function public.enforce_states_board();

revoke all on function public.valid_states_payload(jsonb) from public, anon, authenticated;
revoke all on function public.enforce_states_board() from public, anon, authenticated;
grant execute on function public.valid_states_payload(jsonb) to service_role;
