// Client-side recommendation engine.
// Runs entirely in the browser — no server round-trip needed for scoring.
// For logged-in users, interactions are also persisted to Supabase so the
// algorithm improves across sessions.

import { supabase } from "./supabase";

export interface InteractionData {
  movie_id: number;
  genre_ids: number[];
  watch_time: number;    // seconds actually watched
  is_fast_scroll: boolean; // left within 2 s
  is_full_watch: boolean;  // trailer played to the end
  is_interested: boolean;  // liked or bookmarked
}

// Scoring weights — mirror the SQL function in schema.sql, plus a soft
// negative for cards abandoned after a few seconds.
const SCORE = {
  interested: 15,
  full_watch: 8,
  fast_scroll: -6, // left within 2 s: clear "not for me"
  brief_skip: -2,  // left within 5 s
} as const;

const SEED_GENRE_SCORE = 10;       // onboarding preferences
const RECENCY_HALF_LIFE_DAYS = 30; // old taste counts less
const MIN_RECENCY_WEIGHT = 0.15;
const AFFINITY_SMOOTHING = 2;      // pulls genres with little evidence towards 0
const AVOID_AFFINITY = -2;
const AVOID_MIN_EVIDENCE = 3;

/** Everything we know about one movie, merged across repeated views. */
interface MovieSignal {
  genres: number[];
  interested: boolean; // liked or bookmarked (sticky)
  fullWatch: boolean;
  maxWatch: number;    // longest watch, seconds
  fast: boolean;       // was ever scrolled past in < 2 s
  at: number;          // timestamp of the latest event (ms)
}

function movieScore(m: MovieSignal): number {
  if (m.interested) return SCORE.interested;
  if (m.fullWatch) return SCORE.full_watch;
  if (m.maxWatch >= 60) return 5;
  if (m.maxWatch >= 30) return 3;
  if (m.maxWatch >= 10) return 1;
  if (m.fast && m.maxWatch < 2) return SCORE.fast_scroll;
  if (m.maxWatch > 0 && m.maxWatch < 5) return SCORE.brief_skip;
  return 0;
}

function recencyWeight(at: number): number {
  const ageDays = Math.max(0, (Date.now() - at) / 86_400_000);
  return Math.max(MIN_RECENCY_WEIGHT, Math.pow(0.5, ageDays / RECENCY_HALF_LIFE_DAYS));
}

export class Recommender {
  /** One merged signal per movie: repeated views or a like never double-count */
  private signals = new Map<number, MovieSignal>();
  /** Movies known to be liked/bookmarked but without genre info (from likes/watchlist tables) */
  private knownLikedIds = new Set<number>();
  /** Genres picked during onboarding */
  private seedGenres: number[];
  /** Set of movie IDs already shown to the user (to avoid repeats) */
  private seenIds = new Set<number>();
  private userId: string | null;

  private static readonly GUEST_SEEN_KEY = "teaserflix_seen_ids";

  constructor(userId: string | null, initialGenres: number[] = []) {
    this.userId = userId;
    this.seedGenres = initialGenres;
    // Restore guest seen-IDs from localStorage
    if (!userId && typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(Recommender.GUEST_SEEN_KEY);
        if (raw) {
          const ids: number[] = JSON.parse(raw);
          ids.forEach((id) => this.seenIds.add(id));
        }
      } catch {
        // ignore corrupt data
      }
    }
  }

  // ─── In-memory tracking ────────────────────────────────────

  markSeen(movieId: number) {
    this.seenIds.add(movieId);
    // Persist to localStorage for guest users so seen-IDs survive page reloads
    if (!this.userId && typeof window !== "undefined") {
      try {
        const ids = Array.from(this.seenIds).slice(-500); // keep last 500
        localStorage.setItem(Recommender.GUEST_SEEN_KEY, JSON.stringify(ids));
      } catch {
        // ignore quota errors
      }
    }
  }

  hasSeen(movieId: number): boolean {
    return this.seenIds.has(movieId);
  }

  getSeenIds(): Set<number> {
    return this.seenIds;
  }

  private ingest(data: InteractionData, at: number) {
    const prev = this.signals.get(data.movie_id);
    this.signals.set(data.movie_id, {
      genres: data.genre_ids.length ? data.genre_ids : (prev?.genres ?? []),
      interested: (prev?.interested ?? false) || data.is_interested,
      fullWatch: (prev?.fullWatch ?? false) || data.is_full_watch,
      maxWatch: Math.max(prev?.maxWatch ?? 0, data.watch_time),
      fast: (prev?.fast ?? false) || data.is_fast_scroll,
      at: Math.max(prev?.at ?? 0, at),
    });
  }

  /** Record an interaction. Called when the user leaves a card or likes/saves one. */
  recordInteraction(data: InteractionData) {
    this.ingest(data, Date.now());
    this.seenIds.add(data.movie_id);
  }

  // ─── Taste model ───────────────────────────────────────────

  /**
   * Genre affinity = recency-weighted average reaction to movies of that genre
   * (not a raw sum), so a genre you see often but keep skipping can't win just
   * by volume, and one you always engage with rises quickly.
   */
  private genreAffinities(): { genre: number; affinity: number; count: number }[] {
    const acc = new Map<number, { sum: number; count: number }>();
    const add = (g: number, value: number) => {
      const e = acc.get(g) ?? { sum: 0, count: 0 };
      e.sum += value;
      e.count += 1;
      acc.set(g, e);
    };
    for (const g of this.seedGenres) add(g, SEED_GENRE_SCORE);
    for (const m of this.signals.values()) {
      const score = movieScore(m) * recencyWeight(m.at);
      for (const g of m.genres) add(g, score);
    }
    return Array.from(acc, ([genre, { sum, count }]) => ({
      genre,
      count,
      affinity: sum / (count + AFFINITY_SMOOTHING),
    }));
  }

  /** Top-N genres the user actually engages with (positive affinity only). */
  getTopGenres(n = 5): number[] {
    return this.genreAffinities()
      .filter((g) => g.affinity > 0)
      .sort((a, b) => b.affinity - a.affinity)
      .slice(0, n)
      .map((g) => g.genre);
  }

  /** Genres the user repeatedly scrolls past, with enough evidence to be sure. */
  getAvoidedGenres(): number[] {
    const top = new Set(this.getTopGenres(3));
    return this.genreAffinities()
      .filter((g) => g.affinity <= AVOID_AFFINITY && g.count >= AVOID_MIN_EVIDENCE && !top.has(g.genre))
      .map((g) => g.genre);
  }

  /**
   * Movies the user clearly enjoyed (liked, saved or watched to the end),
   * best and most recent first. Used to ask TMDB for "more like this".
   */
  getSeedMovieIds(n = 10): number[] {
    const ranked = Array.from(this.signals, ([id, m]) => ({ id, value: movieScore(m) * recencyWeight(m.at) }))
      .filter((m) => m.value >= 4)
      .sort((a, b) => b.value - a.value)
      .map((m) => m.id);
    const extra = Array.from(this.knownLikedIds).filter((id) => !ranked.includes(id));
    return [...ranked, ...extra].slice(0, n);
  }

  /** True once we have enough signal to personalise the feed */
  hasEnoughSignal(): boolean {
    return this.getTopGenres(2).length >= 2 || this.getSeedMovieIds(1).length > 0;
  }

  // ─── Supabase persistence ──────────────────────────────────

  /** Persist a single interaction to Supabase (logged-in users only) */
  async persistInteraction(data: InteractionData): Promise<void> {
    if (!this.userId) return;
    const { error } = await supabase.from("interactions").insert({
      user_id: this.userId,
      movie_id: data.movie_id,
      genre_ids: data.genre_ids,
      watch_time: Math.round(data.watch_time),
      is_fast_scroll: data.is_fast_scroll,
      is_full_watch: data.is_full_watch,
      is_interested: data.is_interested,
    });
    if (error) {
      console.error("[Recommender] Failed to persist interaction:", error.message);
    }
  }

  /**
   * Load the user's interaction history from Supabase.
   * Rebuilds the genre score map and the seen-movies set from past data.
   * Call once after auth is confirmed.
   */
  async loadHistoryFromSupabase(): Promise<void> {
    if (!this.userId) return;
    const [interactions, likes, watchlist] = await Promise.all([
      supabase
        .from("interactions")
        .select("movie_id, genre_ids, watch_time, is_fast_scroll, is_full_watch, is_interested, created_at")
        .eq("user_id", this.userId)
        .order("created_at", { ascending: false })
        .limit(500),
      supabase.from("likes").select("movie_id").eq("user_id", this.userId),
      supabase.from("watchlist").select("movie_id").eq("user_id", this.userId),
    ]);

    if (interactions.error) {
      console.error("[Recommender] Failed to load history:", interactions.error.message);
      return;
    }

    for (const row of interactions.data ?? []) {
      this.seenIds.add(row.movie_id);
      this.ingest(
        {
          movie_id: row.movie_id,
          genre_ids: row.genre_ids ?? [],
          watch_time: row.watch_time ?? 0,
          is_fast_scroll: row.is_fast_scroll ?? false,
          is_full_watch: row.is_full_watch ?? false,
          is_interested: row.is_interested ?? false,
        },
        row.created_at ? new Date(row.created_at).getTime() : Date.now(),
      );
    }

    // Likes and saves are the strongest signal; older builds never copied them into `interactions`
    for (const row of [...(likes.data ?? []), ...(watchlist.data ?? [])]) {
      this.seenIds.add(row.movie_id);
      const known = this.signals.get(row.movie_id);
      if (known) known.interested = true;
      else this.knownLikedIds.add(row.movie_id);
    }
  }
}
