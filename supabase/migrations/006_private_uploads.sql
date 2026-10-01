-- Direct signed uploads are quarantined until the server validates their bytes.
create table if not exists public.asset_uploads (
 id uuid primary key, project_id uuid not null references public.projects(id),
 storage_key text not null unique, name text not null, mime text not null,
 bytes bigint not null check(bytes > 0 and bytes <= 1073741824),
 created_at timestamptz not null default now()
);
alter table public.asset_uploads enable row level security;
revoke all on public.asset_uploads from anon, authenticated;
grant all on public.asset_uploads to service_role;
-- Server UPLOAD_MAX_BYTES must not exceed the storage bucket limit.
update storage.buckets set file_size_limit = 1073741824 where id = 'project-assets';
