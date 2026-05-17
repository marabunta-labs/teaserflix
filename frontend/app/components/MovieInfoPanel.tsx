"use client";

import { useEffect, useState } from "react";
import { X, ChevronLeft, Play, Film, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { User } from "@supabase/supabase-js";
import {
  fetchMovieDetails,
  fetchMovieTrailerKey,
  fetchPersonDetails,
  type TMDBMovieDetails,
  type TMDBPersonDetails,
} from "@/lib/tmdb";
import { useTranslation } from "@/lib/i18n";

// ─── Actor Panel ───────────────────────────────────────────────────────────────
function ActorPanel({
  personId,
  onClose,
  onSelectMovie,
}: {
  personId: number;
  onClose: () => void;
  onSelectMovie: (id: number) => void;
}) {
  const { t } = useTranslation();
  const [person, setPerson] = useState<TMDBPersonDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchPersonDetails(personId).then((p) => {
      setPerson(p);
      setLoading(false);
    });
  }, [personId]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[260] flex flex-col justify-end"
    >
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 35, stiffness: 350 }}
        className="relative bg-zinc-900 rounded-t-3xl max-h-[80vh] flex flex-col border-t border-zinc-800"
      >
        <div className="flex items-center px-5 pt-4 pb-3 flex-shrink-0 border-b border-zinc-800/60">
          <button
            onClick={onClose}
            className="p-1.5 -ml-1 rounded-full hover:bg-zinc-800 mr-2"
          >
            <ChevronLeft size={20} className="text-zinc-400" />
          </button>
          <h3 className="text-white font-bold truncate">
            {loading ? "…" : (person?.name ?? "Actor")}
          </h3>
          <button
            onClick={onClose}
            className="ml-auto p-1.5 rounded-full hover:bg-zinc-800"
          >
            <X size={18} className="text-zinc-400" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 pb-8">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-white border-t-transparent" />
            </div>
          ) : !person ? (
            <p className="text-center text-zinc-500 py-16 text-sm">
              {t.common.notFound}
            </p>
          ) : (
            <>
              <div className="flex gap-4 mt-4 mb-5">
                {person.profile_path ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w185${person.profile_path}`}
                    alt={person.name}
                    className="w-20 h-20 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0">
                    <Film size={28} className="text-zinc-600" />
                  </div>
                )}
                <div className="flex-1 min-w-0 self-center">
                  <h2 className="text-lg font-black text-white">{person.name}</h2>
                  <p className="text-zinc-500 text-xs mt-1">{person.known_for_department}</p>
                  {person.birthday && (
                    <p className="text-zinc-600 text-xs mt-1">{person.birthday.slice(0, 4)}</p>
                  )}
                  {person.place_of_birth && (
                    <p className="text-zinc-600 text-xs mt-0.5 line-clamp-1">
                      {person.place_of_birth}
                    </p>
                  )}
                </div>
              </div>

              {person.biography && (
                <p className="text-zinc-400 text-xs leading-relaxed mb-5 line-clamp-4">
                  {person.biography}
                </p>
              )}

              {person.movies.length > 0 && (
                <>
                  <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-3">
                    {t.moviePanel.filmography}
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {person.movies.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => onSelectMovie(m.id)}
                        className="relative rounded-lg overflow-hidden active:scale-95 transition bg-zinc-800"
                      >
                        {m.poster_path ? (
                          <img
                            src={`https://image.tmdb.org/t/p/w185${m.poster_path}`}
                            alt={m.title}
                            className="w-full aspect-[2/3] object-cover"
                          />
                        ) : (
                          <div className="w-full aspect-[2/3] bg-zinc-800 flex items-center justify-center">
                            <Film size={20} className="text-zinc-600" />
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-1.5">
                          <p className="text-white text-[9px] font-semibold line-clamp-2 leading-tight">
                            {m.title}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Movie Info Panel (exported) ───────────────────────────────────────────────
export function MovieInfoPanel({
  movieId: initialMovieId,
  onClose,
  user,
  isBookmarked,
  onToggleBookmark,
  onMovieSelect,
}: {
  movieId: number;
  onClose: () => void;
  user: User | null;
  /** Returns true if the movie is already in the user's watchlist */
  isBookmarked: (id: number) => boolean;
  /** Called with (id, genreIds) when user taps the bookmark button */
  onToggleBookmark: (id: number, genreIds: number[]) => void;
  /**
   * When provided a "Watch trailer" button is shown.
   * Clicking it calls onMovieSelect(id) and closes the panel so the
   * movie plays inside the main feed — no modal iframe needed.
   */
  onMovieSelect?: (id: number) => void;
}) {
  const { t } = useTranslation();

  const [history, setHistory] = useState<number[]>([]);
  const [movieId, setMovieId] = useState(initialMovieId);
  const [details, setDetails] = useState<TMDBMovieDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasTrailer, setHasTrailer] = useState<boolean | null>(null); // null = loading
  const [actorId, setActorId] = useState<number | null>(null);
  const [showGuestPrompt, setShowGuestPrompt] = useState(false);

  useEffect(() => {
    setDetails(null);
    setLoading(true);
    setHasTrailer(null);
    setShowGuestPrompt(false);
    Promise.all([
      fetchMovieDetails(movieId),
      fetchMovieTrailerKey(movieId),
    ]).then(([d, key]) => {
      setDetails(d);
      setHasTrailer(key !== null);
      setLoading(false);
    });
  }, [movieId]);

  const navigateTo = (id: number) => {
    setHistory((prev) => [...prev, movieId]);
    setMovieId(id);
    setActorId(null);
    setShowGuestPrompt(false);
  };

  const goBack = () => {
    const prev = history[history.length - 1];
    if (prev !== undefined) {
      setMovieId(prev);
      setHistory((h) => h.slice(0, -1));
    } else {
      onClose();
    }
  };

  const genreIds = details?.genres.map((g) => g.id) ?? [];
  const bookmarked = isBookmarked(movieId);

  const handleBookmark = () => {
    if (!user) {
      setShowGuestPrompt(true);
      return;
    }
    onToggleBookmark(movieId, genreIds);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex flex-col justify-end"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Bottom sheet */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 35, stiffness: 350 }}
        className="relative bg-zinc-950 rounded-t-3xl max-h-[85vh] flex flex-col overflow-hidden border-t border-zinc-800"
      >
        {/* Header drag-handle / back button */}
        <div className="flex items-center px-5 pt-4 pb-2 flex-shrink-0">
          {history.length > 0 ? (
            <button
              onClick={goBack}
              className="p-1.5 rounded-full hover:bg-zinc-800 mr-2 flex-shrink-0"
            >
              <ChevronLeft size={18} className="text-zinc-400" />
            </button>
          ) : (
            <div className="w-10 h-1 rounded-full bg-zinc-700 mx-auto" />
          )}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-zinc-800"
          >
            <X size={18} className="text-zinc-400" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 pb-8">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
            </div>
          ) : !details ? (
            <div className="py-20 text-center text-zinc-500 text-sm">
              {t.common.notFound}
            </div>
          ) : (
            <>
              {/* Title row */}
              <div className="flex gap-4 mb-4">
                {details.poster_path && (
                  <img
                    src={`https://image.tmdb.org/t/p/w185${details.poster_path}`}
                    alt={details.title}
                    className="w-20 h-28 rounded-xl object-cover flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-black text-white leading-tight">
                    {details.title}
                  </h2>
                  {details.tagline && (
                    <p className="text-zinc-500 text-xs italic mt-1 line-clamp-2">
                      {details.tagline}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-2 text-xs text-zinc-400">
                    <span>{details.release_date?.slice(0, 4)}</span>
                    {details.runtime && <span>{details.runtime} min</span>}
                    {details.vote_average > 0 && (
                      <span className="text-yellow-400">
                        ★ {details.vote_average.toFixed(1)}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {details.genres.map((g) => (
                      <span
                        key={g.id}
                        className="bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full text-[10px]"
                      >
                        {g.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Primary action: watch trailer in feed — only shown when trailer exists */}
              {onMovieSelect && hasTrailer === true && (
                <button
                  onClick={() => {
                    onMovieSelect(movieId);
                    onClose();
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white rounded-full py-3.5 mb-4 text-sm font-bold transition active:scale-95"
                >
                  <Play size={15} className="fill-white" />
                  {t.moviePanel.watchInFeed}
                </button>
              )}
              {onMovieSelect && hasTrailer === false && (
                <div className="w-full flex items-center justify-center gap-2 bg-zinc-800/60 text-zinc-500 rounded-full py-3.5 mb-4 text-sm border border-zinc-700">
                  {t.moviePanel.noTrailer}
                </div>
              )}

              {/* Overview */}
              {details.overview && (
                <p className="text-zinc-300 text-sm leading-relaxed mb-5">
                  {details.overview}
                </p>
              )}

              {/* Providers */}
              {details.providers.length > 0 && (
                <div className="mb-5">
                  <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-3">
                    {t.moviePanel.availableOn}
                  </h3>
                  <div className="flex gap-3 flex-wrap">
                    {details.providers.map((p) => (
                      <div
                        key={p.provider_id}
                        className="flex flex-col items-center gap-1 w-14"
                      >
                        <img
                          src={`https://image.tmdb.org/t/p/w45${p.logo_path}`}
                          alt={p.provider_name}
                          className="w-10 h-10 rounded-xl object-cover"
                        />
                        <span className="text-[9px] text-zinc-500 text-center leading-tight line-clamp-2">
                          {p.provider_name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cast — each actor is tappable */}
              {details.cast.length > 0 && (
                <div className="mb-5">
                  <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-3">
                    {t.moviePanel.cast}
                  </h3>
                  <div
                    className="flex gap-3 overflow-x-auto pb-1"
                    style={{ scrollbarWidth: "none" }}
                  >
                    {details.cast.map((actor) => (
                      <button
                        key={actor.id}
                        onClick={() => setActorId(actor.id)}
                        className="flex-shrink-0 text-center w-16 active:scale-95 transition"
                      >
                        {actor.profile_path ? (
                          <img
                            src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`}
                            alt={actor.name}
                            className="w-14 h-14 rounded-full object-cover mx-auto mb-1"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-zinc-800 mx-auto mb-1 flex items-center justify-center">
                            <Film size={18} className="text-zinc-600" />
                          </div>
                        )}
                        <p className="text-white text-[10px] font-semibold line-clamp-2 leading-tight">
                          {actor.name}
                        </p>
                        <p className="text-zinc-600 text-[9px] line-clamp-1 mt-0.5">
                          {actor.character}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Similar movies — drill-down navigation */}
              {details.similar.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-3">
                    {t.moviePanel.similarMovies}
                  </h3>
                  <div
                    className="flex gap-3 overflow-x-auto pb-1"
                    style={{ scrollbarWidth: "none" }}
                  >
                    {details.similar.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => navigateTo(m.id)}
                        className="flex-shrink-0 w-20 text-left active:scale-95 transition"
                      >
                        <img
                          src={`https://image.tmdb.org/t/p/w185${m.poster_path}`}
                          alt={m.title}
                          className="w-20 h-[120px] rounded-lg object-cover"
                        />
                        <p className="text-white text-[9px] mt-1 line-clamp-2 leading-tight">
                          {m.title}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Watchlist CTA */}
              {showGuestPrompt ? (
                <div className="rounded-2xl bg-zinc-900 border border-zinc-700 p-4 text-center">
                  <AlertCircle size={20} className="text-amber-400 mx-auto mb-2" />
                  <p className="text-zinc-300 text-sm font-bold mb-1">
                    {t.moviePanel.guestSaveTitle}
                  </p>
                  <p className="text-zinc-500 text-xs mb-3">
                    {t.moviePanel.guestSaveDesc}
                  </p>
                  <a
                    href="/login"
                    className="inline-block bg-red-600 text-white text-sm font-bold px-6 py-2 rounded-full hover:bg-red-700 transition"
                  >
                    {t.moviePanel.loginLink}
                  </a>
                  <button
                    onClick={() => setShowGuestPrompt(false)}
                    className="mt-2 block w-full text-zinc-600 text-xs hover:text-zinc-400 transition"
                  >
                    {t.common.cancel}
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleBookmark}
                  className={`w-full rounded-full py-3.5 font-bold text-sm uppercase tracking-wide transition active:scale-95 ${
                    bookmarked
                      ? "border border-zinc-600 text-zinc-400 hover:border-red-600 hover:text-red-400"
                      : "bg-white text-black hover:bg-zinc-200"
                  }`}
                >
                  {bookmarked ? t.moviePanel.inWatchlist : t.moviePanel.addToWatchlist}
                </button>
              )}
            </>
          )}
        </div>
      </motion.div>

      {/* Actor panel overlay */}
      <AnimatePresence>
        {actorId !== null && (
          <ActorPanel
            personId={actorId}
            onClose={() => setActorId(null)}
            onSelectMovie={(id) => {
              setActorId(null);
              navigateTo(id);
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
