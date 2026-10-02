-- Initial Direction submission must carry real customer intent, not merely a
-- target-only or whitespace placeholder. Reuse the persisted Review completeness
-- predicate so direct RPC callers cannot bypass the UI boundary.
alter table public.boards
  add constraint initial_submission_requires_complete_directions
  check (
    kind <> 'initial'
    or status = 'DRAFT'
    or (
      submitted_data is not null
      and public.revision_submission_complete(submitted_data)
    )
  ) not valid;
