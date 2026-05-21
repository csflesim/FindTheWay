-- Find the Way Art Studio — initial schema
-- Run in Supabase dashboard → SQL Editor → New query, then paste and execute.

-- ============================================================================
-- 1. Profiles (extends auth.users with role for CMS access)
-- ============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'member' check (role in ('member', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_self_select"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_self_update"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- 2. Contact form submissions
-- ============================================================================
create table if not exists public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.contact_submissions enable row level security;

-- Anyone (including anon) may submit.
create policy "contact_insert_any"
  on public.contact_submissions for insert
  with check (true);

-- Only admins can read submissions.
create policy "contact_select_admin"
  on public.contact_submissions for select
  using (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  ));

-- ============================================================================
-- 3. Artworks (portfolio)
-- ============================================================================
create table if not exists public.artworks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  image_url text not null,
  category text,
  sort_order integer not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.artworks enable row level security;

-- Public can read published artworks.
create policy "artworks_select_published"
  on public.artworks for select
  using (published = true);

-- Admins can do anything.
create policy "artworks_admin_all"
  on public.artworks for all
  using (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  ))
  with check (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  ));

-- ============================================================================
-- 4. Storage bucket for artwork images
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('artworks', 'artworks', true)
on conflict (id) do nothing;

create policy "artworks_storage_public_read"
  on storage.objects for select
  using (bucket_id = 'artworks');

create policy "artworks_storage_admin_write"
  on storage.objects for insert
  with check (
    bucket_id = 'artworks' and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );
