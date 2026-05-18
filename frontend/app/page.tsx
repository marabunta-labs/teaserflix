"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import {
  Heart,
  Bookmark,
  Share2,
  Volume2,
  VolumeX,
  Pause,
  Play,
  LogIn,
  UserCircle2,
  Search,
  SlidersHorizontal,
  ChevronLeft,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactPlayer from "react-player";
import { useInView } from "react-intersection-observer";

import { supabase } from "@/lib/supabase";
import { Recommender, type InteractionData } from "@/lib/recommender";
import {
  fetchPopularMovies,
  fetchTrendingMovies,
  fetchDiscoverWithFilters,
  fetchMovieDetails,
  fetchMovieTrailerKey,
  fetchMovieTitles,
  searchMovies,
  checkMoviesHaveTrailers,
  setTmdbLanguage,
  type TMDBMovie,
  GENRES,
  PLATFORMS,
} from "@/lib/tmdb";
import { MovieInfoPanel } from "@/app/components/MovieInfoPanel";
import { useTranslation } from "@/lib/i18n";

// ─── Constants ────────────────────────────────────────────────
const PLAYER_WINDOW = 2;
const LOAD_THRESHOLD = 6;
const MIN_INITIAL_MOVIES = 8;
const MAX_INITIAL_PAGES = 8;

// ─── Helpers ──────────────────────────────────────────────────
function formatTime(s: number): string {
  if (!s || isNaN(s) || !isFinite(s)) return "0:00";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

// ─── Auth Prompt ──────────────────────────────────────────────
function AuthPromptOverlay({ onLogin, onGuest }: { onLogin: () => void; onGuest: () => void }) {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 60 }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="fixed bottom-0 left-0 right-0 z-[100] bg-gradient-to-t from-black via-black/97 to-transparent px-6 pt-20 pb-10 pointer-events-auto"
    >
      <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2">
        {t.feed.authTitle.split(" ").slice(0, -1).join(" ")}{" "}
        <span className="text-red-600">{t.feed.authTitle.split(" ").slice(-1)[0]}</span>
      </h2>
      <p className="text-zinc-400 text-sm mb-7 leading-relaxed">{t.feed.authDesc}</p>
      <button
        onClick={onLogin}
        className="w-full flex items-center justify-center gap-2 bg-red-600 text-white rounded-full py-4 font-black uppercase tracking-widest mb-3 hover:bg-red-700 active:scale-95 transition"
      >
        <LogIn size={18} />
        {t.feed.loginRegister}
      </button>
      <button
        onClick={onGuest}
        className="w-full border border-zinc-700 text-zinc-400 rounded-full py-3 text-sm hover:text-white hover:border-zinc-500 active:scale-95 transition"
      >
        {t.feed.continueGuest}
      </button>
    </motion.div>
  );
}

// ─── Search Modal ─────────────────────────────────────────────
function SearchModal({
  isOpen,
  onClose,
  onSelectMovie,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelectMovie: (movie: TMDBMovie) => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TMDBMovie[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const r = await searchMovies(query);
      setResults(r);
      setSearching(false);
    }, 380);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!isOpen) { setQuery(""); setResults([]); }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-black flex flex-col"
        >
          <div className="flex items-center gap-3 px-4 pt-14 pb-3 border-b border-zinc-900">
            <button onClick={onClose} className="p-2 rounded-full hover:bg-zinc-800 transition">
              <ChevronLeft size={24} className="text-white" />
            </button>
            <div className="flex-1 flex items-center bg-zinc-900 rounded-full px-4 py-2 gap-2">
              <Search size={16} className="text-zinc-500 flex-shrink-0" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.search.placeholder}
                className="flex-1 bg-transparent text-white text-sm outline-none placeholder-zinc-600"
              />
              {query && (
                <button onClick={() => setQuery("")}>
                  <X size={14} className="text-zinc-500" />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {searching ? (
              <div className="flex justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
              </div>
            ) : results.length > 0 ? (
              <div className="grid grid-cols-3 gap-2 p-4">
                {results.map((movie) => (
                  <button
                    key={movie.id}
                    onClick={() => { onSelectMovie(movie); onClose(); }}
                    className="relative rounded-lg overflow-hidden bg-zinc-900 active:scale-95 transition"
                  >
                    <img
                      src={`https://image.tmdb.org/t/p/w185${movie.poster_path}`}
                      alt={movie.title}
                      className="w-full aspect-[2/3] object-cover"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2">
                      <p className="text-white text-[10px] font-semibold line-clamp-2 leading-tight">
                        {movie.title}
                      </p>
                      <p className="text-zinc-500 text-[9px]">{movie.release_date?.slice(0, 4)}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : query.length > 1 ? (
              <SearchNoResults query={query} />
            ) : (
              <SearchHint />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Small helpers so SearchModal can use i18n via hooks (hooks can't be called conditionally)
function SearchNoResults({ query }: { query: string }) {
  const { t } = useTranslation();
  return <p className="text-center text-zinc-600 py-12 text-sm">{t.search.noResultsPrefix} "{query}"</p>;
}
function SearchHint() {
  const { t } = useTranslation();
  return <p className="text-center text-zinc-700 py-12 text-sm">{t.search.hint}</p>;
}

// ─── Filter Panel ─────────────────────────────────────────────
function FilterPanel({
  isOpen,
  activeGenres,
  activePlatforms,
  filterNoTrailer,
  onChange,
  onClose,
}: {
  isOpen: boolean;
  activeGenres: number[];
  activePlatforms: number[];
  filterNoTrailer: boolean;
  onChange: (genres: number[], platforms: number[], filterNoTrailer: boolean) => void;
  onClose: () => void;
}) {
  const { t, locale } = useTranslation();
  const [localGenres, setLocalGenres] = useState(activeGenres);
  const [localPlatforms, setLocalPlatforms] = useState(activePlatforms);
  const [localFilter, setLocalFilter] = useState(filterNoTrailer);

  useEffect(() => {
    if (isOpen) {
      setLocalGenres(activeGenres);
      setLocalPlatforms(activePlatforms);
      setLocalFilter(filterNoTrailer);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleG = (id: number) =>
    setLocalGenres((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  const toggleP = (id: number) =>
    setLocalPlatforms((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[150] flex flex-col justify-end"
        >
          <div className="absolute inset-0 bg-black/60" onClick={onClose} />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 35, stiffness: 350 }}
            className="relative bg-zinc-950 rounded-t-3xl border-t border-zinc-800 max-h-[80vh] flex flex-col"
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-2 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-zinc-700 mx-auto" />
              <button onClick={onClose} className="absolute right-4 top-4 p-1 rounded-full hover:bg-zinc-800">
                <X size={18} className="text-zinc-400" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-5">
              {/* No-trailer filter toggle */}
              <div className="flex items-center justify-between py-3 mb-4 border-b border-zinc-800">
                <div>
                  <p className="text-white text-sm font-semibold">{t.filter.onlyWithTrailer}</p>
                  <p className="text-zinc-500 text-xs mt-0.5">{t.filter.onlyWithTrailerDesc}</p>
                </div>
                <button
                  onClick={() => setLocalFilter((v) => !v)}
                  className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                    localFilter ? "bg-red-600" : "bg-zinc-700"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      localFilter ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Genres */}
              <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-3">
                {t.filter.genres}
              </h3>
              <div className="flex flex-wrap gap-2 mb-5">
                {GENRES.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => toggleG(g.id)}
                    className={`px-3 py-1.5 rounded-full text-xs border transition ${
                      localGenres.includes(g.id)
                        ? "border-red-500 bg-red-600/20 text-red-400"
                        : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                    }`}
                  >
                    {g.name[locale]}
                  </button>
                ))}
              </div>

              {/* Platforms */}
              <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-3">
                {t.filter.platforms}
              </h3>
              <div className="flex flex-wrap gap-2 mb-6">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => toggleP(p.id)}
                    className={`px-3 py-1.5 rounded-full text-xs border transition ${
                      localPlatforms.includes(p.id)
                        ? "border-blue-500 bg-blue-600/20 text-blue-400"
                        : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 px-5 py-5 border-t border-zinc-900 flex-shrink-0">
              <button
                onClick={() => { onChange([], [], true); onClose(); }}
                className="flex-1 border border-zinc-700 text-zinc-400 rounded-full py-3 text-sm hover:text-white transition"
              >
                {t.filter.clear}
              </button>
              <button
                onClick={() => { onChange(localGenres, localPlatforms, localFilter); onClose(); }}
                className="flex-1 bg-red-600 text-white rounded-full py-3 text-sm font-bold hover:bg-red-700 transition"
              >
                {t.filter.apply}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Trailer Card ─────────────────────────────────────────────
interface TrailerCardProps {
  movie: TMDBMovie;
  locale: string;
  isGlobalMuted: boolean;
  onEnded: () => void;
  myIndex: number;
  activeIndex: number;
  onBecomeActive: (index: number) => void;
  onLeave: (data: InteractionData) => void;
  shouldRenderPlayer: boolean;
  isLiked: boolean;
  isBookmarked: boolean;
  onToggleLike: () => void;
  onToggleBookmark: () => void;
  onInfo: () => void;
  onNoTrailer: (movieId: number) => void;
  onShareCopied: () => void;
}

function TrailerCard({
  movie,
  locale,
  isGlobalMuted,
  onEnded,
  myIndex,
  activeIndex,
  onBecomeActive,
  onLeave,
  shouldRenderPlayer,
  isLiked,
  isBookmarked,
  onToggleLike,
  onToggleBookmark,
  onInfo,
  onNoTrailer,
  onShareCopied,
}: TrailerCardProps) {
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [trailerStatus, setTrailerStatus] = useState<"idle" | "loading" | "found" | "not_found">("idle");
  const [showGiantHeart, setShowGiantHeart] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isActuallyPlaying, setIsActuallyPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [showPlayPauseIcon, setShowPlayPauseIcon] = useState<"play" | "pause" | null>(null);

  const { ref, inView } = useInView({ threshold: 0.5 });
  const playerRef = useRef<any>(null);
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;

  const enterTimeRef = useRef<number>(0);
  const isFullWatchRef = useRef(false);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapCountRef = useRef(0);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasLongPressRef = useRef(false);
  const leaveTimeRef = useRef<number>(0);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const playIconTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const swipeTouchStartXRef = useRef(0);
  const swipeTouchStartYRef = useRef(0);
  const [showSwipeBookmark, setShowSwipeBookmark] = useState(false);

  const showPlayPauseIndicator = useCallback((type: "play" | "pause") => {
    setShowPlayPauseIcon(type);
    if (playIconTimerRef.current) clearTimeout(playIconTimerRef.current);
    playIconTimerRef.current = setTimeout(() => setShowPlayPauseIcon(null), 700);
  }, []);

  const seekToClientX = useCallback(
    (clientX: number) => {
      if (!progressBarRef.current || !playerRef.current) return;
      const rect = progressBarRef.current.getBoundingClientRect();
      const fraction = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const newTime = fraction * (playerRef.current.duration || duration);
      playerRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    },
    [duration],
  );

  // Fetch trailer key — re-fetches when movie or locale changes
  useEffect(() => {
    if (!shouldRenderPlayer) return;
    setTrailerStatus("loading");
    setTrailerKey(null);
    fetchMovieTrailerKey(movie.id)
      .then((key) => {
        if (key) {
          setTrailerKey(key);
          setTrailerStatus("found");
          console.log(`[TeaserFlix] Card ${myIndex} (${movie.title}) trailer → ${key}`);
        } else {
          setTrailerStatus("not_found");
          console.warn(`[TeaserFlix] Card ${myIndex} (${movie.title}) NO trailer`);
        }
      })
      .catch(() => setTrailerStatus("not_found"));
  }, [movie.id, shouldRenderPlayer, locale]); // eslint-disable-line react-hooks/exhaustive-deps

  // Remove this card from the feed when no trailer found — silent, no auto-skip
  useEffect(() => {
    if (trailerStatus === "not_found") {
      onNoTrailer(movie.id);
    }
  }, [trailerStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  // Viewport enter / leave
  useEffect(() => {
    if (inView) {
      enterTimeRef.current = Date.now();
      const timeSinceLeave = leaveTimeRef.current === 0 ? 0 : Date.now() - leaveTimeRef.current;
      const distanceFromActive = Math.abs(activeIndexRef.current - myIndex);
      console.log(`[TeaserFlix] Card ${myIndex} (${movie.title}) ENTERED | away=${timeSinceLeave}ms dist=${distanceFromActive}`);

      const shouldReset = timeSinceLeave > 5000 || distanceFromActive > 2;
      if (shouldReset && isPlayerReady && playerRef.current) {
        playerRef.current.currentTime = 0;
        setCurrentTime(0);
      }

      onBecomeActive(myIndex);
      isFullWatchRef.current = false;
      const t = setTimeout(() => setIsPlaying(true), 250);
      return () => clearTimeout(t);
    } else {
      if (enterTimeRef.current > 0) {
        const watchTime = (Date.now() - enterTimeRef.current) / 1000;
        const isFastScroll = watchTime < 2 && watchTime > 0;
        onLeave({
          movie_id: movie.id,
          genre_ids: movie.genre_ids,
          watch_time: watchTime,
          is_fast_scroll: isFastScroll,
          is_full_watch: isFullWatchRef.current,
          is_interested: false,
        });
        enterTimeRef.current = 0;
        isFullWatchRef.current = false;
      }
      leaveTimeRef.current = Date.now();
      setIsPlaying(false);
      setIsActuallyPlaying(false);
      setPlaybackRate(1);
      setShowPlayPauseIcon(null);
    }
  }, [inView]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTap = useCallback(() => {
    if (wasLongPressRef.current) { wasLongPressRef.current = false; return; }
    tapCountRef.current += 1;
    if (tapCountRef.current === 1) {
      tapTimerRef.current = setTimeout(() => {
        tapCountRef.current = 0;
        setIsPlaying((prev) => {
          const next = !prev;
          showPlayPauseIndicator(next ? "play" : "pause");
          return next;
        });
      }, 250);
    } else if (tapCountRef.current === 2) {
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      tapCountRef.current = 0;
      if (!isLiked) { setShowGiantHeart(true); setTimeout(() => setShowGiantHeart(false), 800); }
      onToggleLike();
    }
  }, [isLiked, onToggleLike, showPlayPauseIndicator]);

  const handlePressStart = (e: React.TouchEvent | React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button, [data-progress-bar]")) return;
    wasLongPressRef.current = false;
    if ("touches" in e && e.touches.length > 0) {
      swipeTouchStartXRef.current = e.touches[0].clientX;
      swipeTouchStartYRef.current = e.touches[0].clientY;
    }
    longPressTimerRef.current = setTimeout(() => {
      wasLongPressRef.current = true;
      setPlaybackRate(2);
    }, 500);
  };
  const handlePressEnd = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    if (wasLongPressRef.current) setPlaybackRate(1);
    if (isDraggingRef.current) { isDraggingRef.current = false; setIsSeeking(false); }
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const wasDragging = isDraggingRef.current;
    handlePressEnd();
    if (!wasDragging && e.changedTouches.length > 0) {
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - swipeTouchStartXRef.current;
      const deltaY = Math.abs(touch.clientY - swipeTouchStartYRef.current);
      if (deltaX > 80 && deltaY < 60) {
        setShowSwipeBookmark(true);
        setTimeout(() => setShowSwipeBookmark(false), 700);
        onToggleBookmark();
      }
    }
  };
  const handleCardMouseMove = (e: React.MouseEvent) => {
    if (isDraggingRef.current) seekToClientX(e.clientX);
  };

  const handleProgressMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation(); setIsSeeking(true); isDraggingRef.current = true; seekToClientX(e.clientX);
  };
  const handleProgressMouseUp = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    e.stopPropagation(); isDraggingRef.current = false; setIsSeeking(false);
  };
  const handleProgressTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation(); setIsSeeking(true); isDraggingRef.current = true; seekToClientX(e.touches[0].clientX);
  };
  const handleProgressTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current) return;
    e.stopPropagation(); e.preventDefault(); seekToClientX(e.touches[0].clientX);
  };
  const handleProgressTouchEnd = () => { isDraggingRef.current = false; setIsSeeking(false); };

  const progressFraction = duration > 0 ? currentTime / duration : 0;
  const handleEnded = () => { isFullWatchRef.current = true; onEnded(); };

  return (
    <div
      ref={ref}
      className="absolute inset-0 overflow-hidden bg-black"
      onClick={handleTap}
      onMouseDown={handlePressStart}
      onMouseUp={handlePressEnd}
      onMouseLeave={handlePressEnd}
      onMouseMove={handleCardMouseMove}
      onTouchStart={handlePressStart}
      onTouchEnd={handleTouchEnd}
    >
      <img
        src={`https://image.tmdb.org/t/p/original${movie.poster_path}`}
        alt={movie.title}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 pointer-events-none z-0 ${
          isActuallyPlaying ? "opacity-0" : "opacity-60"
        }`}
      />

      {trailerKey && shouldRenderPlayer && (
        <div className="absolute inset-0 pointer-events-none scale-150 z-0">
          <ReactPlayer
            ref={playerRef}
            src={`https://www.youtube.com/watch?v=${trailerKey}`}
            width="100%"
            height="100%"
            playing={isPlaying && !isSeeking}
            muted={isGlobalMuted}
            playbackRate={playbackRate}
            onEnded={handleEnded}
            onReady={() => setIsPlayerReady(true)}
            onPlay={() => setIsActuallyPlaying(true)}
            onPause={() => setIsActuallyPlaying(false)}
            onTimeUpdate={(e: any) => {
              if (!isDraggingRef.current) setCurrentTime(e.currentTarget.currentTime ?? 0);
            }}
            onDurationChange={(e: any) => setDuration(e.currentTarget.duration)}
            config={{
              youtube: {
                disablekb: 1, rel: 0, iv_load_policy: 3, fs: 0,
                origin: typeof window !== "undefined" ? window.location.origin : undefined,
              } as any,
            }}
          />
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/30 to-black/90 pointer-events-none z-10" />

      <AnimatePresence>
        {showGiantHeart && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1.5, y: -20 }}
            exit={{ opacity: 0, scale: 2, y: -100 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <Heart size={120} className="text-red-500 fill-red-500 drop-shadow-2xl" />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPlayPauseIcon && (
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 0.9, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <div className="bg-black/50 rounded-full p-5">
              {showPlayPauseIcon === "pause" ? (
                <Pause size={56} className="text-white fill-white" />
              ) : (
                <Play size={56} className="text-white fill-white" />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {playbackRate === 2 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            className="absolute top-20 left-4 z-50 bg-black/70 px-3 py-1 rounded-full text-white text-sm font-bold tracking-wider pointer-events-none"
          >
            2×
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSwipeBookmark && (
          <motion.div
            initial={{ opacity: 0, x: -60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="absolute inset-0 z-50 flex items-center justify-start pl-8 pointer-events-none"
          >
            <div className="bg-yellow-400/80 rounded-full p-5">
              <Bookmark size={48} className="text-black fill-black" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className="absolute bottom-24 left-4 right-20 z-20 cursor-pointer active:opacity-80"
        onClick={(e) => { e.stopPropagation(); onInfo(); }}
      >
        <h2 className="text-3xl font-bold text-white uppercase tracking-wider mb-1 drop-shadow-xl">
          {movie.title}
        </h2>
        <p className="text-gray-200 text-sm line-clamp-2 drop-shadow-lg">{movie.overview}</p>
      </div>

      <div className="absolute bottom-24 right-4 flex flex-col gap-5 items-center z-30">
        <button onClick={(e) => { e.stopPropagation(); onToggleLike(); }} className="transition active:scale-90">
          <div className="bg-white/20 p-3 rounded-full backdrop-blur-lg">
            <Heart size={26} className={`transition-colors ${isLiked ? "text-red-500 fill-red-500" : "text-white"}`} />
          </div>
        </button>
        <button onClick={(e) => { e.stopPropagation(); onToggleBookmark(); }} className="transition active:scale-90">
          <div className="bg-white/20 p-3 rounded-full backdrop-blur-lg">
            <Bookmark size={26} className={`transition-colors ${isBookmarked ? "text-yellow-400 fill-yellow-400" : "text-white"}`} />
          </div>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            const url = `${window.location.origin}/?play=${movie.id}`;
            if (navigator.share) {
              navigator.share({ title: movie.title, url }).catch(() => {});
            } else {
              navigator.clipboard.writeText(url).then(onShareCopied).catch(() => {});
            }
          }}
          className="transition active:scale-90"
        >
          <div className="bg-white/20 p-3 rounded-full backdrop-blur-lg">
            <Share2 size={26} className="text-white" />
          </div>
        </button>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-30 px-4" style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}>
        <div className="flex justify-between text-white/50 text-[10px] mb-1.5 select-none pointer-events-none">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
        <div
          ref={progressBarRef}
          data-progress-bar
          className="w-full h-1 bg-white/25 rounded-full cursor-pointer relative select-none"
          style={{ touchAction: "none" }}
          onMouseDown={handleProgressMouseDown}
          onMouseUp={handleProgressMouseUp}
          onMouseLeave={(e) => { if (isDraggingRef.current) handleProgressMouseUp(e); }}
          onTouchStart={handleProgressTouchStart}
          onTouchMove={handleProgressTouchMove}
          onTouchEnd={handleProgressTouchEnd}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="h-full bg-white rounded-full relative" style={{ width: `${progressFraction * 100}%` }}>
            <div className={`absolute right-0 top-1/2 -translate-y-1/2 rounded-full bg-white shadow-lg transition-all duration-100 ${isSeeking ? "w-4 h-4" : "w-3 h-3"}`} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Feed ────────────────────────────────────────────────
export default function TeaserflixFeed() {
  const router = useRouter();

  // Auth
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  // Feed
  const [movies, setMovies] = useState<TMDBMovie[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isGlobalMuted, setIsGlobalMuted] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Per-movie state
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<number>>(new Set());

  // UI overlays
  const [infoMovieId, setInfoMovieId] = useState<number | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Toast
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Filters
  const [activeGenres, setActiveGenres] = useState<number[]>([]);
  const [activePlatforms, setActivePlatforms] = useState<number[]>([]);
  const [filterNoTrailer, setFilterNoTrailer] = useState(true);

  // Refs
  const recommenderRef = useRef<Recommender | null>(null);
  const popularPageRef = useRef(1);
  const discoverPageRef = useRef(1);
  const trendingPageRef = useRef(1);
  const isFetchingRef = useRef(false);
  const activeGenresRef = useRef<number[]>([]);
  const activePlatformsRef = useRef<number[]>([]);
  const filterNoTrailerRef = useRef(true);
  const moviesRef = useRef<TMDBMovie[]>([]);
  const activeIndexRef = useRef(0);
  const pendingScrollToRef = useRef<number | null>(null);
  // Stores a movie ID from ?play= URL param to inject after initial load
  const playMovieIdRef = useRef<number | null>(null);

  // Keep refs in sync
  useEffect(() => { moviesRef.current = movies; }, [movies]);

  // i18n: sync TMDB language when locale changes
  const { t, locale, setLocale } = useTranslation();
  // localeRef lets the reload effect always read the current locale without it being in the deps
  const localeRef = useRef(locale);
  localeRef.current = locale;
  const isLocaleInitRef = useRef(false);

  // Detect ?play=ID URL param on mount (before auth) and store for later injection
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const id = params.get("play");
    if (id && !isNaN(Number(id))) {
      playMovieIdRef.current = Number(id);
      window.history.replaceState({}, "", "/");
    }
  }, []);

  // Scroll after inject (from search)
  useEffect(() => {
    if (pendingScrollToRef.current !== null) {
      const idx = pendingScrollToRef.current;
      pendingScrollToRef.current = null;
      setTimeout(() => {
        document.getElementById(`video-${idx}`)?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [movies]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  }, []);

  // Suppress AbortError
  useEffect(() => {
    const handler = (e: PromiseRejectionEvent) => {
      if (e.reason?.name === "AbortError") e.preventDefault();
    };
    window.addEventListener("unhandledrejection", handler);
    return () => window.removeEventListener("unhandledrejection", handler);
  }, []);

  // Auth init
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;

      if (session) {
        console.log(`[TeaserFlix] Session: ${session.user.email}`);
        setUser(session.user);

        const { data: profile } = await supabase
          .from("profiles")
          .select("preferred_genres, preferred_providers, has_completed_onboarding")
          .eq("id", session.user.id)
          .single();

        const prefGenres: number[] = profile?.preferred_genres ?? [];
        const prefProviders: number[] = profile?.preferred_providers ?? [];

        if (!profile?.has_completed_onboarding && prefGenres.length === 0) {
          console.log("[TeaserFlix] New user → onboarding");
          router.push("/onboarding");
          return;
        }

        const rec = new Recommender(session.user.id, prefGenres);
        await rec.loadHistoryFromSupabase();
        recommenderRef.current = rec;

        if (prefProviders.length > 0 && activePlatforms.length === 0) {
          setActivePlatforms(prefProviders);
          activePlatformsRef.current = prefProviders;
        }

        const [{ data: likes }, { data: wl }] = await Promise.all([
          supabase.from("likes").select("movie_id").eq("user_id", session.user.id).limit(200),
          supabase.from("watchlist").select("movie_id").eq("user_id", session.user.id).limit(200),
        ]);
        if (mounted) {
          setLikedIds(new Set((likes ?? []).map((r: any) => r.movie_id)));
          setBookmarkedIds(new Set((wl ?? []).map((r: any) => r.movie_id)));
        }
      } else {
        console.log("[TeaserFlix] Guest mode");
        recommenderRef.current = new Recommender(null, []);
        setShowAuthPrompt(true);
      }

      if (mounted) setAuthChecked(true);
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session && mounted) setUser(session.user);
      if (event === "SIGNED_OUT" && mounted) setUser(null);
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Core fetch batch
  const fetchBatch = useCallback(async (): Promise<TMDBMovie[]> => {
    const rec = recommenderRef.current;
    const genres = activeGenresRef.current;
    const providers = activePlatformsRef.current;
    const hasFilters = genres.length > 0 || providers.length > 0;
    const hasSignal = rec?.hasEnoughSignal() ?? false;
    const topGenres = rec?.getTopGenres(5) ?? [];

    let raw: TMDBMovie[];
    if (hasFilters) {
      raw = await fetchDiscoverWithFilters(genres, providers, discoverPageRef.current++);
    } else if (hasSignal) {
      const roll = Math.random();
      if (roll < 0.70) raw = await fetchDiscoverWithFilters(topGenres, [], discoverPageRef.current++);
      else if (roll < 0.90) raw = await fetchTrendingMovies(trendingPageRef.current++);
      else raw = await fetchPopularMovies(popularPageRef.current++);
    } else {
      raw = Math.random() < 0.6
        ? await fetchPopularMovies(popularPageRef.current++)
        : await fetchTrendingMovies(trendingPageRef.current++);
    }

    // Pre-filter movies without trailers (uses module-level cache)
    if (filterNoTrailerRef.current && raw.length > 0) {
      const withTrailers = await checkMoviesHaveTrailers(raw.map((m) => m.id));
      raw = raw.filter((m) => withTrailers.has(m.id));
    }

    return raw;
  }, []);

  // Initial load
  const loadInitialMovies = useCallback(async () => {
    const rec = recommenderRef.current;
    let accumulated: TMDBMovie[] = [];
    let attempts = 0;
    const seenInBatch = new Set<number>();

    while (accumulated.length < MIN_INITIAL_MOVIES && attempts < MAX_INITIAL_PAGES) {
      attempts++;
      const raw = await fetchBatch();
      if (raw.length === 0) break;
      const fresh = raw.filter((m) => !rec?.hasSeen(m.id) && !seenInBatch.has(m.id));
      fresh.forEach((m) => seenInBatch.add(m.id));
      accumulated = [...accumulated, ...fresh];
      console.log(`[TeaserFlix] initBatch attempt=${attempts} fresh=${fresh.length} total=${accumulated.length}`);
    }

    if (accumulated.length === 0) {
      console.warn("[TeaserFlix] All movies seen → re-surfacing popular");
      let raw = await fetchPopularMovies(1);
      if (filterNoTrailerRef.current && raw.length > 0) {
        const withTrailers = await checkMoviesHaveTrailers(raw.map((m) => m.id));
        raw = raw.filter((m) => withTrailers.has(m.id));
      }
      accumulated = raw;
      popularPageRef.current = 2;
    }

    accumulated.forEach((m) => rec?.markSeen(m.id));
    setMovies(accumulated);
    console.log(`[TeaserFlix] Initial batch: ${accumulated.length} movies`);
  }, [fetchBatch]);

  // Load more
  const loadMoreMovies = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsLoadingMore(true);
    try {
      const rec = recommenderRef.current;
      const raw = await fetchBatch();
      const existingIds = new Set(moviesRef.current.map((m) => m.id));
      const fresh = raw.filter((m) => !rec?.hasSeen(m.id) && !existingIds.has(m.id));
      fresh.forEach((m) => rec?.markSeen(m.id));

      if (fresh.length > 0) {
        setMovies((prev) => {
          const ids = new Set(prev.map((m) => m.id));
          return [...prev, ...fresh.filter((m) => !ids.has(m.id))];
        });
        console.log(`[TeaserFlix] Loaded ${fresh.length} more`);
      } else {
        let fallback = (await fetchPopularMovies(popularPageRef.current++)).filter(
          (m) => !rec?.hasSeen(m.id) && !existingIds.has(m.id),
        );
        if (filterNoTrailerRef.current && fallback.length > 0) {
          const withTrailers = await checkMoviesHaveTrailers(fallback.map((m) => m.id));
          fallback = fallback.filter((m) => withTrailers.has(m.id));
        }
        fallback.forEach((m) => rec?.markSeen(m.id));
        setMovies((prev) => {
          const ids = new Set(prev.map((m) => m.id));
          return [...prev, ...fallback.filter((m) => !ids.has(m.id))];
        });
      }
    } catch (e) {
      console.error("[TeaserFlix] loadMore error:", e);
    } finally {
      isFetchingRef.current = false;
      setIsLoadingMore(false);
    }
  }, [fetchBatch]);

  // Reset + reload on auth / filter change (NOT locale — locale only updates titles in-place)
  useEffect(() => {
    if (!authChecked) return;
    setTmdbLanguage(localeRef.current); // use ref so locale changes don't trigger a full reload
    activeGenresRef.current = activeGenres;
    activePlatformsRef.current = activePlatforms;
    filterNoTrailerRef.current = filterNoTrailer;
    popularPageRef.current = 1;
    discoverPageRef.current = 1;
    trendingPageRef.current = 1;
    isFetchingRef.current = false;
    setMovies([]);
    setActiveIndex(0);
    loadInitialMovies();
  }, [authChecked, activeGenres, activePlatforms, filterNoTrailer]); // eslint-disable-line react-hooks/exhaustive-deps

  // When locale changes, update only titles + overviews of the current feed movies
  useEffect(() => {
    if (!isLocaleInitRef.current) { isLocaleInitRef.current = true; return; }
    setTmdbLanguage(locale);
    const ids = moviesRef.current.map((m) => m.id);
    if (ids.length === 0) return;
    fetchMovieTitles(ids).then((map) => {
      setMovies((prev) =>
        prev.map((m) => {
          const tr = map.get(m.id);
          return tr ? { ...m, title: tr.title, overview: tr.overview } : m;
        }),
      );
    });
  }, [locale]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load more trigger
  useEffect(() => {
    if (authChecked && movies.length > 0 && activeIndex >= movies.length - LOAD_THRESHOLD) {
      loadMoreMovies();
    }
  }, [activeIndex, movies.length, authChecked, loadMoreMovies]);

  const handleScrollToNext = (index: number) => {
    document.getElementById(`video-${index + 1}`)?.scrollIntoView({ behavior: "smooth" });
  };

  const handleBecomeActive = useCallback((index: number) => {
    activeIndexRef.current = index;
    setActiveIndex(index);
  }, []);

  const handleInteraction = useCallback(
    async (data: InteractionData) => {
      const rec = recommenderRef.current;
      if (!rec) return;
      rec.recordInteraction(data);
      if (user) await rec.persistInteraction(data);
    },
    [user],
  );

  const handleToggleLike = useCallback(
    (movieId: number, genreIds: number[]) => {
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (next.has(movieId)) {
          next.delete(movieId);
          if (user) supabase.from("likes").delete().eq("user_id", user.id).eq("movie_id", movieId).then(() => {});
        } else {
          next.add(movieId);
          if (user) {
            supabase.from("likes").insert({ user_id: user.id, movie_id: movieId }).then(() => {});
            supabase.from("interactions").update({ is_interested: true }).eq("user_id", user.id).eq("movie_id", movieId).then(() => {});
          }
          recommenderRef.current?.recordInteraction({ movie_id: movieId, genre_ids: genreIds, watch_time: 0, is_fast_scroll: false, is_full_watch: false, is_interested: true });
        }
        return next;
      });
    },
    [user],
  );

  const handleToggleBookmark = useCallback(
    (movieId: number, genreIds: number[]) => {
      setBookmarkedIds((prev) => {
        const next = new Set(prev);
        if (next.has(movieId)) {
          next.delete(movieId);
          if (user) supabase.from("watchlist").delete().eq("user_id", user.id).eq("movie_id", movieId).then(() => {});
        } else {
          if (!user) {
            showToast(t.feed.toastSave);
            return prev;
          }
          next.add(movieId);
          supabase.from("watchlist").insert({ user_id: user.id, movie_id: movieId }).then(() => {});
          supabase.from("interactions").update({ is_interested: true }).eq("user_id", user.id).eq("movie_id", movieId).then(() => {});
          recommenderRef.current?.recordInteraction({ movie_id: movieId, genre_ids: genreIds, watch_time: 0, is_fast_scroll: false, is_full_watch: false, is_interested: true });
        }
        return next;
      });
    },
    [user, showToast],
  );

  // Inject a searched movie into the feed (after current position) and scroll to it
  const handleSelectMovieFromSearch = useCallback(
    (movie: TMDBMovie) => {
      const currentMovies = moviesRef.current;
      const existingIdx = currentMovies.findIndex((m) => m.id === movie.id);
      if (existingIdx >= 0) {
        pendingScrollToRef.current = existingIdx;
        setMovies((prev) => [...prev]); // trigger the scroll effect
        return;
      }
      const insertAt = Math.min(activeIndexRef.current + 1, currentMovies.length);
      pendingScrollToRef.current = insertAt;
      setMovies((prev) => {
        const without = prev.filter((m) => m.id !== movie.id);
        const adjusted = Math.min(insertAt, without.length);
        return [...without.slice(0, adjusted), movie, ...without.slice(adjusted)];
      });
      recommenderRef.current?.markSeen(movie.id);
    },
    [],
  );

  // Inject movie from info panel or ?play= param into the feed (after current card)
  const handleInfoPanelMovieSelect = useCallback(
    async (movieId: number) => {
      setInfoMovieId(null);
      const existingIdx = moviesRef.current.findIndex((m) => m.id === movieId);
      if (existingIdx >= 0) {
        setTimeout(() => {
          document.getElementById(`video-${existingIdx}`)?.scrollIntoView({ behavior: "smooth" });
        }, 150);
        return;
      }
      const details = await fetchMovieDetails(movieId);
      if (!details) return;
      const movie: TMDBMovie = {
        id: details.id,
        title: details.title,
        overview: details.overview,
        poster_path: details.poster_path,
        backdrop_path: details.backdrop_path,
        genre_ids: details.genres.map((g) => g.id),
        popularity: 0,
        vote_average: details.vote_average,
        vote_count: 0,
        release_date: details.release_date,
        adult: details.adult,
      };
      const insertAt = Math.min(activeIndexRef.current + 1, moviesRef.current.length);
      pendingScrollToRef.current = insertAt;
      setMovies((prev) => {
        const without = prev.filter((m) => m.id !== movie.id);
        const adjusted = Math.min(insertAt, without.length);
        return [...without.slice(0, adjusted), movie, ...without.slice(adjusted)];
      });
      recommenderRef.current?.markSeen(movie.id);
    },
    [],
  );

  // Inject ?play= movie at position 0 once the initial feed is ready
  useEffect(() => {
    const id = playMovieIdRef.current;
    if (!id || !authChecked) return;
    playMovieIdRef.current = null;
    // Open InfoPanel directly — it fetches its own data, no need to wait for feed
    setInfoMovieId(id);
  }, [authChecked]); // eslint-disable-line react-hooks/exhaustive-deps

  // Silently remove a movie from the feed when its TrailerCard detects no trailer
  const handleNoTrailer = useCallback((movieId: number) => {
    setMovies((prev) => prev.filter((m) => m.id !== movieId));
  }, []);

  // Show a toast when the share button fell back to clipboard copy
  const handleShareCopied = useCallback(() => {
    showToast(t.feed.toastLinkCopied);
  }, [showToast, t.feed.toastLinkCopied]);

  // Desktop keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        document.getElementById(`video-${activeIndexRef.current + 1}`)?.scrollIntoView({ behavior: "smooth" });
      } else if (e.key === "ArrowUp") {
        document.getElementById(`video-${activeIndexRef.current - 1}`)?.scrollIntoView({ behavior: "smooth" });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const hasFilters = activeGenres.length > 0 || activePlatforms.length > 0;

  if (!authChecked) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black text-white">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
      </div>
    );
  }

  return (
    <main className="h-screen w-full bg-black overflow-y-scroll snap-y snap-mandatory no-scrollbar relative">
      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 pb-2 pointer-events-none" style={{ paddingTop: 'max(2rem, env(safe-area-inset-top))' }}>
        <span className="text-white font-black uppercase tracking-tighter text-xl pointer-events-none">
          Teaser<span className="text-red-600">flix</span>
        </span>
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {/* Language switcher */}
          <button
            onClick={() => setLocale(locale === "es" ? "en" : "es")}
            className="bg-black/40 px-2.5 py-1 rounded-full text-white text-[11px] font-bold backdrop-blur-lg border border-white/20 hover:scale-110 transition tracking-wider"
          >
            {locale === "es" ? "EN" : "ES"}
          </button>
          <button
            onClick={() => setShowFilters(true)}
            className={`p-2.5 rounded-full backdrop-blur-lg border transition hover:scale-110 ${
              hasFilters || !filterNoTrailer
                ? "bg-red-600/30 border-red-500 text-red-400"
                : "bg-black/40 border-white/20 text-white"
            }`}
          >
            <SlidersHorizontal size={20} />
          </button>
          <button
            onClick={() => setShowSearch(true)}
            className="bg-black/40 p-2.5 rounded-full text-white backdrop-blur-lg border border-white/20 hover:scale-110 transition"
          >
            <Search size={20} />
          </button>
          <button
            onClick={() => setIsGlobalMuted((p) => !p)}
            className="bg-black/40 p-2.5 rounded-full text-white backdrop-blur-lg border border-white/20 hover:scale-110 transition"
          >
            {isGlobalMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
          <button
            onClick={() => router.push("/profile")}
            className="bg-black/40 p-2.5 rounded-full text-white backdrop-blur-lg border border-white/20 hover:scale-110 transition"
          >
            <UserCircle2 size={20} />
          </button>
        </div>
      </div>

      {/* Active filter chips */}
      {hasFilters && (
        <div className="fixed top-[76px] left-0 right-0 z-40 flex gap-2 px-4 py-1 overflow-x-auto pointer-events-auto">
          {activeGenres.map((id) => {
            const g = GENRES.find((x) => x.id === id);
            return g ? (
              <span key={id} className="flex-shrink-0 bg-red-600/20 border border-red-500/50 text-red-400 text-[10px] px-2 py-1 rounded-full">
                {g.name[locale]}
              </span>
            ) : null;
          })}
          {activePlatforms.map((id) => {
            const p = PLATFORMS.find((x) => x.id === id);
            return p ? (
              <span key={id} className="flex-shrink-0 bg-blue-600/20 border border-blue-500/50 text-blue-400 text-[10px] px-2 py-1 rounded-full">
                {p.name}
              </span>
            ) : null;
          })}
          <button
            onClick={() => { setActiveGenres([]); setActivePlatforms([]); }}
            className="flex-shrink-0 text-zinc-500 text-[10px] px-2 py-1 border border-zinc-700 rounded-full hover:text-white transition"
          >
            {t.feed.clearFilters}
          </button>
        </div>
      )}

      {/* Auth prompt */}
      <AnimatePresence>
        {showAuthPrompt && (
          <AuthPromptOverlay
            onLogin={() => { setShowAuthPrompt(false); router.push("/login"); }}
            onGuest={() => { setShowAuthPrompt(false); }}
          />
        )}
      </AnimatePresence>

      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-4 right-4 z-[150] bg-zinc-900 border border-zinc-700 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-xl"
          >
            <LogIn size={16} className="text-amber-400 flex-shrink-0" />
            <span className="text-white text-sm flex-1">{toast}</span>
            <a href="/login" className="text-red-400 text-xs font-bold flex-shrink-0 hover:text-red-300 transition">
              {t.feed.toastSignIn}
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feed */}
      {movies.length > 0 ? (
        movies.map((movie, index) => (
          <div key={`${movie.id}-${index}`} id={`video-${index}`} className="h-[100dvh] w-full snap-start relative">
            <TrailerCard
              movie={movie}
              locale={locale}
              isGlobalMuted={isGlobalMuted}
              onEnded={() => handleScrollToNext(index)}
              myIndex={index}
              activeIndex={activeIndex}
              onBecomeActive={handleBecomeActive}
              onLeave={handleInteraction}
              shouldRenderPlayer={Math.abs(index - activeIndex) <= PLAYER_WINDOW}
              isLiked={likedIds.has(movie.id)}
              isBookmarked={bookmarkedIds.has(movie.id)}
              onToggleLike={() => handleToggleLike(movie.id, movie.genre_ids)}
              onToggleBookmark={() => handleToggleBookmark(movie.id, movie.genre_ids)}
              onInfo={() => setInfoMovieId(movie.id)}
              onNoTrailer={handleNoTrailer}
              onShareCopied={handleShareCopied}
            />
          </div>
        ))
      ) : (
        <div className="flex h-screen items-center justify-center text-white">
          <div className="text-center">
            <div className="mb-4 mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
            <p className="text-zinc-400">{t.feed.loading}</p>
          </div>
        </div>
      )}

      {isLoadingMore && (
        <div className="h-24 w-full flex items-center justify-center snap-start">
          <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-300" />
        </div>
      )}

      {/* Movie info panel */}
      <AnimatePresence>
        {infoMovieId !== null && (
          <MovieInfoPanel
            movieId={infoMovieId}
            onClose={() => setInfoMovieId(null)}
            user={user}
            isBookmarked={(id) => bookmarkedIds.has(id)}
            onToggleBookmark={(id, genreIds) => handleToggleBookmark(id, genreIds)}
            onMovieSelect={handleInfoPanelMovieSelect}
          />
        )}
      </AnimatePresence>

      {/* Search modal */}
      <SearchModal
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        onSelectMovie={(movie) => {
          setShowSearch(false);
          setInfoMovieId(movie.id);
        }}
      />

      {/* Filter panel */}
      <FilterPanel
        isOpen={showFilters}
        activeGenres={activeGenres}
        activePlatforms={activePlatforms}
        filterNoTrailer={filterNoTrailer}
        onChange={(genres, platforms, noTrailer) => {
          setActiveGenres(genres);
          setActivePlatforms(platforms);
          setFilterNoTrailer(noTrailer);
        }}
        onClose={() => setShowFilters(false)}
      />
    </main>
  );
}
