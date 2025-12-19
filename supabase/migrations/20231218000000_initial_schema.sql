-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Folders table
create table public.folders (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    parent_id uuid references public.folders(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    is_deleted boolean not null default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Files table
create table public.files (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    folder_id uuid references public.folders(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    type text not null, -- extension/mime type
    size bigint not null,
    uuid_r2 uuid unique not null default uuid_generate_v4(), -- The actual path in R2
    is_deleted boolean not null default false,
    public_link_expired_at timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. File History table (for auto-saves and manual saves)
create table public.file_versions (
    id uuid primary key default uuid_generate_v4(),
    file_id uuid not null references public.files(id) on delete cascade,
    uuid_r2 uuid not null, -- path to this version's content in R2
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    version_type text not null check (version_type in ('auto', 'manual', 'close'))
);

-- 4. Enable RLS
alter table public.folders enable row level security;
alter table public.files enable row level security;
alter table public.file_versions enable row level security;

-- 5. RLS Policies for Folders
create policy "Users can only access their own folders"
on public.folders
for all
using (auth.uid() = user_id);

-- 6. RLS Policies for Files
create policy "Users can only access their own files"
on public.files
for all
using (auth.uid() = user_id);

-- 7. RLS Policies for File Versions
create policy "Users can only access their own file versions"
on public.file_versions
for all
using (
    exists (
        select 1 from public.files
        where files.id = file_versions.file_id
        and files.user_id = auth.uid()
    )
);

-- 8. Functions for automatic updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger set_folders_updated_at
before update on public.folders
for each row execute procedure public.handle_updated_at();

create trigger set_files_updated_at
before update on public.files
for each row execute procedure public.handle_updated_at();
