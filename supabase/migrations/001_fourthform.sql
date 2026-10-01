create table public.projects (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id),
 name text not null default 'Your website', package text not null default 'SITE' check(package in ('SITE','FIRST')),
 phase text not null default 'DRAFT_ONBOARDING' check(phase in ('DRAFT_ONBOARDING','AWAITING_INITIAL_PAYMENT','DIRECTION','BUILDING','REVIEW','REVISION_IN_PROGRESS','APPROVED_AWAITING_FINAL_PAYMENT','LAUNCH','LIVE')),
 version integer not null default 0, brief jsonb not null default '{}', revision_limit integer not null default 3, revision_used integer not null default 0 check(revision_used>=0),
 pro boolean not null default false, preview_url text, live_url text, build_step text not null default 'Direction received',
 initial_paid_at timestamptz, approved_at timestamptz, final_paid_at timestamptz, live_at timestamptz,
 launch jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.boards (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
 kind text not null check(kind in ('initial','revision','notes','pages','seo','connections','states')),
 status text not null default 'DRAFT' check(status in ('DRAFT','SUBMITTED','IN_PROGRESS','DONE')),
 version integer not null default 0, data jsonb not null default '{"objects":[]}', submitted_data jsonb,
 submitted_at timestamptz, locked_at timestamptz, created_at timestamptz not null default now()
);
create unique index one_initial_board on public.boards(project_id) where kind='initial';
create unique index one_revision_draft on public.boards(project_id) where kind='revision' and status='DRAFT';
create table public.assets (id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects(id),storage_key text not null unique,name text not null,mime text not null,bytes bigint not null check(bytes>0),created_at timestamptz default now());
create table public.audit_events (id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id),actor_id uuid,type text not null,metadata jsonb not null default '{}',created_at timestamptz not null default now());
create table public.commands (project_id uuid not null references public.projects(id),key uuid not null,action text not null,result jsonb not null,primary key(project_id,key));
create table public.payments (id text primary key, project_id uuid not null references public.projects(id),kind text not null,amount integer not null,currency text not null check(currency='aud'),paid_at timestamptz not null default now());
create table public.payment_events (id text primary key,created_at timestamptz not null default now());
create table public.integration_receipts (project_id uuid not null references public.projects(id),kind text not null,evidence jsonb not null,verified_at timestamptz not null default now(),primary key(project_id,kind));
create table public.subscriptions (id text primary key,project_id uuid not null references public.projects(id),status text not null,event_created bigint not null default 0);
create or replace function public.is_operator() returns boolean language sql stable as $$ select coalesce(auth.jwt()->'app_metadata'->>'role','')='operator' $$;
create or replace function public.can_access(pid uuid) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from projects where id=pid and (owner_id=auth.uid() or public.is_operator())) $$;
alter table public.projects enable row level security;
create policy project_read on public.projects for select to authenticated using(owner_id=auth.uid() or public.is_operator());
create policy project_create on public.projects for insert to authenticated with check(owner_id=auth.uid() and phase='DRAFT_ONBOARDING' and package='SITE' and revision_limit=3 and revision_used=0 and not pro and initial_paid_at is null and final_paid_at is null);
-- Column privileges prevent direct inserts forging a preview, payment, or lifecycle.
grant select on public.projects to authenticated;
grant insert(owner_id) on public.projects to authenticated;
do $$ declare t text; begin foreach t in array array['boards','assets','audit_events','payments','integration_receipts','subscriptions'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('create policy member_read on public.%I for select to authenticated using(public.can_access(project_id))',t);
 execute format('grant select on public.%I to authenticated',t);
end loop; end $$;
alter table public.commands enable row level security;
alter table public.payment_events enable row level security;
-- All mutations pass through this transaction. Lock ordering: project, then board.
create or replace function public.project_command(pid uuid, action text, payload jsonb, expected integer, command_key uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare p projects; b boards; prior commands; result jsonb; item jsonb; k text; actor uuid=auth.uid(); staff boolean=public.is_operator();
begin
 select * into p from projects where id=pid for update;
 if p.id is null or actor is null or (p.owner_id<>actor and not staff) then raise exception 'Project not found or access denied'; end if;
 select * into prior from commands where project_id=pid and key=command_key;
 if found then if prior.action<>action then raise exception 'Idempotency key reused'; end if; return prior.result; end if;
 if action in ('save_board','send_initial','submit_revision','withdraw_revision','start_revision','complete_revision') then
 select * into b from boards where id=(payload->>'boardId')::uuid and project_id=pid for update;
 if b.id is null then raise exception 'Direction not found'; end if;
 if b.version<>expected then raise exception 'Save conflict: another session changed this work. Reload before saving'; end if;
 else
 if p.version<>expected then raise exception 'Save conflict: project changed. Reload before continuing'; end if;
 end if;
 case action
 when 'save_business' then
  if p.phase not in ('DRAFT_ONBOARDING','AWAITING_INITIAL_PAYMENT') then raise exception 'Business onboarding is complete'; end if;
  if length(trim(payload->>'name'))=0 then raise exception 'Business name is required'; end if;
  update projects set name=left(payload->>'name',160),brief=payload->'brief',phase='AWAITING_INITIAL_PAYMENT' where id=pid;
  insert into boards(project_id,kind,data) values(pid,'initial',jsonb_build_object('objects',payload->'objects')) on conflict (project_id) where kind='initial' do update set data=excluded.data,version=boards.version+1;
 when 'save_board' then
  if b.locked_at is not null or (b.kind='revision' and b.status<>'DRAFT') then raise exception 'This Direction is locked'; end if;
  if b.kind='notes' and p.phase not in ('BUILDING','REVIEW','REVISION_IN_PROGRESS') then raise exception 'Additional notes are unavailable now'; end if;
  if b.kind='initial' and p.phase<>'DIRECTION' then raise exception 'Initial Direction is not editable now'; end if;
  if b.kind='revision' and p.phase not in ('REVIEW','REVISION_IN_PROGRESS') then raise exception 'Revisions are unavailable at this stage'; end if;
  if b.kind in ('pages','seo','connections','states') and p.phase<>'LIVE' then raise exception 'Live management is unavailable at this stage'; end if;
  if b.kind='states' and not p.pro then raise exception 'Pro is required to save States'; end if;
  if jsonb_typeof(payload->'data'->'objects')<>'array' or octet_length((payload->'data')::text)>2000000 then raise exception 'Invalid or oversized Direction'; end if;
  for item in select value from jsonb_array_elements(payload->'data'->'objects') loop
   if coalesce(item->>'type','') not in ('text','image','video','audio','file','link','drawing') then raise exception 'Unsupported Direction type'; end if;
   if item->>'type'='link' and coalesce(item->>'url','') !~ '^https?://' then raise exception 'Use an HTTP or HTTPS link'; end if;
   if item->>'type' in ('image','video','audio','file') and not (item ? 'assetId') then raise exception 'Upload an asset before saving'; end if;
   if item->>'type' in ('image','video','audio','file') and item->>'url' <> '/api/assets/'||(item->>'assetId') then raise exception 'Invalid asset URL'; end if;
   if item ? 'assetId' and not exists(select 1 from assets where id=(item->>'assetId')::uuid and project_id=pid) then raise exception 'Asset does not belong to this project'; end if;
  end loop;
  update boards set data=payload->'data',version=version+1 where id=b.id returning * into b;
 when 'send_initial' then
  if b.kind<>'initial' or p.phase<>'DIRECTION' or b.locked_at is not null then raise exception 'Initial Direction cannot be sent now'; end if;
  if jsonb_array_length(b.data->'objects')=0 then raise exception 'Add something to your Direction first'; end if;
  update boards set submitted_data=data,submitted_at=now(),status='SUBMITTED',version=version+1 where id=b.id returning * into b;
 when 'begin_build' then
  if not staff or p.phase<>'DIRECTION' then raise exception 'Only Fourthform can begin building'; end if;
  select * into b from boards where project_id=pid and kind='initial' for update;
  if b.submitted_data is null then raise exception 'Initial Direction has not been sent'; end if;
  update boards set locked_at=now(),status='IN_PROGRESS',version=version+1 where id=b.id;
  update projects set phase='BUILDING',build_step='Building' where id=pid;
  insert into boards(project_id,kind) values(pid,'notes');
 when 'internal_check' then
  if not staff or p.phase<>'BUILDING' then raise exception 'Invalid build action'; end if;
  update projects set build_step='Internal check' where id=pid;
 when 'deliver' then
  if not staff or p.phase<>'BUILDING' or coalesce(payload->>'url','') !~ '^https?://' then raise exception 'A real HTTPS preview is required'; end if;
  update projects set phase='REVIEW',preview_url=payload->>'url',build_step='Ready for review' where id=pid;
  insert into boards(project_id,kind) values(pid,'revision');
 when 'submit_revision' then
  if p.phase<>'REVIEW' or b.kind<>'revision' or b.status<>'DRAFT' then raise exception 'Revision cannot be submitted now'; end if;
  if exists(select 1 from boards where project_id=pid and kind='revision' and status in ('SUBMITTED','IN_PROGRESS')) then raise exception 'A revision is already waiting'; end if;
  if p.revision_used>=p.revision_limit then raise exception 'An additional revision is required'; end if;
  if jsonb_array_length(b.data->'objects')=0 then raise exception 'Add a Direction before submitting'; end if;
  update boards set status='SUBMITTED',submitted_data=data,submitted_at=now(),version=version+1 where id=b.id returning * into b;
  update projects set revision_used=revision_used+1 where id=pid;
 when 'withdraw_revision' then
  if b.kind<>'revision' or b.status<>'SUBMITTED' or b.locked_at is not null then raise exception 'Work has begun. This Revision cannot be withdrawn'; end if;
  update boards set status='DRAFT',submitted_at=null,submitted_data=null,version=version+1 where id=b.id returning * into b;
  update projects set revision_used=revision_used-1 where id=pid;
 when 'start_revision' then
  if not staff or b.kind<>'revision' or b.status<>'SUBMITTED' then raise exception 'Invalid revision start'; end if;
  update boards set status='IN_PROGRESS',locked_at=now(),version=version+1 where id=b.id returning * into b;
  update projects set phase='REVISION_IN_PROGRESS' where id=pid;
  insert into boards(project_id,kind) values(pid,'revision');
 when 'complete_revision' then
  if not staff or b.kind<>'revision' or b.status<>'IN_PROGRESS' then raise exception 'Invalid revision completion'; end if;
  update boards set status='DONE',version=version+1 where id=b.id returning * into b;
  update projects set phase='REVIEW' where id=pid;
 when 'approve' then
  if p.phase<>'REVIEW' or exists(select 1 from boards where project_id=pid and kind='revision' and (status in ('SUBMITTED','IN_PROGRESS') or (status='DRAFT' and jsonb_array_length(data->'objects')>0))) then raise exception 'Resolve or remove your draft Directions before approval'; end if;
  update projects set phase=case when package='FIRST' then 'LAUNCH' else 'APPROVED_AWAITING_FINAL_PAYMENT' end,approved_at=now() where id=pid;
 when 'save_launch' then
  if p.phase not in ('LAUNCH','LIVE') then raise exception 'Launch is not available yet'; end if;
  update projects set launch=payload->'data' where id=pid;
 when 'launch' then
  if p.phase<>'LAUNCH' then raise exception 'Approval and payment are required before launch'; end if;
  if (select count(distinct kind) from integration_receipts where project_id=pid and kind in ('domain','analytics','forms','seo','deployment') and verified_at>now()-interval '24 hours')<>5 then raise exception 'Launch integrations have not all been verified'; end if;
  if not exists(select 1 from integration_receipts where project_id=pid and kind='domain' and evidence->>'domain'=p.launch->>'domain') then raise exception 'The current domain has not been verified'; end if;
  update projects set phase='LIVE',live_at=now(),live_url=(select evidence->>'url' from integration_receipts where project_id=pid and kind='deployment') where id=pid;
  foreach k in array array['pages','seo','connections','states'] loop insert into boards(project_id,kind) values(pid,k); end loop;
 else raise exception 'Unknown action';
 end case;
 update projects set version=version+1,updated_at=now() where id=pid returning * into p;
 result=jsonb_build_object('project',to_jsonb(p),'board',case when b.id is null then null else to_jsonb(b) end);
 insert into audit_events(project_id,actor_id,type,metadata) values(pid,actor,action,jsonb_build_object('boardId',b.id));
 insert into commands values(pid,command_key,action,result);
 return result;
end $$;
revoke all on function public.project_command(uuid,text,jsonb,integer,uuid) from public;
grant execute on function public.project_command(uuid,text,jsonb,integer,uuid) to authenticated;

-- Called only after Stripe signature validation and session reconciliation.
create or replace function public.record_payment(event_id text, session_id text,pid uuid, payment_kind text, amount integer,currency_code text) returns void language plpgsql security definer set search_path=public as $$
declare p projects; expected_amount integer;
begin
 select * into p from projects where id=pid for update;
 if p.id is null then raise exception 'Unknown project'; end if;
 if exists(select 1 from payment_events where id=event_id) then return; end if;
 if exists(select 1 from payments where id=session_id) then insert into payment_events(id) values(event_id) on conflict do nothing; return; end if;
 expected_amount=case payment_kind when 'initial' then case when p.package='FIRST' then 19900 else 20000 end when 'final' then 130000 when 'revision' then 15000 when 'page' then 18000 else null end;
 if expected_amount is null or amount<>expected_amount or currency_code<>'aud' then raise exception 'Payment amount mismatch'; end if;
 if payment_kind='initial' then
  if p.phase<>'AWAITING_INITIAL_PAYMENT' then raise exception 'Invalid initial payment state'; end if;
  update projects set phase='DIRECTION',initial_paid_at=now() where id=pid;
 elsif payment_kind='final' then
  if p.phase<>'APPROVED_AWAITING_FINAL_PAYMENT' then raise exception 'Approval required'; end if;
  update projects set phase='LAUNCH',final_paid_at=now() where id=pid;
 elsif payment_kind='revision' then update projects set revision_limit=revision_limit+1 where id=pid;
 end if;
 insert into payments(id,project_id,kind,amount,currency) values(session_id,pid,payment_kind,amount,currency_code);
 insert into payment_events(id) values(event_id);
 update projects set version=version+1 where id=pid;
 insert into audit_events(project_id,type,metadata) values(pid,'payment_confirmed',jsonb_build_object('kind',payment_kind,'amount',amount));
end $$;
revoke all on function public.record_payment(text,text,uuid,text,integer,text) from public,authenticated,anon;
grant execute on function public.record_payment(text,text,uuid,text,integer,text) to service_role;

create or replace function public.record_subscription(sid text,pid uuid,new_status text,event_time bigint) returns void language plpgsql security definer set search_path=public as $$
begin
 perform 1 from projects where id=pid for update;
 insert into subscriptions(id,project_id,status,event_created) values(sid,pid,new_status,event_time)
 on conflict(id) do update set status=excluded.status,event_created=excluded.event_created where subscriptions.event_created<=excluded.event_created;
 update projects set pro=exists(select 1 from subscriptions where project_id=pid and status in ('active','trialing')),version=version+1 where id=pid;
end $$;
revoke all on function public.record_subscription(text,uuid,text,bigint) from public,authenticated,anon;
grant execute on function public.record_subscription(text,uuid,text,bigint) to service_role;

insert into storage.buckets(id,name,public,file_size_limit) values('project-assets','project-assets',false,26214400) on conflict(id) do nothing;
-- No anonymous storage policies. Upload and read routes authorize and proxy private assets.
-- Supabase projects may grant broad default table privileges. Narrow them explicitly.
revoke all on public.projects,public.boards,public.assets,public.audit_events,public.commands,public.payments,public.payment_events,public.integration_receipts,public.subscriptions from anon,authenticated;
grant select on public.projects,public.boards,public.assets,public.audit_events,public.payments,public.integration_receipts,public.subscriptions to authenticated;
grant insert(owner_id) on public.projects to authenticated;
grant all on all tables in schema public to service_role;
create table public.checkout_intents(project_id uuid not null references public.projects(id),kind text not null,key uuid not null default gen_random_uuid(),session_id text,expires_at timestamptz not null default now()+interval '1 hour',primary key(project_id,kind));
alter table public.checkout_intents enable row level security;
revoke all on public.checkout_intents from anon,authenticated;
grant all on public.checkout_intents to service_role;
create or replace function public.reserve_checkout(pid uuid,payment_kind text) returns jsonb language plpgsql security definer set search_path=public as $$
declare p projects; i checkout_intents;
begin
 select * into p from projects where id=pid for update;
 if auth.uid() is null or p.owner_id<>auth.uid() or p.id is null then raise exception 'Access denied'; end if;
 if not ((payment_kind='initial' and p.phase='AWAITING_INITIAL_PAYMENT') or (payment_kind='final' and p.phase='APPROVED_AWAITING_FINAL_PAYMENT') or (payment_kind='revision' and p.phase='REVIEW' and p.revision_used>=p.revision_limit) or (payment_kind='pro' and p.phase='LIVE' and not p.pro)) then raise exception 'Payment unavailable'; end if;
 select * into i from checkout_intents where project_id=pid and kind=payment_kind;
 if i.project_id is null then insert into checkout_intents(project_id,kind) values(pid,payment_kind) returning * into i; end if;
 return to_jsonb(i);
end $$;
revoke all on function public.reserve_checkout(uuid,text) from public;
grant execute on function public.reserve_checkout(uuid,text) to authenticated;
create or replace function public.rotate_checkout(pid uuid,payment_kind text,old_key uuid) returns void language plpgsql security definer set search_path=public as $$ begin update checkout_intents set key=gen_random_uuid(),session_id=null,expires_at=now()+interval '1 hour' where project_id=pid and kind=payment_kind and key=old_key;end $$;
revoke all on function public.rotate_checkout(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.rotate_checkout(uuid,text,uuid) to service_role;
