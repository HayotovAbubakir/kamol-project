# KAMOL PROJECT

Arxitektura studiyasi uchun loyiha boshqaruv tizimi — buyurtmalarni ishchilarga taqsimlash, muddat nazorati va Telegram bot integratsiyasi.

## 🚀 Imkoniyatlar

- **Admin paneli (Control Room)** — buyurtmalarni qo'shish, ishchilarga biriktirish, random taqsimlash
- **Ishchi paneli (Site Desk)** — faqat o'z loyihalarini ko'rish va tugallash
- **Muddat ranglari** — 1-2 kun yashil, 3 kun sariq, 4+ kun qizil
- **Bildirishnomalar** — yangi buyurtmalar, muddat ogohlantirishlari
- **Telegram bot** — ishchilar holati, loyihalar, manzillar
- **3 ta dizayn mavzusi** — Editorial Office (login), Control Room (admin), Site Desk (ishchi)

## 🛠️ O'rnatish

### 1. Loyihani o'rnatish

```bash
npm install
```

### 2. Supabase sozlash

1. [supabase.com](https://supabase.com) da yangi loyiha yarating
2. **SQL Editor** da `supabase/schema.sql` faylini ishga tushiring
3. **Project Settings → API** dan quyidagilarni oling:
   - Project URL
   - `service_role` key (maxfiy — faqat serverda ishlatiladi)

### 3. Muhit o'zgaruvchilari

`.env.local` fayl yarating (`.env.example` dan nusxa oling):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

> **Eslatma:** Agar `data/store.json` mavjud bo'lsa, birinchi ishga tushirishda ma'lumotlar avtomatik Supabase ga ko'chiriladi.

### 4. Ishga tushirish

```bash
npm run dev
```

Brauzerda oching: [http://localhost:5173](http://localhost:5173)

## 👤 Test akkauntlar

| Rol | Login | Parol |
|-----|-------|-------|
| Admin | admin | admin123 |
| Ishchi | worker | worker123 |

> Yangi ishchilarni admin panel orqali qo'shing (`/admin/workers`).

## 📁 Loyiha tuzilmasi

```
kamol-project/
├── supabase/
│   └── schema.sql          # Supabase jadval sxemasi
├── data/                   # Eski JSON (avtomatik migratsiya)
├── public/                 # Statik fayllar
├── src/
│   ├── app/
│   │   ├── admin/          # Admin paneli
│   │   ├── worker/         # Ishchi paneli
│   │   ├── api/            # Backend API
│   │   ├── layout.tsx
│   │   └── page.tsx        # Login sahifasi
│   ├── components/         # UI komponentlar
│   ├── lib/                # Yordamchi funksiyalar
│   └── types/              # TypeScript tiplar
├── telegram-bot/           # Telegram bot skripti
├── next.config.mjs
├── tailwind.config.ts
└── package.json
```

## 🤖 Telegram Bot

1. [@BotFather](https://t.me/BotFather) dan bot yarating
2. `.env.local` faylga qo'shing:

```
TELEGRAM_BOT_TOKEN=your_bot_token_here
API_BASE=http://localhost:5173
```

3. Botni ishga tushiring:

```bash
npm run bot
```

**Buyruqlar:**
- `/start` — Boshlash
- `/status` — Barcha ishchilar holati
- `/my` — Mening loyihalarim
- `/help` — Yordam

## 📦 Skriptlar

- `npm run dev` — Dev server (port 5173)
- `npm run build` — Production build
- `npm run start` — Production server
- `npm run lint` — ESLint tekshiruvi
- `npm run bot` — Telegram bot

## 🎨 Dizayn mavzulari

| Bo'lim | Mavzu | Ranglar |
|--------|-------|---------|
| Login | Editorial Office | Krem #EFEDE6, Yashil #58715F |
| Admin | Control Room | Qora-ko'k #07111E, Moviy #56D9FF |
| Ishchi | Site Desk | Bej #D8C8B6, Qizil #BB2D1E |

Built with ❤️ — KAMOL PROJECT

## 📤 GitHub ga yuklash

1. [GitHub](https://github.com) da yangi **private** repository yarating (masalan: `kamol-project`).
2. Loyiha papkasida:

```bash
git init
git add .
git commit -m "Initial commit: KAMOL project management"
git branch -M main
git remote add origin https://github.com/SIZNING-USERNAME/kamol-project.git
git push -u origin main
```

3. **Muhim:** `.env.local` va `data/store.json` hech qachon yuklanmaydi (`.gitignore` da).
4. Production (Vercel yoki boshqa hosting):
   - Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   - Build: `npm run build` → Start: `npm run start`

## ⚡ Tezlik

- Admin va ishchi paneli bitta `/api/admin/bootstrap` va `/api/worker/bootstrap` so'rovi bilan yuklanadi
- Ma'lumotlar bazasi cache 15 soniya saqlanadi
- Supabase yozuvlari faqat o'zgargan jadvallarga sync qilinadi
- Bildirishnomalar fon tabda kamroq yangilanadi (5s / 30s)
