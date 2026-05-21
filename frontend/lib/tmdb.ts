// TMDB API abstraction layer
const BASE = "https://api.themoviedb.org/3";
const KEY = () => process.env.NEXT_PUBLIC_TMDB_API_KEY ?? "";

// Language used for all TMDB requests — call setTmdbLanguage() when locale changes
let _tmdbLang = "es-ES";
export function setTmdbLanguage(locale: "en" | "es") {
  _tmdbLang = locale === "en" ? "en-US" : "es-ES";
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TMDBMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  genre_ids: number[];
  popularity: number;
  vote_average: number;
  vote_count: number;
  release_date: string;
  adult: boolean;
}

export interface TMDBCastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

export interface TMDBProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}

export interface TMDBMovieDetails {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  genres: { id: number; name: string }[];
  runtime: number | null;
  tagline: string | null;
  vote_average: number;
  release_date: string;
  adult: boolean;
  cast: TMDBCastMember[];
  providers: TMDBProvider[]; // flatrate for region ES
  similar: TMDBMovie[];
}

export interface TMDBPersonDetails {
  id: number;
  name: string;
  biography: string | null;
  profile_path: string | null;
  birthday: string | null;
  place_of_birth: string | null;
  known_for_department: string;
  movies: TMDBMovie[];
}

// ─── Core fetch ───────────────────────────────────────────────────────────────

async function tmdbFetch(path: string): Promise<any> {
  const sep = path.includes("?") ? "&" : "?";
  const url = `${BASE}${path}${sep}api_key=${KEY()}&language=${_tmdbLang}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`[TMDB] ${res.status} ${res.statusText} — ${path}`);
    return {};
  }
  return res.json();
}

/** Filter out adult movies and those without a poster */
function filterSafe(movies: any[]): TMDBMovie[] {
  return (movies ?? []).filter((m) => !m.adult && m.poster_path);
}

// ─── Feed fetchers ────────────────────────────────────────────────────────────

export async function fetchPopularMovies(page = 1): Promise<TMDBMovie[]> {
  console.log(`[TMDB] fetchPopular page=${page}`);
  const data = await tmdbFetch(`/movie/popular?page=${page}`);
  return filterSafe(data.results);
}

export async function fetchTrendingMovies(page = 1): Promise<TMDBMovie[]> {
  console.log(`[TMDB] fetchTrending page=${page}`);
  const data = await tmdbFetch(`/trending/movie/week?page=${page}`);
  return filterSafe(data.results);
}

/**
 * Unified discover endpoint.
 * genreIds and providerIds are OR-logic (any match).
 * Falls back to popular when both arrays are empty.
 */
export async function fetchDiscoverWithFilters(
  genreIds: number[],
  providerIds: number[],
  page = 1,
  region = "ES",
): Promise<TMDBMovie[]> {
  if (genreIds.length === 0 && providerIds.length === 0) {
    return fetchPopularMovies(page);
  }
  const p: Record<string, string> = {
    sort_by: "popularity.desc",
    page: String(page),
    "vote_count.gte": "50",
    include_adult: "false",
  };
  if (genreIds.length > 0) p.with_genres = genreIds.join("|");
  if (providerIds.length > 0) {
    p.with_watch_providers = providerIds.join("|");
    p.watch_region = region;
  }
  const qs = new URLSearchParams(p).toString();
  console.log(`[TMDB] discover genres=[${genreIds}] providers=[${providerIds}] page=${page}`);
  const data = await tmdbFetch(`/discover/movie?${qs}`);
  return filterSafe(data.results);
}

/** Convenience wrapper for genre-only discovery */
export async function fetchDiscoverByGenres(
  genreIds: number[],
  page = 1,
): Promise<TMDBMovie[]> {
  return fetchDiscoverWithFilters(genreIds, [], page);
}

// ─── Movie details (cast + providers + similar) ───────────────────────────────

export async function fetchMovieDetails(
  movieId: number,
): Promise<TMDBMovieDetails | null> {
  try {
    const [movie, credits, providers, similar] = await Promise.all([
      tmdbFetch(`/movie/${movieId}`),
      tmdbFetch(`/movie/${movieId}/credits`),
      tmdbFetch(`/movie/${movieId}/watch/providers`),
      tmdbFetch(`/movie/${movieId}/similar?page=1`),
    ]);
    return {
      ...movie,
      cast: ((credits.cast ?? []) as any[])
        .filter((m: any) => m.profile_path)
        .slice(0, 8),
      providers: (providers.results?.ES?.flatrate ?? []).slice(0, 6),
      similar: filterSafe(similar.results).slice(0, 8),
    };
  } catch (e) {
    console.error(`[TMDB] fetchMovieDetails(${movieId}) error:`, e);
    return null;
  }
}

// ─── Search ───────────────────────────────────────────────────────────────────

export async function searchMovies(
  query: string,
  page = 1,
): Promise<TMDBMovie[]> {
  if (!query.trim()) return [];
  console.log(`[TMDB] search "${query}" page=${page}`);
  const data = await tmdbFetch(
    `/search/movie?query=${encodeURIComponent(query)}&page=${page}&include_adult=false`,
  );
  return filterSafe(data.results);
}

// ─── Trailer key ──────────────────────────────────────────────────────────────

export async function fetchMovieTrailerKey(
  movieId: number,
): Promise<string | null> {
  try {
    const data = await tmdbFetch(`/movie/${movieId}/videos`);
    const trailer = (data.results ?? []).find(
      (v: any) => v.type === "Trailer" && v.site === "YouTube",
    );
    return trailer?.key ?? null;
  } catch {
    return null;
  }
}

/** Fetch title + overview for a list of movies in the current TMDB language.
 *  Used to patch existing feed cards when the user switches locale. */
export async function fetchMovieTitles(
  movieIds: number[],
): Promise<Map<number, { title: string; overview: string }>> {
  const results = await Promise.allSettled(
    movieIds.map(async (id) => {
      const data = await tmdbFetch(`/movie/${id}`);
      return { id, title: data.title as string | undefined, overview: (data.overview ?? "") as string };
    }),
  );
  const map = new Map<number, { title: string; overview: string }>();
  for (const r of results) {
    if (r.status === "fulfilled" && r.value.title) {
      map.set(r.value.id, { title: r.value.title, overview: r.value.overview });
    }
  }
  return map;
}

// ─── Person details ───────────────────────────────────────────────────────────

export async function fetchPersonDetails(
  personId: number,
): Promise<TMDBPersonDetails | null> {
  try {
    const [person, credits] = await Promise.all([
      tmdbFetch(`/person/${personId}`),
      tmdbFetch(`/person/${personId}/movie_credits`),
    ]);
    return {
      ...person,
      movies: filterSafe(credits.cast ?? [])
        .sort((a: any, b: any) => (b.popularity ?? 0) - (a.popularity ?? 0))
        .slice(0, 12),
    };
  } catch {
    return null;
  }
}

// Module-level trailer cache (avoids re-checking same movie in a session)
const _trailerCache = new Map<number, boolean>();

/** Returns the set of movie IDs that have a YouTube trailer. Results are cached. */
export async function checkMoviesHaveTrailers(
  movieIds: number[],
): Promise<Set<number>> {
  const unchecked = movieIds.filter((id) => !_trailerCache.has(id));
  if (unchecked.length > 0) {
    await Promise.allSettled(
      unchecked.map(async (id) => {
        const key = await fetchMovieTrailerKey(id);
        _trailerCache.set(id, !!key);
      }),
    );
  }
  const result = new Set<number>();
  for (const id of movieIds) {
    if (_trailerCache.get(id) === true) result.add(id);
  }
  return result;
}

// ─── Static constants ─────────────────────────────────────────────────────────

// Platforms — names are the same in both languages
export const PLATFORMS = [
  { id: 8,    name: "Netflix" },
  { id: 119,  name: "Prime Video" },
  { id: 337,  name: "Disney+" },
  { id: 1899, name: "Max" },
  { id: 350,  name: "Apple TV+" },
  { id: 531,  name: "Paramount+" },
  { id: 64,   name: "Filmin" },
  { id: 1773, name: "SkyShowtime" },
  { id: 149,  name: "Movistar+" },
] as const;

// Genres with bilingual names — use genre.name[locale]
export const GENRES = [
  { id: 28,    name: { en: "Action",      es: "Acción" } },
  { id: 12,    name: { en: "Adventure",   es: "Aventura" } },
  { id: 16,    name: { en: "Animation",   es: "Animación" } },
  { id: 35,    name: { en: "Comedy",      es: "Comedia" } },
  { id: 80,    name: { en: "Crime",       es: "Crimen" } },
  { id: 99,    name: { en: "Documentary", es: "Documental" } },
  { id: 18,    name: { en: "Drama",       es: "Drama" } },
  { id: 10751, name: { en: "Family",      es: "Familia" } },
  { id: 14,    name: { en: "Fantasy",     es: "Fantasía" } },
  { id: 36,    name: { en: "History",     es: "Historia" } },
  { id: 27,    name: { en: "Horror",      es: "Terror" } },
  { id: 9648,  name: { en: "Mystery",     es: "Misterio" } },
  { id: 10749, name: { en: "Romance",     es: "Romance" } },
  { id: 878,   name: { en: "Sci-Fi",      es: "Sci-Fi" } },
  { id: 53,    name: { en: "Thriller",    es: "Thriller" } },
  { id: 10752, name: { en: "War",         es: "Bélico" } },
] as const;

export type GenreLocale = "en" | "es";
/** Helper: get genre name in current locale */
export function genreName(genre: (typeof GENRES)[number], locale: GenreLocale): string {
  return genre.name[locale];
}

