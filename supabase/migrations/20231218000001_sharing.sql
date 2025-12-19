-- Add public_link_expired_at to folders
alter table public.folders add column if not exists public_link_expired_at timestamp with time zone;

-- Update RLS policies to allow public access to shared items
-- 1. Folders
create policy "Allow public access to shared folders"
on public.folders
for select
using (public_link_expired_at > now());

-- 2. Files
create policy "Allow public access to shared files"
on public.files
for select
using (public_link_expired_at > now());
