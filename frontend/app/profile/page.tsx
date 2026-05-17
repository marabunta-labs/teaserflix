"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Trash2,
  LogIn,
  Play,
  Settings,
  LogOut,
  User,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { MovieInfoPanel } from "@/app/components/MovieInfoPanel";
import { useTranslation } from "@/lib/i18n";
import { fetchMovieDetails } from "@/lib/tmdb";

interface WatchlistEntry {
  id: number;
  title: string;
  poster_path: string | null;
  vote_average: number;
  release_date: string;
  overview: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { t, locale } = useTranslation();

  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [movies, setMovies] = useState<WatchlistEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [infoMovieId, setInfoMovieId] = useState<number | null>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<number>>(new Set());

  // Auth check
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthChecked(true);
    });
  }, []);

  // Load watchlist from Supabase then fetch TMDB details
  const loadWatchlist = useCallback(
    async (userId: string) => {
      setLoading(true);

      const { data, error } = await supabase
        .from("watchlist")
        .select("movie_id, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[Profile] Watchlist load error:", error.message);
        setLoading(false);
        return;
      }

      if (!data || data.length === 0) {
        setMovies([]);
        setLoading(false);
        return;
      }

      const CHUNK = 10;
      const results: WatchlistEntry[] = [];
      for (let i = 0; i < data.length; i += CHUNK) {
        const chunk = data.slice(i, i + CHUNK);
        const settled = await Promise.allSettled(
          chunk.map((row) => fetchMovieDetails(row.movie_id)),
        );
        for (const r of settled) {
          if (r.status === "fulfilled" && r.value) {
            const d = r.value;
            results.push({
              id: d.id,
              title: d.title,
              poster_path: d.poster_path,
              vote_average: d.vote_average,
              release_date: d.release_date,
              overview: d.overview,
            });
          }
        }
      }

      setMovies(results);
      setLoading(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale], // re-fetch when locale changes so titles come in the right language
  );

  useEffect(() => {
    if (authChecked && user) loadWatchlist(user.id);
  }, [authChecked, user, loadWatchlist]);

  // Keep bookmarked set in sync
  useEffect(() => {
    setBookmarkedIds(new Set(movies.map((m) => m.id)));
  }, [movies]);

  const handleRemove = async (movieId: number) => {
    if (!user) return;
    setRemovingId(movieId);
    const { error } = await supabase
      .from("watchlist")
      .delete()
      .eq("user_id", user.id)
      .eq("movie_id", movieId);
    if (!error) setMovies((prev) => prev.filter((m) => m.id !== movieId));
    setRemovingId(null);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  // Bookmark toggle inside info panel (removing from watchlist here)
  const handleToggleBookmark = (id: number, _genreIds: number[]) => {
    handleRemove(id);
  };

  const isBookmarked = (id: number) => bookmarkedIds.has(id);

  // ── Loading ───────────────────────────────────────────────
  if (!authChecked) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black text-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
      </div>
    );
  }

  // ── Guest state ───────────────────────────────────────────
  if (!user) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-8 text-center">
        <User size={52} className="text-zinc-600 mb-4" />
        <h1 className="text-2xl font-black uppercase tracking-tighter mb-3">
          {t.profile.guestTitle}
        </h1>
        <p className="text-zinc-400 mb-8 max-w-xs text-sm">
          {t.profile.guestDesc}
        </p>
        <button
          onClick={() => router.push("/login")}
          className="flex items-center gap-2 bg-red-600 text-white rounded-full px-8 py-3 font-bold uppercase tracking-wide hover:bg-red-700 transition"
        >
          <LogIn size={18} />
          {t.login.signIn}
        </button>
        <button
          onClick={() => router.back()}
          className="mt-5 text-zinc-600 text-sm hover:text-zinc-400 transition"
        >
          ← {locale === "es" ? "Volver" : "Back"}
        </button>
      </div>
    );
  }

  // ── Authenticated view ────────────────────────────────────
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-md border-b border-zinc-900">
        <div className="flex items-center gap-3 px-4 pt-12 pb-3">
          <button
            onClick={() => router.push("/")}
            className="p-2 -ml-2 rounded-full hover:bg-zinc-800 transition"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-xl font-black uppercase tracking-tighter">
            {t.profile.title}
          </h1>
        </div>
      </div>

      {/* User info card */}
      <div className="px-4 py-5 border-b border-zinc-900 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-zinc-800 flex items-center justify-center">
            <User size={20} className="text-zinc-400" />
          </div>
          <p className="text-sm text-zinc-300 truncate">{user.email}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => router.push("/onboarding")}
            className="flex items-center gap-2 text-sm text-zinc-400 border border-zinc-700 rounded-full px-4 py-2 hover:border-zinc-500 hover:text-white transition"
          >
            <Settings size={14} />
            {t.profile.preferences}
          </button>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-sm text-zinc-400 border border-zinc-700 rounded-full px-4 py-2 hover:border-red-700 hover:text-red-400 transition"
          >
            <LogOut size={14} />
            {t.profile.signOut}
          </button>
        </div>
      </div>

      {/* Watchlist section */}
      <div className="px-4 pt-5">
        <div className="flex items-baseline gap-2 mb-4">
          <h2 className="text-lg font-black uppercase tracking-tighter">
            {t.profile.myWatchlist}
          </h2>
          {!loading && (
            <span className="text-zinc-500 text-sm">
              {movies.length}{" "}
              {movies.length === 1 ? t.profile.movie : t.profile.movies}
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
          </div>
        ) : movies.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="text-5xl mb-4">🎬</div>
            <p className="text-lg font-bold text-zinc-300 mb-2">
              {t.profile.empty}
            </p>
            <p className="text-zinc-600 text-sm mb-8 max-w-xs">
              {t.profile.emptyDesc}
            </p>
            <button
              onClick={() => router.push("/")}
              className="border border-zinc-700 text-zinc-400 rounded-full px-6 py-2 text-sm hover:text-white hover:border-zinc-500 transition"
            >
              {t.profile.goToFeed}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 pb-10">
            <AnimatePresence>
              {movies.map((movie) => (
                <motion.div
                  key={movie.id}
                  layout
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.2 }}
                  className="relative rounded-xl overflow-hidden bg-zinc-900"
                >
                  {/* Poster — opens info panel (div to avoid nested-button violation) */}
                  <div
                    className="w-full text-left active:scale-95 transition cursor-pointer"
                    onClick={() => setInfoMovieId(movie.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && setInfoMovieId(movie.id)}
                  >
                    <div className="aspect-[2/3] relative">
                      {movie.poster_path ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w342${movie.poster_path}`}
                          alt={movie.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                          <User size={32} className="text-zinc-600" />
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                      {/* Play in feed button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/?play=${movie.id}`);
                        }}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/60 backdrop-blur-sm rounded-full p-3 hover:bg-red-700/80 transition active:scale-90"
                        title={t.moviePanel.watchInFeed}
                      >
                        <Play size={22} className="text-white fill-white" />
                      </button>

                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <p className="text-white text-xs font-bold line-clamp-2 leading-tight">
                          {movie.title}
                        </p>
                        <p className="text-zinc-500 text-[10px] mt-0.5">
                          {movie.release_date?.slice(0, 4)}
                          {movie.vote_average > 0 && (
                            <span className="ml-2 text-yellow-500">
                              ★ {movie.vote_average.toFixed(1)}
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Remove button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemove(movie.id);
                        }}
                        disabled={removingId === movie.id}
                        title={t.profile.removeFromWatchlist}
                        className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm rounded-full p-2 hover:bg-red-900/80 transition active:scale-90 disabled:opacity-50"
                      >
                        {removingId === movie.id ? (
                          <div className="h-3.5 w-3.5 animate-spin rounded-full border border-white border-t-transparent" />
                        ) : (
                          <Trash2 size={14} className="text-red-400" />
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Movie info panel — "Watch trailer" navigates to feed */}
      <AnimatePresence>
        {infoMovieId !== null && (
          <MovieInfoPanel
            movieId={infoMovieId}
            onClose={() => setInfoMovieId(null)}
            user={user}
            isBookmarked={isBookmarked}
            onToggleBookmark={handleToggleBookmark}
            onMovieSelect={(id) => router.push(`/?play=${id}`)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
