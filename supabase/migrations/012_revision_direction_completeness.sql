-- Revision entitlement consumption must be backed by submitted customer intent.
-- Keep this rule at the database boundary so direct RPC callers cannot bypass
-- the Review UI's completeness guard.
create or replace function public.revision_direction_complete(item jsonb)
returns boolean
language sql
immutable
set search_path = public
as $$
  select
    length(trim(coalesce(item->>'text', ''))) > 0
    or nullif(item->>'assetId', '') is not null
    or (
      item->>'type' = 'drawing'
      and jsonb_typeof(item->'strokes') = 'array'
      and jsonb_array_length(item->'strokes') > 0
    )
    or (
      item->>'type' = 'link'
      and coalesce(item->>'url', '') ~* '^https?://'
    );
$$;

create or replace function public.revision_submission_complete(data jsonb)
returns boolean
language sql
immutable
set search_path = public
as $$
  select
    jsonb_typeof(data) = 'object'
    and jsonb_typeof(data->'objects') = 'array'
    and jsonb_array_length(data->'objects') > 0
    and not exists (
      select 1
      from jsonb_array_elements(data->'objects') item
      where not public.revision_direction_complete(item)
    );
$$;

-- NOT VALID avoids blocking rollout on historical rows while PostgreSQL still
-- enforces the constraint for every new or updated row from this point onward.
alter table public.boards
  add constraint revision_submission_requires_complete_directions
  check (
    kind <> 'revision'
    or status = 'DRAFT'
    or (
      submitted_data is not null
      and public.revision_submission_complete(submitted_data)
    )
  ) not valid;
