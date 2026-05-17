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

// Scoring weights — mirror the SQL function in schema.sql
const SCORE = {
  interested: 15,
  full_watch: 8,
  fast_scroll: -5,
  per_20s: 1, // +1 per 20 s of watch time (capped at +5 before "full watch")
} as const;

function calcScore(d: Pick<InteractionData, "watch_time" | "is_fast_scroll" | "is_full_watch" | "is_interested">): number {
  if (d.is_interested) return SCORE.interested;
  if (d.is_full_watch) return SCORE.full_watch;
  if (d.is_fast_scroll) return SCORE.fast_scroll;
  return Math.min(5, Math.floor(d.watch_time / 20) * SCORE.per_20s);
}

export class Recommender {
  /** Genre score map: genre_id → cumulative score */
  private genreScores: Record<number, number> = {};
  /** Set of movie IDs already shown to the user (to avoid repeats) */
  private seenIds = new Set<number>();
  private userId: string | null;

  private static readonly GUEST_SEEN_KEY = "teaserflix_seen_ids";

  constructor(userId: string | null, initialGenres: number[] = []) {
    this.userId = userId;
    // Seed with preferred genres from the onboarding step
    for (const gid of initialGenres) {
      this.genreScores[gid] = (this.genreScores[gid] ?? 0) + 10;
    }
    // Restore guest seen-IDs from localStorage
    if (!userId && typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(Recommender.GUEST_SEEN_KEY);
        if (raw) {
          const ids: number[] = JSON.parse(raw);
          ids.forEach((id) => this.seenIds.add(id));
          console.log(`[Recommender] Restored ${ids.length} guest seen-IDs from localStorage`);
        }
      } catch {
        // ignore corrupt data
      }
    }
    console.log(
      `[Recommender] Init userId=${userId ?? "guest"} seedGenres=[${initialGenres.join(",")}]`,
    );
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

  /**
   * Record an interaction and update genre scores.
   * Called immediately when the user leaves a card.
   */
  recordInteraction(data: InteractionData) {
    const delta = calcScore(data);
    for (const gid of data.genre_ids) {
      this.genreScores[gid] = (this.genreScores[gid] ?? 0) + delta;
    }
    this.seenIds.add(data.movie_id);
    console.log(
      `[Recommender] movie=${data.movie_id} genres=[${data.genre_ids}] ` +
        `watchTime=${data.watch_time.toFixed(1)}s fastScroll=${data.is_fast_scroll} ` +
        `fullWatch=${data.is_full_watch} interested=${data.is_interested} ` +
        `scoreDelta=${delta} | topGenres=[${this.getTopGenres(5).join(",")}]`,
    );
  }

  /**
   * Returns the top-N genre IDs by score (only positive scores).
   * Used to build TMDB discover queries.
   */
  getTopGenres(n = 5): number[] {
    return Object.entries(this.genreScores)
      .sort(([, a], [, b]) => b - a)
      .filter(([, score]) => score > 0)
      .slice(0, n)
      .map(([gid]) => Number(gid));
  }

  /** True once we have enough signal to do genre-based discovery */
  hasEnoughSignal(): boolean {
    return this.getTopGenres(2).length >= 2;
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
    } else {
      console.log(`[Recommender] Persisted interaction for movie ${data.movie_id}`);
    }
  }

  /**
   * Load the user's interaction history from Supabase.
   * Rebuilds the genre score map and the seen-movies set from past data.
   * Call once after auth is confirmed.
   */
  async loadHistoryFromSupabase(): Promise<void> {
    if (!this.userId) return;
    const { data, error } = await supabase
      .from("interactions")
      .select("movie_id, genre_ids, watch_time, is_fast_scroll, is_full_watch, is_interested")
      .eq("user_id", this.userId)
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      console.error("[Recommender] Failed to load history:", error.message);
      return;
    }

    for (const row of data ?? []) {
      this.seenIds.add(row.movie_id);
      const delta = calcScore({
        watch_time: row.watch_time ?? 0,
        is_fast_scroll: row.is_fast_scroll ?? false,
        is_full_watch: row.is_full_watch ?? false,
        is_interested: row.is_interested ?? false,
      });
      for (const gid of row.genre_ids ?? []) {
        this.genreScores[gid] = (this.genreScores[gid] ?? 0) + delta;
      }
    }
    console.log(
      `[Recommender] Loaded history: ${data?.length ?? 0} interactions, ` +
        `${this.seenIds.size} seen movies, topGenres=[${this.getTopGenres(5).join(",")}]`,
    );
  }
}
