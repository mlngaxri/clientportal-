-- A new website is an explicit, retry-safe request. Existing drafts are resumed by ID.
create table public.onboarding_requests (
  key uuid primary key,
  owner_id uuid not null references auth.users(id),
  project_id uuid not null references public.projects(id),
  created_at timestamptz not null default now()
);
alter table public.onboarding_requests enable row level security;
revoke all on public.onboarding_requests from anon, authenticated;
grant all on public.onboarding_requests to service_role;
create function public.create_onboarding_project(request_key uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare actor uuid=auth.uid(); p projects; prior onboarding_requests;
begin
  if actor is null then raise exception 'Please sign in to continue'; end if;
  if request_key is null then raise exception 'Idempotency key required'; end if;
  perform 1 from auth.users where id=actor for update;
  select * into prior from onboarding_requests where key=request_key;
  if found then
    if prior.owner_id<>actor then raise exception 'Project not found or access denied'; end if;
    select * into p from projects where id=prior.project_id;
    return to_jsonb(p);
  end if;
  if (select count(*) from projects where owner_id=actor and phase='DRAFT_ONBOARDING')>=10 then raise exception 'Business drafts are limited to ten. Resume an existing brief before starting another.'; end if;
  insert into projects(owner_id) values(actor) returning * into p;
  insert into onboarding_requests(key,owner_id,project_id) values(request_key,actor,p.id);
  return to_jsonb(p);
end $$;
revoke all on function public.create_onboarding_project(uuid) from public, anon;
grant execute on function public.create_onboarding_project(uuid) to authenticated;
