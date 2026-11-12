// Group swipe sessions ("party"), backed by Supabase.
// Guests are anonymous: the session code is the shared secret and each device
// identifies itself with a random voter_id kept in localStorage.

import { supabase } from "./supabase";
import { fetchDiscoverRaw, type TMDBMovie } from "./tmdb";

export interface PartyMovie {
  id: number;
  title: string;
  poster_path: string | null;
  year: string;
  overview: string;
  vote_average: number;
}

export interface PartyFilters {
  genres: number[];
  platforms: number[];
  minYear: number | null;
  maxYear: number | null;
  minRating: number;
  count: number;
}

export interface PartyState {
  code: string;
  status: "open" | "closed";
  movies: PartyMovie[];
  participants: { voter_id: string; finished: boolean }[];
  votes: { voter_id: string; movie_id: number; liked: boolean }[];
}

export interface PartyMatch {
  movie: PartyMovie;
  likes: number;
}

const VOTER_KEY = "teaserflix_voter_id";
// No 0/O/1/I so the code is easy to read out loud
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function getVoterId(): string {
  try {
    let id = localStorage.getItem(VOTER_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VOTER_KEY, id);
    }
    return id;
  } catch {
    return Math.random().toString(36).slice(2);
  }
}

function randomCode(): string {
  let out = "";
  for (let i = 0; i < 5; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function toPartyMovie(m: TMDBMovie): PartyMovie {
  return {
    id: m.id,
    title: m.title,
    poster_path: m.poster_path,
    year: m.release_date?.slice(0, 4) ?? "",
    overview: m.overview ?? "",
    vote_average: m.vote_average ?? 0,
  };
}

/** Build a frozen deck from the filters (two discover pages, shuffled). */
export async function buildDeck(filters: PartyFilters): Promise<PartyMovie[]> {
  const p: Record<string, string> = {
    sort_by: "popularity.desc",
    "vote_count.gte": "200",
  };
  if (filters.genres.length) p.with_genres = filters.genres.join("|");
  if (filters.platforms.length) {
    p.with_watch_providers = filters.platforms.join("|");
    p.watch_region = "ES";
    p.with_watch_monetization_types = "flatrate";
  }
  if (filters.minYear) p["primary_release_date.gte"] = `${filters.minYear}-01-01`;
  if (filters.maxYear) p["primary_release_date.lte"] = `${filters.maxYear}-12-31`;
  if (filters.minRating > 0) p["vote_average.gte"] = String(filters.minRating);

  const pages = await Promise.all([1, 2, 3].map((page) => fetchDiscoverRaw({ ...p, page: String(page) })));
  const seen = new Set<number>();
  const pool: PartyMovie[] = [];
  for (const { results } of pages) {
    for (const m of results) {
      if (!seen.has(m.id)) {
        seen.add(m.id);
        pool.push(toPartyMovie(m));
      }
    }
  }
  return shuffle(pool).slice(0, filters.count);
}

/** Create a session and return its code. */
export async function createParty(filters: PartyFilters, movies: PartyMovie[]): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    const { error } = await supabase.from("party_sessions").insert({ code, filters, movies });
    if (!error) return code;
    if (error.code !== "23505") throw error; // anything but "code already taken"
  }
  throw new Error("Could not allocate a session code");
}

export async function joinParty(code: string, voterId: string): Promise<void> {
  const { error } = await supabase
    .from("party_participants")
    .upsert({ code, voter_id: voterId }, { onConflict: "code,voter_id", ignoreDuplicates: true });
  if (error) throw error;
}

export async function castVote(code: string, voterId: string, movieId: number, liked: boolean): Promise<void> {
  const { error } = await supabase
    .from("party_votes")
    .upsert({ code, voter_id: voterId, movie_id: movieId, liked }, { onConflict: "code,voter_id,movie_id" });
  if (error) throw error;
}

export async function finishVoting(code: string, voterId: string): Promise<void> {
  const { error } = await supabase
    .from("party_participants")
    .update({ finished: true })
    .eq("code", code)
    .eq("voter_id", voterId);
  if (error) throw error;
}

export async function closeParty(code: string): Promise<void> {
  const { error } = await supabase.from("party_sessions").update({ status: "closed" }).eq("code", code);
  if (error) throw error;
}

/** Returns null when the session doesn't exist. */
export async function fetchParty(code: string): Promise<PartyState | null> {
  const [session, participants, votes] = await Promise.all([
    supabase.from("party_sessions").select("code,status,movies").eq("code", code).maybeSingle(),
    supabase.from("party_participants").select("voter_id,finished").eq("code", code),
    supabase.from("party_votes").select("voter_id,movie_id,liked").eq("code", code),
  ]);
  if (session.error) throw session.error;
  if (!session.data) return null;
  return {
    code: session.data.code,
    status: session.data.status,
    movies: session.data.movies as PartyMovie[],
    participants: participants.data ?? [],
    votes: votes.data ?? [],
  };
}

/**
 * Movies liked by every participant come first ("full matches");
 * otherwise rank by how many participants liked each movie.
 */
export function computeMatches(state: PartyState): { full: PartyMatch[]; partial: PartyMatch[]; total: number } {
  const total = state.participants.length;
  const likes = new Map<number, number>();
  for (const v of state.votes) {
    if (v.liked) likes.set(v.movie_id, (likes.get(v.movie_id) ?? 0) + 1);
  }
  const ranked: PartyMatch[] = state.movies
    .map((movie) => ({ movie, likes: likes.get(movie.id) ?? 0 }))
    .filter((m) => m.likes > 0)
    .sort((a, b) => b.likes - a.likes || b.movie.vote_average - a.movie.vote_average);
  const full = total > 0 ? ranked.filter((m) => m.likes === total) : [];
  const partial = ranked.filter((m) => m.likes < total || total === 0).slice(0, 5);
  return { full, partial, total };
}
