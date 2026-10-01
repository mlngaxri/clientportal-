-- Shared across Vercel instances. Only backend service credentials may use counters.
create table if not exists public.request_limits (
  bucket text primary key,
  hits integer not null default 0 check (hits >= 0),
  resets_at timestamptz not null
);
alter table public.request_limits enable row level security;
revoke all on public.request_limits from public, anon, authenticated;
create or replace function public.consume_request_limit(p_bucket text, p_limit integer, p_window integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.request_limits;
begin
 if length(p_bucket) not between 1 and 160 or p_limit not between 1 and 10000 or p_window not between 1 and 86400 then
  raise exception 'Invalid rate limit configuration';
 end if;
 insert into public.request_limits(bucket,hits,resets_at)
 values(p_bucket,1,now()+make_interval(secs => p_window))
 on conflict(bucket) do update set
  hits=case when request_limits.resets_at<=now() then 1 else least(request_limits.hits+1,p_limit+1) end,
  resets_at=case when request_limits.resets_at<=now() then now()+make_interval(secs => p_window) else request_limits.resets_at end
 returning * into r;
 -- Bounded opportunistic cleanup, no client access to the hashed buckets.
 delete from public.request_limits where bucket in (select bucket from public.request_limits where resets_at<now()-interval '1 day' limit 100);
 return jsonb_build_object('allowed',r.hits<=p_limit,'retryAfter',greatest(1,ceil(extract(epoch from r.resets_at-now()))::integer));
end $$;
revoke all on function public.consume_request_limit(text,integer,integer) from public, anon, authenticated;
grant execute on function public.consume_request_limit(text,integer,integer) to service_role;
