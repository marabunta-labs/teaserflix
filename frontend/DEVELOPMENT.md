# TeaserFlix — Development Guide

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router) | SSR metadata for SEO, simple file-based routing |
| Language | TypeScript 5 | End-to-end type safety |
| Styling | Tailwind CSS v4 | Utility-first, no runtime |
| Animations | Framer Motion 12 | Gesture physics for swipes |
| Video | react-player 3 | YouTube IFrame API abstraction |
| Auth + DB | Supabase | Instant Postgres + Auth, generous free tier |
| Movie data | TMDB API | Comprehensive, free tier |
| Analytics | Vercel Analytics | Zero-config, privacy-friendly |
| Deployment | Vercel | CI/CD on push, edge network |

---

This document covers everything you need to run and develop TeaserFlix locally.

---

## Prerequisites

| Tool | Minimum version |
|---|---|
| Node.js | 18 |
| npm | 9 |
| Git | any |

You also need accounts (free tiers are sufficient):
- [TMDB](https://developer.themoviedb.org) — for movie data and trailers
- [Supabase](https://supabase.com) — for auth and the database

---

## 1. Clone and install

```bash
git clone https://github.com/your-org/teaserflix.git
cd teaserflix/frontend
npm install
```

---

## 2. Environment variables

Copy the example file and fill in your credentials:

```bash
cp .env.example .env.local
```

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_TMDB_API_KEY` | TMDB dashboard → **API Read Access Token** (the long JWT, not the short API Key) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project → Settings → API → `anon` public key |

> **Note on TMDB auth:** TeaserFlix uses Bearer token authentication (`Authorization: Bearer <token>`). Use the **Read Access Token** (the long `eyJ…` JWT), not the short API Key.

---

## 3. Database setup

TeaserFlix needs a few tables in Supabase. Run the schema in the Supabase SQL editor:

1. Open your Supabase project → **SQL Editor**
2. Paste the contents of `../database/schema.sql`
3. Click **Run**

The schema creates: `profiles`, `interactions`, `likes`, `watchlist`.

Enable Row Level Security (RLS) as defined in the schema — each user can only read and write their own rows.

### Enable Google OAuth (optional)

1. Supabase project → Authentication → Providers → Google
2. Add your Google OAuth Client ID and Secret
3. Set the redirect URL in Google Cloud Console to:
   `https://<your-supabase-project>.supabase.co/auth/v1/callback`

---

## 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The app uses [Next.js Fast Refresh](https://nextjs.org/docs/architecture/fast-refresh) — most changes are reflected instantly without losing component state.

---

## 5. Project layout

```
frontend/
├── app/
│   ├── page.tsx              # Main feed — TrailerCard + TeaserflixFeed
│   ├── layout.tsx            # Root layout, global SEO metadata
│   ├── globals.css           # Tailwind v4 imports + custom utilities
│   ├── sitemap.ts            # Auto-generated /sitemap.xml
│   ├── robots.ts             # /robots.txt
│   ├── components/
│   │   ├── ClientProviders.tsx   # Wraps LanguageProvider + any future providers
│   │   └── MovieInfoPanel.tsx    # Bottom-sheet detail panel
│   ├── auth/callback/page.tsx    # Supabase OAuth callback handler
│   ├── login/page.tsx
│   ├── profile/page.tsx
│   ├── onboarding/page.tsx
│   ├── terms/page.tsx
│   └── privacy/page.tsx
├── lib/
│   ├── tmdb.ts               # TMDB API client — all fetch functions
│   ├── supabase.ts           # Supabase client singleton
│   ├── recommender.ts        # On-device scoring engine
│   └── i18n.tsx              # Language context + EN/ES translations
└── public/
    ├── logo.png              # App logo (also used as Apple touch icon)
    └── og-image.png          # Open Graph image for social sharing
```

---

## 6. Key architecture decisions

### Viewport height on iOS
`window.innerHeight` is used instead of `100dvh` to avoid the "next card peeking" issue when Safari's address bar is visible. A `--app-height` CSS variable is set on `<html>` and updated on resize. All full-screen containers use `style={{ height: 'var(--app-height, 100dvh)' }}`.

### TMDB language switch
Changing locale calls `setTmdbLanguage(locale)` (updates a module-level variable) then patches titles/overviews for current feed cards via `fetchMovieTitles`. The feed does **not** reload — only strings update in place.

### Trailer removal
If a TMDB movie has no YouTube trailer, the card calls `onNoTrailer(movieId)` which removes it from the `movies` array. No UI flash — the card is simply gone before the user scrolls to it.

### Recommendation engine
`lib/recommender.ts` is a pure-function scoring system that requires no server roundtrip. Interactions are recorded locally and persisted to Supabase for logged-in users.

---

## 7. Build and lint

```bash
# Type check
npx tsc --noEmit

# Lint
npm run lint

# Production build (runs locally)
npm run build
npm start
```

---

## 8. Deployment

The app deploys to Vercel automatically on push to `main`. No manual steps needed beyond initial project setup:

1. Import the `teaserflix/frontend` directory in Vercel (use **Root Directory** = `frontend`)
2. Add the three environment variables from step 2 above
3. Deploy

The `metadataBase` in `app/layout.tsx` points to `https://teaserflix.vercel.app` — update it if you use a custom domain.

---

## 9. Adding translations

All UI strings live in `lib/i18n.tsx`. The `en` object is the source of truth; `es` is typed as `typeof en` so TypeScript will error on any missing key.

1. Add the key to `en`
2. Add the Spanish equivalent to `es`
3. Use it via `const { t } = useTranslation()` → `t.section.key`

---

## 10. Environment variable example

Create this file as `.env.example` at the root of `frontend/`:

```env
NEXT_PUBLIC_TMDB_API_KEY=eyJhbGciOiJIUzI1NiJ9...   # TMDB Read Access Token
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
