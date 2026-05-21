<p align="center">
  <img src="frontend/public/logo.png" alt="TeaserFlix" width="300" />
</p>

<h1 align="center">TeaserFlix</h1>

<p align="center">
  Discover movies through their trailers.<br/>
  An infinite, personalised trailer feed that works like TikTok but for cinema.
</p>

<p align="center">
  <a href="https://teaserflix.vercel.app">teaserflix.vercel.app</a>
  &nbsp;·&nbsp;
  <a href="https://marabunta-labs.vercel.app/">Marabunta Labs</a>
  &nbsp;·&nbsp;
  <a href="LICENSE">MIT License</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" />
  <img src="https://img.shields.io/badge/React-19-61dafb?logo=react" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript" />
  <img src="https://img.shields.io/badge/Supabase-2-3ecf8e?logo=supabase" />
  <img src="https://img.shields.io/badge/Vercel-deployed-black?logo=vercel" />
</p>

---

## What it does

TeaserFlix lets you scroll through movie trailers one at a time and decide instantly whether a film interests you. It remembers your reactions to surface more of what you like, and lets you save anything to a watchlist you can revisit later.

**For users:**
- Scroll through trailers without having to search for anything
- Tap like ❤️ or swipe right to bookmark 🔖
- Filter by streaming platform (Netflix, Prime, Max…) or genre
- Switch between Spanish and English at any time
- Share any trailer with a single tap
- Works on mobile and desktop

**For developers:**
- Clean Next.js App Router codebase with TypeScript and Tailwind v4
- On-device recommendation engine with no external ML dependency
- Supabase for auth, watchlist, and interaction persistence
- TMDB API for movie data

---

## Features

### Gesture controls
| Gesture | Action |
|---|---|
| Tap center | Play / Pause |
| Double tap | Like ❤️ |
| Tap left third | Seek back 10 s |
| Tap right third | Seek forward 10 s |
| Long press | 2× speed |
| Swipe right | Save to watchlist |
| Drag progress bar | Seek to position |

### Keyboard controls (desktop)
| Key | Action |
|---|---|
| ↑ / ↓ | Previous / next movie |
| Space | Play / Pause |
| ← / → | Seek ±10 s |

### Feed & discovery
- Infinite scroll with snap — no pagination UI
- Variety algorithm mixing trending, popular, and genre-targeted content
- Real-time search with poster grid
- Platform and genre filters with active chips
- Movies without trailers silently removed from feed
- Cards preloaded in a configurable window (default ±2)

### Info panel
- Full cast, runtime, rating, overview
- Similar movies
- Watchlist CTA with auth guard
- Opens via tap on title/description in feed, or via `/?play={id}` deep link

### Auth
- Email/password sign-in, sign-up, and **forgot password** flow
- Google OAuth
- Guest mode — no account required; preferences and seen-movies persist in `localStorage`
- Personalised onboarding (genre + platform preferences)

### Mobile-first
- Accurate viewport height via `window.innerHeight` CSS variable — no next-card peek on iOS Safari
- `viewport-fit=cover` + `safe-area-inset-*` for notch and Dynamic Island
- Progress bar always visible above browser chrome
- Low Power Mode resilience (external pause syncs state; single tap resumes)


## License

MIT © 2026 [Marabunta Labs](https://marabunta-labs.vercel.app/)

Movie data provided by [The Movie Database (TMDB)](https://www.themoviedb.org).
This product uses the TMDB API but is not endorsed or certified by TMDB.
Trailers served via YouTube and subject to [YouTube's Terms of Service](https://www.youtube.com/t/terms).
