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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactPlayer from "react-player";
import { useInView } from "react-intersection-observer";

import { supabase } from "@/lib/supabase";
import { Recommender, type InteractionData } from "@/lib/recommender";
import {
  fetchPopularMovies,
  fetchTrendingMovies,
  fetchDiscoverByGenres,
  type TMDBMovie,
} from "@/lib/tmdb";

// ─── Constants ────────────────────────────────────────────────
const PLAYER_WINDOW = 2;  // mount ReactPlayer for cards within ±PLAYER_WINDOW of active
const LOAD_THRESHOLD = 6; // start loading next batch when this many cards remain

// ─── Helpers ──────────────────────────────────────────────────
function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds) || !isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ─── Auth Prompt Overlay ──────────────────────────────────────
function AuthPromptOverlay({
  onLogin,
  onGuest,
}: {
  onLogin: () => void;
  onGuest: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 60 }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="fixed bottom-0 left-0 right-0 z-[100] bg-gradient-to-t from-black via-black/97 to-transparent px-6 pt-20 pb-10 pointer-events-auto"
    >
      <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2">
        Personaliza tu <span className="text-red-600">feed</span>
      </h2>
      <p className="text-zinc-400 text-sm mb-7 leading-relaxed">
        Inicia sesión para que el algoritmo aprenda tus gustos y te recomiende
        trailers que te encantarán. Sin cuenta la experiencia no estará personalizada.
      </p>
      <button
        onClick={onLogin}
        className="w-full flex items-center justify-center gap-2 bg-red-600 text-white rounded-full py-4 font-black uppercase tracking-widest mb-3 hover:bg-red-700 active:scale-95 transition"
      >
        <LogIn size={18} />
        Iniciar sesión / Registrarse
      </button>
      <button
        onClick={onGuest}
        className="w-full border border-zinc-700 text-zinc-400 rounded-full py-3 text-sm hover:text-white hover:border-zinc-500 active:scale-95 transition"
      >
        Continuar sin cuenta →
      </button>
    </motion.div>
  );
}

// ─── Trailer Card ─────────────────────────────────────────────
interface TrailerCardProps {
  movie: TMDBMovie;
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
}

function TrailerCard({
  movie,
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
}: TrailerCardProps) {
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
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

  // Interaction tracking refs
  const enterTimeRef = useRef<number>(0);
  const isFullWatchRef = useRef(false);

  // Tap detection
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapCountRef = useRef(0);

  // Long press
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasLongPressRef = useRef(false);

  // Leave time for reset logic
  const leaveTimeRef = useRef<number>(0);

  // Progress bar
  const progressBarRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  // Play/pause icon timer
  const playIconTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Helpers ────────────────────────────────────────────────
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
      console.log(`[TeaserFlix] Card ${myIndex} SEEK → ${Math.round(fraction * 100)}% (${formatTime(newTime)})`);
    },
    [duration, myIndex],
  );

  // ── Fetch trailer key ──────────────────────────────────────
  useEffect(() => {
    if (!shouldRenderPlayer) return; // don't fetch until we're near the window
    fetch(
      `https://api.themoviedb.org/3/movie/${movie.id}/videos?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}&language=es-ES`,
    )
      .then((r) => r.json())
      .then((data) => {
        const trailer = (data.results ?? []).find(
          (v: any) => v.type === "Trailer" && v.site === "YouTube",
        );
        if (trailer) {
          setTrailerKey(trailer.key);
          console.log(`[TeaserFlix] Card ${myIndex} (${movie.title}) trailer → ${trailer.key}`);
        } else {
          console.warn(`[TeaserFlix] Card ${myIndex} (${movie.title}) no YouTube trailer`);
        }
      })
      .catch((e) => console.error(`[TeaserFlix] Card ${myIndex} trailer fetch error:`, e));
  }, [movie.id, shouldRenderPlayer]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Viewport enter / leave ─────────────────────────────────
  useEffect(() => {
    if (inView) {
      enterTimeRef.current = Date.now();

      const timeSinceLeave = leaveTimeRef.current === 0 ? 0 : Date.now() - leaveTimeRef.current;
      const distanceFromActive = Math.abs(activeIndexRef.current - myIndex);

      console.log(
        `[TeaserFlix] Card ${myIndex} (${movie.title}) ENTERED view | ` +
          `away=${timeSinceLeave}ms | dist=${distanceFromActive}`,
      );

      const shouldReset = timeSinceLeave > 5000 || distanceFromActive > 2;
      if (shouldReset && isPlayerReady && playerRef.current) {
        const reason = timeSinceLeave > 5000 ? ">5 s away" : ">2 videos skipped";
        console.log(`[TeaserFlix] Card ${myIndex} RESET to start (${reason})`);
        playerRef.current.currentTime = 0;
        setCurrentTime(0);
      }

      onBecomeActive(myIndex);
      isFullWatchRef.current = false;

      const t = setTimeout(() => {
        setIsPlaying(true);
        console.log(`[TeaserFlix] Card ${myIndex} → playing=true`);
      }, 250);

      return () => clearTimeout(t);
    } else {
      // Report interaction when leaving
      if (enterTimeRef.current > 0) {
        const watchTime = (Date.now() - enterTimeRef.current) / 1000;
        const isFastScroll = watchTime < 2 && watchTime > 0;
        console.log(
          `[TeaserFlix] Card ${myIndex} LEFT | watchTime=${watchTime.toFixed(1)}s fastScroll=${isFastScroll} fullWatch=${isFullWatchRef.current}`,
        );
        onLeave({
          movie_id: movie.id,
          genre_ids: movie.genre_ids,
          watch_time: watchTime,
          is_fast_scroll: isFastScroll,
          is_full_watch: isFullWatchRef.current,
          is_interested: false, // like/bookmark handled separately
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

  // ── Tap: single = pause/play, double = like ────────────────
  const handleTap = useCallback(() => {
    if (wasLongPressRef.current) { wasLongPressRef.current = false; return; }

    tapCountRef.current += 1;
    if (tapCountRef.current === 1) {
      tapTimerRef.current = setTimeout(() => {
        tapCountRef.current = 0;
        setIsPlaying((prev) => {
          const next = !prev;
          showPlayPauseIndicator(next ? "play" : "pause");
          console.log(`[TeaserFlix] Card ${myIndex} ${next ? "RESUMED" : "PAUSED"}`);
          return next;
        });
      }, 250);
    } else if (tapCountRef.current === 2) {
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      tapCountRef.current = 0;
      if (!isLiked) {
        setShowGiantHeart(true);
        setTimeout(() => setShowGiantHeart(false), 800);
      }
      onToggleLike();
      console.log(`[TeaserFlix] Card ${myIndex} LIKE toggled (double tap)`);
    }
  }, [myIndex, isLiked, onToggleLike, showPlayPauseIndicator]);

  // ── Long press → 2× speed ──────────────────────────────────
  const handlePressStart = (e: React.TouchEvent | React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button, [data-progress-bar]")) return;
    wasLongPressRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      wasLongPressRef.current = true;
      setPlaybackRate(2);
      console.log(`[TeaserFlix] Card ${myIndex} SPEED 2×`);
    }, 500);
  };

  const handlePressEnd = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    if (wasLongPressRef.current) {
      setPlaybackRate(1);
      console.log(`[TeaserFlix] Card ${myIndex} SPEED 1×`);
    }
    if (isDraggingRef.current) { isDraggingRef.current = false; setIsSeeking(false); }
  };

  const handleCardMouseMove = (e: React.MouseEvent) => {
    if (isDraggingRef.current) seekToClientX(e.clientX);
  };

  // ── Progress bar ───────────────────────────────────────────
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

  const handleEnded = () => {
    isFullWatchRef.current = true;
    onEnded();
  };

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
      onTouchEnd={handlePressEnd}
    >
      {/* 1. POSTER — visible until video actually plays */}
      <img
        src={`https://image.tmdb.org/t/p/original${movie.poster_path}`}
        alt={movie.title}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 pointer-events-none z-0 ${
          isActuallyPlaying ? "opacity-0" : "opacity-60"
        }`}
      />

      {/* 2. PLAYER (mounted only when within ±PLAYER_WINDOW of active) */}
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
            onReady={() => {
              setIsPlayerReady(true);
              console.log(`[TeaserFlix] Card ${myIndex} PLAYER READY`);
            }}
            onPlay={() => {
              setIsActuallyPlaying(true);
              console.log(`[TeaserFlix] Card ${myIndex} → PLAYING`);
            }}
            onPause={() => {
              setIsActuallyPlaying(false);
              console.log(`[TeaserFlix] Card ${myIndex} → PAUSED`);
            }}
            onTimeUpdate={(e: any) => {
              if (!isDraggingRef.current) setCurrentTime(e.currentTarget.currentTime ?? 0);
            }}
            onDurationChange={(e: any) => {
              const d = e.currentTarget.duration;
              setDuration(d);
              console.log(`[TeaserFlix] Card ${myIndex} duration: ${formatTime(d)}`);
            }}
            config={{
              youtube: {
                disablekb: 1,
                rel: 0,
                iv_load_policy: 3,
                fs: 0,
                origin: typeof window !== "undefined" ? window.location.origin : undefined,
              } as any,
            }}
          />
        </div>
      )}

      {/* 3. GRADIENT */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/30 to-black/90 pointer-events-none z-10" />

      {/* 4. GIANT HEART */}
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

      {/* 5. PLAY/PAUSE INDICATOR */}
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

      {/* 6. 2× SPEED BADGE */}
      <AnimatePresence>
        {playbackRate === 2 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            className="absolute top-6 left-4 z-50 bg-black/70 px-3 py-1 rounded-full text-white text-sm font-bold tracking-wider pointer-events-none"
          >
            2×
          </motion.div>
        )}
      </AnimatePresence>

      {/* 7. MOVIE INFO */}
      <div className="absolute bottom-24 left-4 right-20 z-20 pointer-events-none">
        <h2 className="text-3xl font-bold text-white uppercase tracking-wider mb-2 drop-shadow-xl">
          {movie.title}
        </h2>
        <p className="text-gray-200 text-sm line-clamp-3 drop-shadow-lg">{movie.overview}</p>
      </div>

      {/* 8. ACTION BUTTONS */}
      <div className="absolute bottom-24 right-4 flex flex-col gap-6 items-center z-30">
        <button
          onClick={(e) => { e.stopPropagation(); onToggleLike(); }}
          className="transition active:scale-90"
        >
          <div className="bg-white/20 p-3 rounded-full backdrop-blur-lg">
            <Heart
              size={28}
              className={`transition-colors duration-300 ${isLiked ? "text-red-500 fill-red-500" : "text-white"}`}
            />
          </div>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleBookmark(); }}
          className="transition active:scale-90"
        >
          <div className="bg-white/20 p-3 rounded-full backdrop-blur-lg">
            <Bookmark
              size={28}
              className={`transition-colors duration-300 ${isBookmarked ? "text-yellow-400 fill-yellow-400" : "text-white"}`}
            />
          </div>
        </button>
        <button onClick={(e) => e.stopPropagation()} className="transition active:scale-90">
          <div className="bg-white/20 p-3 rounded-full backdrop-blur-lg">
            <Share2 size={28} className="text-white" />
          </div>
        </button>
      </div>

      {/* 9. PROGRESS BAR */}
      <div className="absolute bottom-0 left-0 right-0 z-30 px-4 pb-6">
        <div className="flex justify-between text-white/60 text-xs mb-2 select-none pointer-events-none">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
        <div
          ref={progressBarRef}
          data-progress-bar
          className="w-full h-1 bg-white/30 rounded-full cursor-pointer relative select-none"
          style={{ touchAction: "none" }}
          onMouseDown={handleProgressMouseDown}
          onMouseUp={handleProgressMouseUp}
          onMouseLeave={(e) => { if (isDraggingRef.current) handleProgressMouseUp(e); }}
          onTouchStart={handleProgressTouchStart}
          onTouchMove={handleProgressTouchMove}
          onTouchEnd={handleProgressTouchEnd}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="h-full bg-white rounded-full relative"
            style={{ width: `${progressFraction * 100}%` }}
          >
            <div
              className={`absolute right-0 top-1/2 -translate-y-1/2 rounded-full bg-white shadow-lg transition-all duration-100 ${
                isSeeking ? "w-4 h-4" : "w-3 h-3"
              }`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Feed ────────────────────────────────────────────────
export default function TeaserflixFeed() {
  const router = useRouter();

  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  // Feed state
  const [movies, setMovies] = useState<TMDBMovie[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isGlobalMuted, setIsGlobalMuted] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Per-movie state
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<number>>(new Set());

  // Recommendation engine (persists across renders via ref)
  const recommenderRef = useRef<Recommender | null>(null);

  // TMDB pagination state (refs so loadMoreMovies doesn't go stale)
  const popularPageRef = useRef(2); // page 1 used for initial load
  const discoverPageRef = useRef(1);
  const trendingPageRef = useRef(1);
  const isFetchingRef = useRef(false);

  // ── Suppress AbortError from YouTube iframe teardown ──────
  useEffect(() => {
    const handler = (e: PromiseRejectionEvent) => {
      if (e.reason?.name === "AbortError") e.preventDefault();
    };
    window.addEventListener("unhandledrejection", handler);
    return () => window.removeEventListener("unhandledrejection", handler);
  }, []);

  // ── Auth init ─────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;

      if (session) {
        console.log(`[TeaserFlix] Session found: ${session.user.email}`);
        setUser(session.user);

        // Load profile for preferred genres
        const { data: profile } = await supabase
          .from("profiles")
          .select("preferred_genres, has_completed_onboarding")
          .eq("id", session.user.id)
          .single();

        const preferredGenres: number[] = profile?.preferred_genres ?? [];

        // New user without onboarding → send there
        if (!profile?.has_completed_onboarding && preferredGenres.length === 0) {
          console.log("[TeaserFlix] New user → onboarding");
          router.push("/onboarding");
          return;
        }

        // Build recommender, load history from Supabase
        const rec = new Recommender(session.user.id, preferredGenres);
        await rec.loadHistoryFromSupabase();
        recommenderRef.current = rec;

        // Pre-populate liked/bookmarked ids (last 200)
        const [{ data: likes }, { data: wl }] = await Promise.all([
          supabase.from("likes").select("movie_id").eq("user_id", session.user.id).limit(200),
          supabase.from("watchlist").select("movie_id").eq("user_id", session.user.id).limit(200),
        ]);
        if (mounted) {
          setLikedIds(new Set((likes ?? []).map((r: any) => r.movie_id)));
          setBookmarkedIds(new Set((wl ?? []).map((r: any) => r.movie_id)));
        }
      } else {
        console.log("[TeaserFlix] No session → guest mode (auth prompt)");
        recommenderRef.current = new Recommender(null, []);
        setShowAuthPrompt(true);
      }

      if (mounted) setAuthChecked(true);
    };

    init();

    // Keep user state in sync with auth events (login / logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session && mounted) setUser(session.user);
      if (event === "SIGNED_OUT" && mounted) setUser(null);
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load initial movies (runs once auth check is complete) ─
  useEffect(() => {
    if (!authChecked) return;
    (async () => {
      console.log("[TeaserFlix] Loading initial batch…");
      const initial = await fetchPopularMovies(1);
      const rec = recommenderRef.current;
      const deduped = initial.filter((m) => !rec?.hasSeen(m.id));
      deduped.forEach((m) => rec?.markSeen(m.id));
      setMovies(deduped);
      console.log(`[TeaserFlix] Initial batch: ${deduped.length} movies`);
    })();
  }, [authChecked]);

  // ── Load more movies ───────────────────────────────────────
  const loadMoreMovies = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsLoadingMore(true);

    const rec = recommenderRef.current;
    const topGenres = rec?.getTopGenres(5) ?? [];
    const hasSignal = rec?.hasEnoughSignal() ?? false;

    let batch: TMDBMovie[] = [];

    try {
      // Strategy mix: genre-based (70%), trending (20%), popular (10%)
      const roll = Math.random();
      if (hasSignal && roll < 0.70) {
        console.log(`[TeaserFlix] loadMore → discover genres=[${topGenres.join(",")}] page=${discoverPageRef.current}`);
        batch = await fetchDiscoverByGenres(topGenres, discoverPageRef.current++);
      } else if (roll < 0.90) {
        console.log(`[TeaserFlix] loadMore → trending page=${trendingPageRef.current}`);
        batch = await fetchTrendingMovies(trendingPageRef.current++);
      } else {
        console.log(`[TeaserFlix] loadMore → popular page=${popularPageRef.current}`);
        batch = await fetchPopularMovies(popularPageRef.current++);
      }

      // Deduplicate against already-seen movies
      const deduped = batch.filter((m) => !rec?.hasSeen(m.id));
      deduped.forEach((m) => rec?.markSeen(m.id));

      if (deduped.length === 0 && hasSignal) {
        // Fallback: genre pages exhausted, try popular
        console.log("[TeaserFlix] Discover exhausted → fallback popular");
        const fallback = (await fetchPopularMovies(popularPageRef.current++))
          .filter((m) => !rec?.hasSeen(m.id));
        fallback.forEach((m) => rec?.markSeen(m.id));
        setMovies((prev) => [...prev, ...fallback]);
        console.log(`[TeaserFlix] Loaded ${fallback.length} fallback movies`);
      } else {
        setMovies((prev) => [...prev, ...deduped]);
        console.log(`[TeaserFlix] Loaded ${deduped.length} new movies (total seen: ${rec?.getSeenIds().size})`);
      }
    } catch (e) {
      console.error("[TeaserFlix] loadMoreMovies error:", e);
    } finally {
      isFetchingRef.current = false;
      setIsLoadingMore(false);
    }
  }, []);

  // ── Trigger load when near end ─────────────────────────────
  useEffect(() => {
    if (authChecked && movies.length > 0 && activeIndex >= movies.length - LOAD_THRESHOLD) {
      loadMoreMovies();
    }
  }, [activeIndex, movies.length, authChecked, loadMoreMovies]);

  // ── Scroll to next card ────────────────────────────────────
  const handleScrollToNext = (index: number) => {
    document.getElementById(`video-${index + 1}`)?.scrollIntoView({ behavior: "smooth" });
  };

  // ── Interaction from card ──────────────────────────────────
  const handleInteraction = useCallback(
    async (data: InteractionData) => {
      const rec = recommenderRef.current;
      if (!rec) return;
      rec.recordInteraction(data);
      if (user) await rec.persistInteraction(data);
    },
    [user],
  );

  // ── Like toggle ────────────────────────────────────────────
  const handleToggleLike = useCallback(
    async (movieId: number, genreIds: number[]) => {
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (next.has(movieId)) {
          next.delete(movieId);
          if (user) {
            supabase.from("likes").delete().eq("user_id", user.id).eq("movie_id", movieId)
              .then(({ error }) => { if (error) console.error("[TeaserFlix] unlike error:", error.message); });
          }
          console.log(`[TeaserFlix] UNLIKED movie ${movieId}`);
        } else {
          next.add(movieId);
          if (user) {
            supabase.from("likes").insert({ user_id: user.id, movie_id: movieId })
              .then(({ error }) => { if (error) console.error("[TeaserFlix] like error:", error.message); });
            // Update the corresponding interaction's is_interested flag
            supabase.from("interactions")
              .update({ is_interested: true })
              .eq("user_id", user.id)
              .eq("movie_id", movieId)
              .then(() => {});
          }
          // Also update in-memory recommender score
          recommenderRef.current?.recordInteraction({
            movie_id: movieId, genre_ids: genreIds, watch_time: 0,
            is_fast_scroll: false, is_full_watch: false, is_interested: true,
          });
          console.log(`[TeaserFlix] LIKED movie ${movieId}`);
        }
        return next;
      });
    },
    [user],
  );

  // ── Bookmark toggle ────────────────────────────────────────
  const handleToggleBookmark = useCallback(
    async (movieId: number, genreIds: number[]) => {
      setBookmarkedIds((prev) => {
        const next = new Set(prev);
        if (next.has(movieId)) {
          next.delete(movieId);
          if (user) {
            supabase.from("watchlist").delete().eq("user_id", user.id).eq("movie_id", movieId)
              .then(({ error }) => { if (error) console.error("[TeaserFlix] remove-watchlist error:", error.message); });
          }
          console.log(`[TeaserFlix] REMOVED from watchlist: movie ${movieId}`);
        } else {
          next.add(movieId);
          if (user) {
            supabase.from("watchlist").insert({ user_id: user.id, movie_id: movieId })
              .then(({ error }) => { if (error) console.error("[TeaserFlix] add-watchlist error:", error.message); });
            supabase.from("interactions")
              .update({ is_interested: true })
              .eq("user_id", user.id)
              .eq("movie_id", movieId)
              .then(() => {});
          }
          recommenderRef.current?.recordInteraction({
            movie_id: movieId, genre_ids: genreIds, watch_time: 0,
            is_fast_scroll: false, is_full_watch: false, is_interested: true,
          });
          console.log(`[TeaserFlix] SAVED to watchlist: movie ${movieId}`);
        }
        return next;
      });
    },
    [user],
  );

  // ── Render ─────────────────────────────────────────────────
  if (!authChecked) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="mb-4 mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
          <p className="text-zinc-500 text-sm">Cargando…</p>
        </div>
      </div>
    );
  }

  return (
    <main className="h-screen w-full bg-black overflow-y-scroll snap-y snap-mandatory no-scrollbar relative">
      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 pt-8 pb-2 pointer-events-none">
        <span className="text-white font-black uppercase tracking-tighter text-xl pointer-events-none">
          Teaser<span className="text-red-600">flix</span>
        </span>
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => setIsGlobalMuted((prev) => !prev)}
            className="bg-black/40 p-3 rounded-full text-white backdrop-blur-lg border border-white/20 hover:scale-110 transition"
          >
            {isGlobalMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
          </button>
          <button
            onClick={() => user ? router.push("/onboarding") : router.push("/login")}
            className="bg-black/40 p-3 rounded-full text-white backdrop-blur-lg border border-white/20 hover:scale-110 transition"
            title={user ? "Mi perfil" : "Iniciar sesión"}
          >
            <UserCircle2 size={24} />
          </button>
        </div>
      </div>

      {/* Auth prompt overlay */}
      <AnimatePresence>
        {showAuthPrompt && (
          <AuthPromptOverlay
            onLogin={() => { setShowAuthPrompt(false); router.push("/login"); }}
            onGuest={() => {
              console.log("[TeaserFlix] Guest mode activated");
              setShowAuthPrompt(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* Feed */}
      {movies.length > 0 ? (
        movies.map((movie, index) => (
          <div
            key={movie.id}
            id={`video-${index}`}
            className="h-screen w-full snap-start relative"
          >
            <TrailerCard
              movie={movie}
              isGlobalMuted={isGlobalMuted}
              onEnded={() => handleScrollToNext(index)}
              myIndex={index}
              activeIndex={activeIndex}
              onBecomeActive={setActiveIndex}
              onLeave={handleInteraction}
              shouldRenderPlayer={Math.abs(index - activeIndex) <= PLAYER_WINDOW}
              isLiked={likedIds.has(movie.id)}
              isBookmarked={bookmarkedIds.has(movie.id)}
              onToggleLike={() => handleToggleLike(movie.id, movie.genre_ids)}
              onToggleBookmark={() => handleToggleBookmark(movie.id, movie.genre_ids)}
            />
          </div>
        ))
      ) : (
        <div className="flex h-screen items-center justify-center text-white">
          <div className="text-center">
            <div className="mb-4 mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
            <p className="text-zinc-400">Cargando cartelera…</p>
          </div>
        </div>
      )}

      {/* Loading indicator at the bottom */}
      {isLoadingMore && (
        <div className="h-screen w-full snap-start flex items-center justify-center bg-black">
          <div className="text-center text-zinc-600">
            <div className="mb-3 mx-auto h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-300" />
            <p className="text-xs uppercase tracking-widest">Cargando más…</p>
          </div>
        </div>
      )}
    </main>
  );
}

