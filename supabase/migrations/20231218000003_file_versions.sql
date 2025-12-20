create table file_versions (
    id uuid default gen_random_uuid() primary key,
    file_id uuid references files(id) on delete cascade not null,
    content text not null,
    created_at timestamptz default now() not null,
    is_auto_save boolean default false
);

create index idx_file_versions_file_id on file_versions(file_id);

-- Add RLS policies
alter table file_versions enable row level security;

create policy "Users can view versions of their own files"
    on file_versions for select
    using ( exists ( select 1 from files where files.id = file_versions.file_id and files.user_id = auth.uid() ) );

create policy "Users can insert versions for their own files"
    on file_versions for insert
    with check ( exists ( select 1 from files where files.id = file_versions.file_id and files.user_id = auth.uid() ) );

create policy "Users can delete versions of their own files"
    on file_versions for delete
    using ( exists ( select 1 from files where files.id = file_versions.file_id and files.user_id = auth.uid() ) );
