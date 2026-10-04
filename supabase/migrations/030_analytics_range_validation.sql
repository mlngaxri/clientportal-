-- Reject null analytics ranges explicitly. SQL `NOT IN` yields NULL for a NULL operand,
-- so the original guard allowed a null range to bypass validation.
create or replace function public.analytics_summary(pid uuid, days integer) returns jsonb
language plpgsql security definer set search_path=public as $$
declare result jsonb; entitled boolean; since timestamptz=now()-make_interval(days=>days);
 previous_start timestamptz=now()-make_interval(days=>days*2);
begin
 if auth.uid() is null or not public.can_access(pid) then raise exception 'Project not found or access denied'; end if;
 if days is null or days not in (7,30,90) then raise exception 'Invalid analytics range'; end if;
 select pro into entitled from projects where id=pid;
 if days=90 and not entitled then raise exception 'Pro is required for 90-day analytics'; end if;
 select jsonb_build_object('views',count(*) filter(where kind='pageview'),'visitors',count(distinct visitor) filter(where kind='pageview'),'actions',count(*) filter(where kind='cta'),'forms',(select count(*) from form_submissions where project_id=pid and created_at>=since)) into result from analytics_events where project_id=pid and created_at>=since;
 result=result||jsonb_build_object(
  'daily',coalesce((select jsonb_agg(t) from (select date_trunc('day',created_at)::date as date,count(*) filter(where kind='pageview') as views from analytics_events where project_id=pid and created_at>=since group by 1 order by 1) t),'[]'::jsonb),
  'pages',coalesce((select jsonb_agg(t) from (select page_id as page,count(*) as views from analytics_events where project_id=pid and created_at>=since and kind='pageview' group by 1 order by 2 desc) t),'[]'::jsonb),
  'sources',coalesce((select jsonb_agg(t) from (select source,count(*) as views from analytics_events where project_id=pid and created_at>=since and kind='pageview' group by 1 order by 2 desc) t),'[]'::jsonb),
  'devices',coalesce((select jsonb_agg(t) from (select device,count(*) as views from analytics_events where project_id=pid and created_at>=since and kind='pageview' group by 1 order by 2 desc) t),'[]'::jsonb));
 return result||jsonb_build_object('pro',entitled,'comparison',case when entitled then (select jsonb_build_object('views',count(*) filter(where kind='pageview'),'visitors',count(distinct visitor) filter(where kind='pageview'),'actions',count(*) filter(where kind='cta'),'forms',(select count(*) from form_submissions where project_id=pid and created_at>=previous_start and created_at<since)) from analytics_events where project_id=pid and created_at>=previous_start and created_at<since) else null end,'countries',case when entitled then coalesce((select jsonb_agg(t) from (select coalesce(country,'Unknown') as country,count(*) as views from analytics_events where project_id=pid and created_at>=since and kind='pageview' group by 1 order by 2 desc) t),'[]'::jsonb) else null end,'pageActions',case when entitled then coalesce((select jsonb_agg(t) from (select page_id as page,count(*) as actions from analytics_events where project_id=pid and created_at>=since and kind='cta' group by 1 order by 2 desc) t),'[]'::jsonb) else null end);
end $$;
