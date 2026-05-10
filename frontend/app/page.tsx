"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Heart, Bookmark, Share2, Volume2, VolumeX, Pause, Play } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactPlayer from "react-player";
import { useInView } from "react-intersection-observer";

const API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds) || !isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// --- COMPONENTE DE LA TARJETA ---
function TrailerCard({
  movie,
  isGlobalMuted,
  onEnded,
  myIndex,
  activeIndex,
  onBecomeActive,
}: {
  movie: any;
  isGlobalMuted: boolean;
  onEnded: () => void;
  myIndex: number;
  activeIndex: number;
  onBecomeActive: (index: number) => void;
}) {
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [showGiantHeart, setShowGiantHeart] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  // Tracks when the video is actually emitting audio/frames (hides YouTube overlay until then)
  const [isActuallyPlaying, setIsActuallyPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [showPlayPauseIcon, setShowPlayPauseIcon] = useState<"play" | "pause" | null>(null);

  const { ref, inView } = useInView({ threshold: 0.5 });
  // react-player v3 forwards the ref as HTMLVideoElement (youtube-video-element web component)
  const playerRef = useRef<any>(null);

  // Keep a live ref to activeIndex so the inView effect always reads the latest value
  // without including it in deps (avoids re-running when a different card becomes active)
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;

  // Tap detection
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapCountRef = useRef(0);

  // Long press → 2× speed
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasLongPressRef = useRef(false);

  // Reset tracking: timestamp when this card left the viewport
  const leaveTimeRef = useRef<number>(0);

  // Progress bar
  const progressBarRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  // Play/pause indicator auto-hide timer
  const playIconTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Show a brief play/pause icon ────────────────────────────────────────────
  const showPlayPauseIndicator = useCallback((type: "play" | "pause") => {
    setShowPlayPauseIcon(type);
    if (playIconTimerRef.current) clearTimeout(playIconTimerRef.current);
    playIconTimerRef.current = setTimeout(() => setShowPlayPauseIcon(null), 700);
  }, []);

  // ── Seek helper ──────────────────────────────────────────────────────────────
  const seekToClientX = useCallback(
    (clientX: number) => {
      if (!progressBarRef.current || !playerRef.current) return;
      const rect = progressBarRef.current.getBoundingClientRect();
      const fraction = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const newTime = fraction * (playerRef.current.duration || duration);
      playerRef.current.currentTime = newTime;
      setCurrentTime(newTime);
      console.log(
        `[TeaserFlix] Card ${myIndex} SEEK → ${Math.round(fraction * 100)}% (${formatTime(newTime)})`
      );
    },
    [duration, myIndex]
  );

  // ── Fetch trailer key ────────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`https://api.themoviedb.org/3/movie/${movie.id}/videos?api_key=${API_KEY}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.results) {
          const trailer = data.results.find(
            (vid: any) => vid.type === "Trailer" && vid.site === "YouTube"
          );
          if (trailer) {
            setTrailerKey(trailer.key);
            console.log(`[TeaserFlix] Card ${myIndex} (${movie.title}) trailer → ${trailer.key}`);
          } else {
            console.warn(`[TeaserFlix] Card ${myIndex} (${movie.title}) no YouTube trailer found`);
          }
        }
      })
      .catch((e) => console.error(`[TeaserFlix] Card ${myIndex} trailer fetch error:`, e));
  }, [movie.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Viewport enter / leave ───────────────────────────────────────────────────
  useEffect(() => {
    if (inView) {
      const timeSinceLeave = leaveTimeRef.current === 0 ? 0 : Date.now() - leaveTimeRef.current;
      // At this moment activeIndexRef.current is still the PREVIOUS active card's index
      const distanceFromActive = Math.abs(activeIndexRef.current - myIndex);

      console.log(
        `[TeaserFlix] Card ${myIndex} (${movie.title}) ENTERED view | ` +
          `away: ${timeSinceLeave}ms | distance from prev active: ${distanceFromActive}`
      );

      // Reset to start if away >5 s OR user jumped more than 2 cards
      const shouldReset = timeSinceLeave > 5000 || distanceFromActive > 2;
      if (shouldReset && isPlayerReady && playerRef.current) {
        const reason = timeSinceLeave > 5000 ? ">5 s away" : ">2 videos skipped";
        console.log(`[TeaserFlix] Card ${myIndex} RESET to start (${reason})`);
        playerRef.current.currentTime = 0;
        setCurrentTime(0);
      }

      onBecomeActive(myIndex);

      // Delay play slightly so snap-scroll settles first
      const t = setTimeout(() => {
        setIsPlaying(true);
        console.log(`[TeaserFlix] Card ${myIndex} → playing=true`);
      }, 250);

      return () => clearTimeout(t);
    } else {
      leaveTimeRef.current = Date.now();
      setIsPlaying(false);
      setIsActuallyPlaying(false);
      setPlaybackRate(1);
      setShowPlayPauseIcon(null);
      console.log(`[TeaserFlix] Card ${myIndex} (${movie.title}) LEFT view`);
    }
  }, [inView]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Tap handler: single tap = pause/play, double tap = like ─────────────────
  const handleTap = useCallback(() => {
    if (wasLongPressRef.current) {
      wasLongPressRef.current = false;
      return; // long press release should not register as a tap
    }

    tapCountRef.current += 1;

    if (tapCountRef.current === 1) {
      tapTimerRef.current = setTimeout(() => {
        tapCountRef.current = 0;
        setIsPlaying((prev) => {
          const next = !prev;
          showPlayPauseIndicator(next ? "play" : "pause");
          console.log(`[TeaserFlix] Card ${myIndex} ${next ? "RESUMED" : "PAUSED"} (single tap)`);
          return next;
        });
      }, 250);
    } else if (tapCountRef.current === 2) {
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      tapCountRef.current = 0;
      setIsLiked((prev) => {
        const next = !prev;
        if (next) {
          setShowGiantHeart(true);
          setTimeout(() => setShowGiantHeart(false), 800);
        }
        console.log(`[TeaserFlix] Card ${myIndex} ${next ? "LIKED" : "UNLIKED"} (double tap)`);
        return next;
      });
    }
  }, [myIndex, showPlayPauseIndicator]);

  // ── Long press → 2× speed ────────────────────────────────────────────────────
  const handlePressStart = (e: React.TouchEvent | React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button, [data-progress-bar]")) return;
    wasLongPressRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      wasLongPressRef.current = true;
      setPlaybackRate(2);
      console.log(`[TeaserFlix] Card ${myIndex} SPEED 2× (long press)`);
    }, 500);
  };

  const handlePressEnd = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    if (wasLongPressRef.current) {
      setPlaybackRate(1);
      console.log(`[TeaserFlix] Card ${myIndex} SPEED 1× (released)`);
    }
    // End any in-flight drag (e.g. mouse left the card while dragging the bar)
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      setIsSeeking(false);
    }
  };

  // Card-level mouse move so dragging the progress bar works past its edges
  const handleCardMouseMove = (e: React.MouseEvent) => {
    if (isDraggingRef.current) seekToClientX(e.clientX);
  };

  // ── Progress bar events ──────────────────────────────────────────────────────
  const handleProgressMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSeeking(true);
    isDraggingRef.current = true;
    seekToClientX(e.clientX);
  };

  const handleProgressMouseUp = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    e.stopPropagation();
    isDraggingRef.current = false;
    setIsSeeking(false);
  };

  const handleProgressTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    setIsSeeking(true);
    isDraggingRef.current = true;
    seekToClientX(e.touches[0].clientX);
  };

  const handleProgressTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current) return;
    e.stopPropagation();
    e.preventDefault();
    seekToClientX(e.touches[0].clientX);
  };

  const handleProgressTouchEnd = () => {
    isDraggingRef.current = false;
    setIsSeeking(false);
  };

  const progressFraction = duration > 0 ? currentTime / duration : 0;

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
      {/* 1. POSTER — stays visible until video actually plays, hiding YouTube's own overlay */}
      <img
        src={`https://image.tmdb.org/t/p/original${movie.poster_path}`}
        alt={movie.title}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 pointer-events-none z-0 ${
          isActuallyPlaying ? "opacity-0" : "opacity-60"
        }`}
      />

      {/* 2. PLAYER */}
      {trailerKey && (
        <div className="absolute inset-0 pointer-events-none scale-150 z-0">
          <ReactPlayer
            ref={playerRef}
            src={`https://www.youtube.com/watch?v=${trailerKey}`}
            width="100%"
            height="100%"
            playing={isPlaying && !isSeeking}
            muted={isGlobalMuted}
            playbackRate={playbackRate}
            onEnded={onEnded}
            onReady={() => {
              setIsPlayerReady(true);
              console.log(`[TeaserFlix] Card ${myIndex} PLAYER READY`);
            }}
            onPlay={() => {
              setIsActuallyPlaying(true);
              console.log(`[TeaserFlix] Card ${myIndex} player → PLAYING`);
            }}
            onPause={() => {
              setIsActuallyPlaying(false);
              console.log(`[TeaserFlix] Card ${myIndex} player → PAUSED`);
            }}
            onTimeUpdate={(e: any) => {
              if (!isDraggingRef.current) {
                setCurrentTime(e.currentTarget.currentTime ?? 0);
              }
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
                origin:
                  typeof window !== "undefined" ? window.location.origin : undefined,
              } as any,
            }}
          />
        </div>
      )}

      {/* 3. GRADIENT */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/30 to-black/90 pointer-events-none z-10" />

      {/* 4. GIANT HEART (double tap) */}
      <AnimatePresence>
        {showGiantHeart && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 0 }}
            animate={{ opacity: 1, scale: 1.5, y: -20 }}
            exit={{ opacity: 0, scale: 2, y: -100 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <Heart size={120} className="text-red-500 fill-red-500 drop-shadow-2xl" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. PLAY/PAUSE INDICATOR (single tap) */}
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
          onClick={(e) => { e.stopPropagation(); setIsLiked((p) => !p); }}
          className="transition active:scale-90"
        >
          <div className="bg-white/20 p-3 rounded-full backdrop-blur-lg">
            <Heart
              size={28}
              className={`transition-colors duration-300 ${isLiked ? "text-red-500 fill-red-500" : "text-white"}`}
            />
          </div>
        </button>
        <button onClick={(e) => e.stopPropagation()} className="transition active:scale-90">
          <div className="bg-white/20 p-3 rounded-full backdrop-blur-lg">
            <Bookmark size={28} className="text-white" />
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
        {/* Time counters */}
        <div className="flex justify-between text-white/60 text-xs mb-2 select-none pointer-events-none">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Scrubber */}
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
            {/* Knob — grows when seeking */}
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

// --- CONTENEDOR PRINCIPAL (FEED) ---
export default function TeaserflixFeed() {
  const [movies, setMovies] = useState<any[]>([]);
  const [isGlobalMuted, setIsGlobalMuted] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  // Suppress AbortError from YouTube iframe teardown / navigation
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason?.name === "AbortError") {
        event.preventDefault();
      }
    };
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    return () => window.removeEventListener("unhandledrejection", handleUnhandledRejection);
  }, []);

  useEffect(() => {
    fetch(`https://api.themoviedb.org/3/movie/popular?api_key=${API_KEY}&language=es-ES&page=1`)
      .then((res) => res.json())
      .then((data) => {
        if (data.results) {
          setMovies(data.results);
          console.log(`[TeaserFlix] Loaded ${data.results.length} movies`);
        }
      })
      .catch((e) => console.error("[TeaserFlix] Movies fetch error:", e));
  }, []);

  const handleScrollToNext = (index: number) => {
    const nextVideo = document.getElementById(`video-${index + 1}`);
    if (nextVideo) {
      nextVideo.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <main className="h-screen w-full bg-black overflow-y-scroll snap-y snap-mandatory no-scrollbar relative">
      {/* Global mute toggle */}
      <button
        onClick={() => setIsGlobalMuted((prev) => !prev)}
        className="fixed top-8 right-4 z-50 bg-black/40 p-3 rounded-full text-white backdrop-blur-lg border border-white/20 hover:scale-110 transition"
      >
        {isGlobalMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
      </button>

      {movies.length > 0 ? (
        movies.map((movie, index) => (
          <div key={movie.id} id={`video-${index}`} className="h-screen w-full snap-start relative">
            <TrailerCard
              movie={movie}
              isGlobalMuted={isGlobalMuted}
              onEnded={() => handleScrollToNext(index)}
              myIndex={index}
              activeIndex={activeIndex}
              onBecomeActive={setActiveIndex}
            />
          </div>
        ))
      ) : (
        <div className="flex h-full items-center justify-center text-white">
          <p>Cargando cartelera...</p>
        </div>
      )}
    </main>
  );
}