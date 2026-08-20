-- KAMOL PROJECT — Supabase schema (yagona SQL fayl)
-- Supabase SQL Editor da butun faylni ishga tushiring

create extension if not exists "pgcrypto";

-- Users
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password text not null,
  name text not null,
  role text not null check (role in ('admin', 'worker')),
  telegram_id text,
  created_at timestamptz not null default now()
);

-- Projects
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  client_name text not null,
  address text not null default '',
  phone text,
  price numeric,
  advance_paid boolean not null default false,
  advance_amount numeric,
  order_date timestamptz not null default now(),
  assigned_to uuid references public.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed', 'rejected', 'returned')),
  completed_at timestamptz,
  assigned_at timestamptz,
  returned_at timestamptz,
  description text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_projects_assigned_to on public.projects(assigned_to);
create index if not exists idx_projects_status on public.projects(status);
create index if not exists idx_projects_order_date on public.projects(order_date desc);

-- Notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now(),
  read boolean not null default false,
  type text not null default 'info' check (type in ('info', 'warning', 'danger')),
  project_id uuid references public.projects(id) on delete cascade
);

create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_created_at on public.notifications(created_at desc);
alter table public.notifications add column if not exists event text;

-- App settings (single row)
create table if not exists public.app_settings (
  id int primary key default 1 check (id = 1),
  founded_year int,
  version int not null default 2,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (id, founded_year, version)
values (1, null, 2)
on conflict (id) do nothing;

-- RLS
alter table public.users enable row level security;
alter table public.projects enable row level security;
alter table public.notifications enable row level security;
alter table public.app_settings enable row level security;

-- Service role policies
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'service_role_users') then
    create policy "service_role_users" on public.users
      for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
  end if;
  if not exists (select 1 from pg_policies where policyname = 'service_role_projects') then
    create policy "service_role_projects" on public.projects
      for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
  end if;
  if not exists (select 1 from pg_policies where policyname = 'service_role_notifications') then
    create policy "service_role_notifications" on public.notifications
      for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
  end if;
  if not exists (select 1 from pg_policies where policyname = 'service_role_settings') then
    create policy "service_role_settings" on public.app_settings
      for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
  end if;
end $$;

-- Migration: eski street/house_number/apartment -> address
do $$ begin
  if exists (select 1 from information_schema.columns where table_name = 'projects' and column_name = 'street') then
    if not exists (select 1 from information_schema.columns where table_name = 'projects' and column_name = 'address') then
      alter table public.projects add column address text not null default '';
    end if;
    update public.projects set address = concat(street, ', ', house_number) where address = '' or address is null;
    alter table public.projects drop column street;
    alter table public.projects drop column house_number;
    alter table public.projects drop column if exists apartment;
  end if;
end $$;

-- Yangi ustunlar (agar yo'q bo'lsa)
alter table public.projects add column if not exists phone text;
alter table public.projects add column if not exists price numeric;
alter table public.projects add column if not exists advance_paid boolean not null default false;
alter table public.projects add column if not exists advance_amount numeric;
alter table public.projects add column if not exists assigned_at timestamptz;
-- Admin qaytarganda: loyiha jarayonga qaytadi, returned_at vaqti saqlanadi
alter table public.projects add column if not exists returned_at timestamptz;

create index if not exists idx_projects_returned_at on public.projects(returned_at desc nulls last);

-- Status check ni "rejected" qo'shish uchun yangilash
do $$ begin
  alter table public.projects drop constraint if exists projects_status_check;
  alter table public.projects add constraint projects_status_check
    check (status in ('pending', 'in_progress', 'completed', 'rejected', 'returned'));
exception when others then null;
end $$;

-- Rating entries
create table if not exists public.rating_entries (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  points integer not null,
  type text not null default 'completion',
  created_at timestamptz not null default now()
);

do $$ begin
  alter table public.rating_entries drop constraint if exists rating_entries_type_check;
  alter table public.rating_entries add constraint rating_entries_type_check
    check (type in ('completion', 'rejection', 'admin_comment_positive', 'admin_comment_negative'));
exception when others then null;
end $$;

create index if not exists idx_rating_entries_worker on public.rating_entries(worker_id);
create index if not exists idx_rating_entries_created on public.rating_entries(created_at);

-- Weekly leaderboard archive
create table if not exists public.weekly_leaderboard_archive (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.users(id) on delete cascade,
  week_start_date date not null,
  total_points integer not null default 0,
  rank integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_weekly_archive_week on public.weekly_leaderboard_archive(week_start_date);

-- Project comments (admin only)
create table if not exists public.project_comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  worker_id uuid not null references public.users(id) on delete cascade,
  author_id uuid not null references public.users(id) on delete cascade,
  text text not null,
  sentiment text not null check (sentiment in ('positive', 'negative')),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists idx_comments_worker on public.project_comments(worker_id);

-- RLS for new tables
alter table public.rating_entries enable row level security;
alter table public.weekly_leaderboard_archive enable row level security;
alter table public.project_comments enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'service_role_rating_entries') then
    create policy "service_role_rating_entries" on public.rating_entries
      for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
  end if;
  if not exists (select 1 from pg_policies where policyname = 'service_role_comments') then
    create policy "service_role_comments" on public.project_comments
      for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
  end if;
  if not exists (select 1 from pg_policies where policyname = 'service_role_weekly_archive') then
    create policy "service_role_weekly_archive" on public.weekly_leaderboard_archive
      for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
  end if;
end $$;

-- Migrations for existing databases
alter table public.project_comments add column if not exists updated_at timestamptz;

-- Bir loyihada bir nechta izoh bo'lsa, eng so'nggisini qoldirish
with ranked as (
  select
    id,
    row_number() over (
      partition by project_id
      order by coalesce(updated_at, created_at) desc, created_at desc, id desc
    ) as rn
  from public.project_comments
)
delete from public.project_comments
where id in (select id from ranked where rn > 1);

create unique index if not exists idx_comments_one_per_project on public.project_comments(project_id);
  