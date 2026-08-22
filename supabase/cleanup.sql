-- KAMOL PROJECT — to'liq ma'lumotlarni tozalash
-- Supabase SQL Editor da ishga tushiring.
--
-- MUHIM: avval schema.sql ni ishga tushiring (jadvalar yaratilishi kerak).
-- Agar "relation does not exist" xatosi chiqsa — schema.sql ni birinchi bo'lib run qiling.
--
-- NATIJA: mavjud jadvallardagi barcha ma'lumotlar o'chiriladi.
-- Keyin:
--   1) Dev serverni qayta ishga tushiring (yoki 15 soniya kuting — cache yangilanadi)
--   2) Admin → Sozlamalar → "Ma'lumotlarni tiklash" (/api/setup)
--      orqali faqat admin (admin / admin123) yaratiladi. Ishchilar admin paneldan qo'shiladi.
-- Eski data/store.json bo'lsa — o'chiring yoki setup tugmasini bosing (avtomatik tozalanadi).
--
-- DIQQAT: bu amal qaytarib bo'lmaydi!

begin;

-- Faqat mavjud jadvallarni tozalash (yo'q jadval uchun xato bermaydi)
do $$
declare
  truncate_list text;
  known_tables text[] := array[
    'project_comments',
    'payments',
    'worker_replies',
    'rating_entries',
    'notifications',
    'monthly_winner_views',
    'used_congrats_combos',
    'monthly_winners',
    'monthly_settlements',
    'projects',
    'users'
  ];
begin
  select string_agg(format('public.%I', t.table_name), ', ' order by t.table_name)
  into truncate_list
  from information_schema.tables t
  where t.table_schema = 'public'
    and t.table_name = any (known_tables);

  if truncate_list is not null then
    execute 'truncate table ' || truncate_list || ' cascade';
    raise notice 'Tozalandi: %', truncate_list;
  else
    raise notice 'Tozalash uchun jadval topilmadi. Avval schema.sql ni ishga tushiring.';
  end if;
end $$;

-- Sozlamalarni boshlang'ich holatga (jadval bo'lsa)
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'app_settings'
  ) then
    update public.app_settings
    set founded_year = null, version = 2, updated_at = now()
    where id = 1;

    insert into public.app_settings (id, founded_year, version)
    values (1, null, 2)
    on conflict (id) do update
    set founded_year = excluded.founded_year,
        version = excluded.version,
        updated_at = now();
  end if;
end $$;

-- Eski jadval qolgan bo'lsa
drop table if exists public.weekly_leaderboard_archive;

commit;
