create function public.reserve_site_domain(pid uuid,host text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare d site_domains;
begin
 perform 1 from projects where id=pid for update;
 if auth.uid() is null or not public.can_access(pid) then raise exception 'Project not found or access denied'; end if;
 if host<>lower(host) or length(host)>253 or host !~ '^([a-z0-9][a-z0-9-]*\.)+[a-z][a-z0-9-]+$' then raise exception 'Invalid domain name'; end if;
 select * into d from site_domains where hostname=host;
 if d.hostname is not null then if d.project_id<>pid then raise exception 'Domain is unavailable'; end if;return to_jsonb(d); end if;
 if (select count(*) from site_domains where project_id=pid)>=5 then raise exception 'Choose one of your saved domains. Contact Fourthform to change existing requests'; end if;
 insert into site_domains(hostname,project_id) values(host,pid) returning * into d;
 return to_jsonb(d);
end $$;
revoke all on function public.reserve_site_domain(uuid,text) from public,anon;
grant execute on function public.reserve_site_domain(uuid,text) to authenticated;
create function public.connect_site_domain(pid uuid,host text) returns void
language plpgsql security definer set search_path=public as $$
begin
 perform 1 from projects where id=pid for update;
 if not exists(select 1 from site_domains where project_id=pid and hostname=host and status in ('owned','connected')) then raise exception 'Domain ownership has not been verified'; end if;
 update site_domains set status='owned' where project_id=pid and status='connected' and hostname<>host;
 update site_domains set status='connected',verified_at=now() where project_id=pid and hostname=host;
 update projects set live_url='https://'||host where id=pid and phase='LIVE';
 delete from integration_receipts where project_id=pid and kind='domain';
end $$;
revoke all on function public.connect_site_domain(uuid,text) from public,anon,authenticated;
grant execute on function public.connect_site_domain(uuid,text) to service_role;
create or replace function public.resolve_public_domain(host text) returns uuid language sql stable security definer set search_path=public as $$
 select d.project_id from site_domains d join projects p on p.id=d.project_id where d.hostname=lower(host) and d.status='connected' and p.phase in ('LIVE','LAUNCH')
$$;
