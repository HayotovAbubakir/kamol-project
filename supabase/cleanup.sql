-- =============================================================================
-- KAMOL PROJECT — ma'lumotlarni to'liq tozalash
-- Fayl: supabase/cleanup.sql
-- =============================================================================
--
-- QACHON ISHLATILADI:
--   • Barcha demo / test ma'lumotlarini o'chirish
--   • Production yoki dev bazani noldan boshlash
--   • Login muammolaridan keyin bazani tozalash
--
-- OLDIN (majburiy):
--   1) supabase/schema.sql ni Supabase SQL Editor da ishga tushiring
--   2) Keyin shu cleanup.sql ni ishga tushiring
--
-- NATIJA:
--   • Loyihalar, ishchilar, to'lovlar, izohlar, bildirishnomalar,
--     reyting, oylik g'oliblar va ishchi javoblari o'chiriladi
--   • app_settings jadvali saqlanadi (founded_year tozalanadi)
--   • Eski test ishchi (worker / Test Worker) qayta yaratilmaydi
--
-- KEYIN (saytda):
--   1) Dev server bo'lsa — qayta ishga tushiring yoki 15 soniya kuting (cache)
--   2) Login: admin / admin123
--      (users jadvali bo'sh bo'lsa, birinchi so'rovda admin avtomatik yaratiladi)
--   3) Yangi ishchilarni: Admin → Ishchilar sahifasidan qo'shing
--
-- Production (Cloudflare Workers):
--   • Faqat Supabase tozalanadi — Cloudflare env o'zgaruvchilari saqlanadi
--   • D1 kerak emas
--
-- DIQQAT: bu amal qaytarib bo'lmaydi!
-- =============================================================================

begin;

-- Sayt ishlatadigan jadvallar (schema.sql bilan mos, FK tartibida)
do $$
declare
  ordered_tables text[] := array[
    'project_comments',      -- loyiha izohlari (admin → ishchi)
    'payments',              -- to'lovlar / avans
    'worker_replies',        -- qaytarilgan loyihaga ishchi javobi
    'rating_entries',        -- reyting ballari
    'notifications',         -- bildirishnomalar
    'monthly_winner_views',  -- oylik tabrik ko'rildi
    'used_congrats_combos',  -- tabrik matnlari kombinatsiyasi
    'monthly_winners',       -- oylik TOP 1-2-3
    'monthly_settlements',   -- oylik yakun
    'projects',              -- loyihalar (pending, in_progress, pending_review, ...)
    'users'                  -- admin va ishchilar
  ];
  t text;
  truncate_list text := '';
  missing_tables text[] := array[]::text[];
  expected text;
begin
  -- Mavjud jadvallarni FK-xavfsiz tartibda truncate qilish
  foreach t in array ordered_tables loop
    if exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = t
    ) then
      truncate_list := truncate_list || format('public.%I, ', t);
    end if;
  end loop;

  if truncate_list = '' then
    raise exception
      'Tozalash uchun jadval topilmadi. Avval supabase/schema.sql ni Supabase SQL Editor da ishga tushiring.';
  end if;

  truncate_list := rtrim(truncate_list, ', ');
  execute 'truncate table ' || truncate_list || ' cascade';
  raise notice 'Tozalandi: %', truncate_list;

  -- schema.sql da bo'lishi kerak bo'lgan jadvallar tekshiruvi
  foreach expected in array ordered_tables loop
    if not exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = expected
    ) then
      missing_tables := array_append(missing_tables, expected);
    end if;
  end loop;

  if array_length(missing_tables, 1) is not null then
    raise warning 'Quyidagi jadvallar bazada yo''q (schema.sql ni qayta ishga tushiring): %',
      array_to_string(missing_tables, ', ');
  end if;
end $$;

-- app_settings — bitta qator, loyiha versiyasi saqlanadi
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'app_settings'
  ) then
    insert into public.app_settings (id, founded_year, version, updated_at)
    values (1, null, 2, now())
    on conflict (id) do update
    set founded_year = null,
        version = 2,
        updated_at = now();
    raise notice 'app_settings yangilandi (founded_year = null, version = 2)';
  else
    raise warning 'app_settings jadvali topilmadi. schema.sql ni ishga tushiring.';
  end if;
end $$;

-- Eski, saytda ishlatilmaydigan jadval
drop table if exists public.weekly_leaderboard_archive;

commit;

-- Tekshiruv: mavjud jadvallardagi qatorlar soni (app_settings dan tashqari)
do $$
declare
  check_tables text[] := array[
    'users', 'projects', 'payments', 'notifications', 'rating_entries',
    'project_comments', 'worker_replies', 'monthly_winners', 'monthly_settlements',
    'monthly_winner_views', 'used_congrats_combos'
  ];
  t text;
  n bigint;
begin
  foreach t in array check_tables loop
    if exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = t
    ) then
      execute format('select count(*) from public.%I', t) into n;
      raise notice 'Tekshiruv: % = % qator', t, n;
    end if;
  end loop;
end $$;
