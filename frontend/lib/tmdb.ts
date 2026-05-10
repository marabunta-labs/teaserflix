// TMDB API abstraction layer
// All movie fetching goes through here so the recommendation engine
// can control which content is surfaced.

const BASE = "https://api.themoviedb.org/3";
const KEY = () => process.env.NEXT_PUBLIC_TMDB_API_KEY ?? "";

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
}

async function tmdbFetch(path: string): Promise<any> {
  const sep = path.includes("?") ? "&" : "?";
  const url = `${BASE}${path}${sep}api_key=${KEY()}&language=es-ES`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`[TMDB] ${res.status} ${res.statusText} — ${url}`);
    return {};
  }
  return res.json();
}

/** Popular movies (default cold-start feed) */
export async function fetchPopularMovies(page = 1): Promise<TMDBMovie[]> {
  console.log(`[TMDB] fetchPopular page=${page}`);
  const data = await tmdbFetch(`/movie/popular?page=${page}`);
  return data.results ?? [];
}

/** Weekly trending movies (good for variety) */
export async function fetchTrendingMovies(page = 1): Promise<TMDBMovie[]> {
  console.log(`[TMDB] fetchTrending page=${page}`);
  const data = await tmdbFetch(`/trending/movie/week?page=${page}`);
  return data.results ?? [];
}

/**
 * Genre-based discovery — the core of the recommendation feed.
 * genreIds are joined with "|" (OR logic: any of the preferred genres).
 * Sorted by popularity desc to show well-known content first.
 */
export async function fetchDiscoverByGenres(
  genreIds: number[],
  page = 1,
): Promise<TMDBMovie[]> {
  if (genreIds.length === 0) return fetchPopularMovies(page);
  const genreParam = genreIds.join("|");
  console.log(`[TMDB] fetchDiscover genres=[${genreParam}] page=${page}`);
  const data = await tmdbFetch(
    `/discover/movie?with_genres=${genreParam}&sort_by=popularity.desc&page=${page}&vote_count.gte=50`,
  );
  return data.results ?? [];
}

/** Fetch trailer YouTube key for a single movie */
export async function fetchMovieTrailerKey(movieId: number): Promise<string | null> {
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
