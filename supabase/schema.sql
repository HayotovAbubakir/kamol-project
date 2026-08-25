-- KAMOL PROJECT — Supabase schema (yagona SQL fayl)
-- Supabase SQL Editor da butun faylni ishga tushiring.
-- Mavjud bazada xavfsiz yangilash uchun idempotent (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password text not null,
  name text not null,
  role text not null check (role in ('admin', 'worker')),
  telegram_id text,
  phone text,
  created_at timestamptz not null default now()
);

create index if not exists idx_users_role on public.users(role);

alter table public.users add column if not exists created_by uuid references public.users(id) on delete set null;
create index if not exists idx_users_created_by on public.users(created_by);

-- ---------------------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------------------
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
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'pending_review', 'completed', 'rejected', 'returned')),
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
create index if not exists idx_projects_returned_at on public.projects(returned_at desc nulls last);
create index if not exists idx_projects_status_order_date on public.projects(status, order_date desc);
create index if not exists idx_projects_assigned_status on public.projects(assigned_to, status)
  where assigned_to is not null;

-- Qidiruv maydonlari (ism, manzil, telefon) — pg_trgm bilan tez qidiruv
create extension if not exists pg_trgm;
create index if not exists idx_projects_client_name_trgm
  on public.projects using gin (client_name gin_trgm_ops);
create index if not exists idx_projects_address_trgm
  on public.projects using gin (address gin_trgm_ops);
create index if not exists idx_projects_title_trgm
  on public.projects using gin (title gin_trgm_ops);
create index if not exists idx_projects_phone_trgm
  on public.projects using gin (phone gin_trgm_ops)
  where phone is not null;

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now(),
  read boolean not null default false,
  type text not null default 'info' check (type in ('info', 'warning', 'danger')),
  project_id uuid references public.projects(id) on delete cascade,
  event text
);

create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_created_at on public.notifications(created_at desc);
create index if not exists idx_notifications_user_created on public.notifications(user_id, created_at desc);
create index if not exists idx_notifications_project_id on public.notifications(project_id)
  where project_id is not null;

-- ---------------------------------------------------------------------------
-- App settings (single row)
-- ---------------------------------------------------------------------------
create table if not exists public.app_settings (
  id int primary key default 1 check (id = 1),
  founded_year int,
  version int not null default 2,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (id, founded_year, version)
values (1, null, 2)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Rating entries
-- ---------------------------------------------------------------------------
create table if not exists public.rating_entries (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  points integer not null,
  type text not null default 'completion'
    check (type in (
      'completion',
      'rejection',
      'completion_reversed',
      'admin_comment_positive',
      'admin_comment_negative'
    )),
  created_at timestamptz not null default now()
);

create index if not exists idx_rating_entries_worker on public.rating_entries(worker_id);
create index if not exists idx_rating_entries_created on public.rating_entries(created_at);
create index if not exists idx_rating_entries_project on public.rating_entries(project_id);

-- ---------------------------------------------------------------------------
-- Project comments (admin → worker, one per project)
-- ---------------------------------------------------------------------------
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
create unique index if not exists idx_comments_one_per_project on public.project_comments(project_id);

-- ---------------------------------------------------------------------------
-- Payments
-- ---------------------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  amount integer not null check (amount > 0),
  paid_at timestamptz not null default now(),
  note text
);

create index if not exists idx_payments_project on public.payments(project_id);
create index if not exists idx_payments_paid_at on public.payments(paid_at desc);

-- ---------------------------------------------------------------------------
-- Worker replies (returned project response)
-- ---------------------------------------------------------------------------
create table if not exists public.worker_replies (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  worker_id uuid not null references public.users(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_worker_replies_project on public.worker_replies(project_id);
create index if not exists idx_worker_replies_created on public.worker_replies(created_at desc);

-- ---------------------------------------------------------------------------
-- Monthly winners & congrats
-- ---------------------------------------------------------------------------
create table if not exists public.monthly_winners (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.users(id) on delete cascade,
  month text not null,
  rank integer not null check (rank in (1, 2, 3)),
  total_points integer not null default 0,
  created_at timestamptz not null default now(),
  unique (worker_id, month)
);

create table if not exists public.used_congrats_combos (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.users(id) on delete cascade,
  rank integer not null check (rank in (1, 2, 3)),
  a_index integer not null,
  b_index integer not null,
  c_index integer not null,
  month text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_used_congrats_combos_worker
  on public.used_congrats_combos(worker_id, created_at);

create table if not exists public.monthly_settlements (
  id uuid primary key default gen_random_uuid(),
  month text not null unique,
  settled_at timestamptz not null default now()
);

create table if not exists public.monthly_winner_views (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.users(id) on delete cascade,
  month text not null,
  seen_at timestamptz not null default now(),
  unique (worker_id, month)
);

-- ---------------------------------------------------------------------------
-- Login locks (server-side IP block — never stored in the browser)
-- ---------------------------------------------------------------------------
create table if not exists public.login_locks (
  lock_key text primary key,
  fail_count int not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Device sessions (hashed IP only — never exposed to the client)
-- ---------------------------------------------------------------------------
create table if not exists public.device_sessions (
  user_id uuid primary key references public.users(id) on delete cascade,
  ip_hash text not null,
  last_seen_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security (service role only — app uses service_role key)
-- ---------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.login_locks enable row level security;
alter table public.device_sessions enable row level security;
alter table public.projects enable row level security;
alter table public.notifications enable row level security;
alter table public.app_settings enable row level security;
alter table public.rating_entries enable row level security;
alter table public.project_comments enable row level security;
alter table public.payments enable row level security;
alter table public.worker_replies enable row level security;
alter table public.monthly_winners enable row level security;
alter table public.used_congrats_combos enable row level security;
alter table public.monthly_settlements enable row level security;
alter table public.monthly_winner_views enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'users' and policyname = 'service_role_users'
  ) then
    create policy "service_role_users" on public.users
      for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'projects' and policyname = 'service_role_projects'
  ) then
    create policy "service_role_projects" on public.projects
      for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'notifications' and policyname = 'service_role_notifications'
  ) then
    create policy "service_role_notifications" on public.notifications
      for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'app_settings' and policyname = 'service_role_settings'
  ) then
    create policy "service_role_settings" on public.app_settings
      for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'rating_entries' and policyname = 'service_role_rating_entries'
  ) then
    create policy "service_role_rating_entries" on public.rating_entries
      for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'project_comments' and policyname = 'service_role_comments'
  ) then
    create policy "service_role_comments" on public.project_comments
      for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'payments' and policyname = 'service_role_payments'
  ) then
    create policy "service_role_payments" on public.payments
      for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'worker_replies' and policyname = 'service_role_worker_replies'
  ) then
    create policy "service_role_worker_replies" on public.worker_replies
      for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'monthly_winners' and policyname = 'service_role_monthly_winners'
  ) then
    create policy "service_role_monthly_winners" on public.monthly_winners
      for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'used_congrats_combos' and policyname = 'service_role_used_congrats_combos'
  ) then
    create policy "service_role_used_congrats_combos" on public.used_congrats_combos
      for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'monthly_settlements' and policyname = 'service_role_monthly_settlements'
  ) then
    create policy "service_role_monthly_settlements" on public.monthly_settlements
      for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'monthly_winner_views' and policyname = 'service_role_monthly_winner_views'
  ) then
    create policy "service_role_monthly_winner_views" on public.monthly_winner_views
      for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'login_locks' and policyname = 'service_role_login_locks'
  ) then
    create policy "service_role_login_locks" on public.login_locks
      for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'device_sessions' and policyname = 'service_role_device_sessions'
  ) then
    create policy "service_role_device_sessions" on public.device_sessions
      for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Migrations (mavjud bazalar uchun — xavfsiz yangilash)
-- ---------------------------------------------------------------------------

-- Eski street/house_number/apartment → address
do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'projects' and column_name = 'street'
  ) then
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'projects' and column_name = 'address'
    ) then
      alter table public.projects add column address text not null default '';
    end if;
    update public.projects
    set address = concat(street, ', ', house_number)
    where address = '' or address is null;
    alter table public.projects drop column street;
    alter table public.projects drop column house_number;
    alter table public.projects drop column if exists apartment;
  end if;
end $$;

alter table public.users add column if not exists phone text;

do $$ begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'projects') then
    alter table public.projects add column if not exists phone text;
    alter table public.projects add column if not exists price numeric;
    alter table public.projects add column if not exists advance_paid boolean not null default false;
    alter table public.projects add column if not exists advance_amount numeric;
    alter table public.projects add column if not exists assigned_at timestamptz;
    alter table public.projects add column if not exists returned_at timestamptz;
  end if;
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'notifications') then
    alter table public.notifications add column if not exists event text;
  end if;
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'project_comments') then
    alter table public.project_comments add column if not exists updated_at timestamptz;
  end if;
end $$;

-- Status check yangilash
do $$ begin
  alter table public.projects drop constraint if exists projects_status_check;
  alter table public.projects add constraint projects_status_check
    check (status in ('pending', 'in_progress', 'pending_review', 'completed', 'rejected', 'returned'));
exception when others then null;
end $$;

-- Rating type check yangilash
do $$ begin
  alter table public.rating_entries drop constraint if exists rating_entries_type_check;
  alter table public.rating_entries add constraint rating_entries_type_check
    check (type in (
      'completion',
      'rejection',
      'completion_reversed',
      'admin_comment_positive',
      'admin_comment_negative'
    ));
exception when others then null;
end $$;

-- Bir loyihada bitta izoh qoldirish (duplikatlarni tozalash)
do $$ begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'project_comments'
  ) then
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
  end if;
end $$;

-- Eski, ishlatilmaydigan jadval (saytda yo'q)
drop table if exists public.weekly_leaderboard_archive;
