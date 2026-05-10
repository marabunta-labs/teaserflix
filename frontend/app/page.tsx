"use client";

import { useEffect, useState, useRef } from "react";
import { Heart, Bookmark, Share2, Volume2, VolumeX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactPlayer from "react-player";
import { useInView } from "react-intersection-observer";

const API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;

// --- COMPONENTE DE LA TARJETA ---
function TrailerCard({ 
  movie, 
  isGlobalMuted, 
  onEnded 
}: { 
  movie: any, 
  isGlobalMuted: boolean, 
  onEnded: () => void 
}) {
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [showGiantHeart, setShowGiantHeart] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const { ref, inView } = useInView({ threshold: 0.5 });
  const playerRef = useRef<typeof ReactPlayer>(null);
  const [lastLeaveTime, setLastLeaveTime] = useState(Date.now());

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (inView) {
      // Aumentamos ligeramente el tiempo a 250ms para que el scroll sea más estable
      timer = setTimeout(() => setIsPlaying(true), 250);
    } else {
      setIsPlaying(false);
    }
    return () => clearTimeout(timer);
  }, [inView]);

  useEffect(() => {
    if (inView && isPlayerReady) {
      const timeAway = Date.now() - lastLeaveTime;
      if (timeAway > 5000 && playerRef.current && typeof playerRef.current.seekTo === 'function') {
        try { playerRef.current.seekTo(0); } catch (e) {}
      }
    } else if (!inView) {
      setLastLeaveTime(Date.now());
    }
  }, [inView, isPlayerReady]);

  useEffect(() => {
    fetch(`https://api.themoviedb.org/3/movie/${movie.id}/videos?api_key=${API_KEY}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.results) {
          const trailer = data.results.find((vid: any) => vid.type === "Trailer" && vid.site === "YouTube");
          if (trailer) setTrailerKey(trailer.key);
        }
      });
  }, [movie.id]);

  const handleDoubleTap = () => {
    if (isLiked) {
      setIsLiked(false);
    } else {
      setIsLiked(true);
      setShowGiantHeart(true);
      setTimeout(() => setShowGiantHeart(false), 800);
    }
  };

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden bg-black" onDoubleClick={handleDoubleTap}>
      
      {/* 1. EL PÓSTER (Siempre de fondo, desaparece suavemente cuando el vídeo arranca) */}
      <img 
        src={`https://image.tmdb.org/t/p/original${movie.poster_path}`} 
        alt={movie.title}
        // ✨ Si el vídeo está listo y reproduciéndose, ocultamos el póster. Si no, lo mostramos.
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 pointer-events-none z-0 ${
          isPlayerReady && isPlaying ? "opacity-0" : "opacity-60"
        }`}
      />

      {/* 2. EL REPRODUCTOR (Por encima del póster, por debajo del texto) */}
      {trailerKey && (
        <div className="absolute inset-0 pointer-events-none scale-150 z-0">
          <ReactPlayer
            ref={playerRef}
            src={`https://www.youtube.com/watch?v=${trailerKey}`}
            width="100%"
            height="100%"
            playing={isPlaying}
            muted={isGlobalMuted}
            onEnded={onEnded}
            onReady={() => setIsPlayerReady(true)}
            // ✨ Añadimos playsinline y origin para mejorar la compatibilidad con navegadores
            config={{ 
              youtube: { 
                playerVars: { 
                  controls: 0, 
                  disablekb: 1, 
                  rel: 0,
                  playsinline: 1,
                  origin: typeof window !== "undefined" ? window.location.origin : ""
                } 
              } 
            }}
          />
        </div>
      )}

      {/* 3. CAPAS VISUALES Y TEXTOS */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/30 to-black/90 pointer-events-none z-10" />
      
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

      <div className="absolute bottom-20 left-4 right-20 z-20 pointer-events-none">
        <h2 className="text-3xl font-bold text-white uppercase tracking-wider mb-2 drop-shadow-xl">{movie.title}</h2>
        <p className="text-gray-200 text-sm line-clamp-3 drop-shadow-lg">{movie.overview}</p>
      </div>

      <div className="absolute bottom-20 right-4 flex flex-col gap-6 items-center z-30">
        <button onClick={() => setIsLiked(!isLiked)} className="transition active:scale-90">
          <div className="bg-white/20 p-3 rounded-full backdrop-blur-lg">
            <Heart size={28} className={`transition-colors duration-300 ${isLiked ? "text-red-500 fill-red-500" : "text-white"}`} />
          </div>
        </button>
        <button className="transition active:scale-90"><div className="bg-white/20 p-3 rounded-full backdrop-blur-lg"><Bookmark size={28} className="text-white"/></div></button>
        <button className="transition active:scale-90"><div className="bg-white/20 p-3 rounded-full backdrop-blur-lg"><Share2 size={28} className="text-white"/></div></button>
      </div>
    </div>
  );
}

// --- CONTENEDOR PRINCIPAL (FEED) ---
export default function TeaserflixFeed() {
  const [movies, setMovies] = useState<any[]>([]);
  const [isGlobalMuted, setIsGlobalMuted] = useState(true);

  // ✨ INTERCEPTOR DEL ERROR ABORTERROR
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason && event.reason.name === "AbortError") {
        // Le decimos a Next.js: "Tranquilo, yo me encargo de esto, no rompas la app"
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
        if (data.results) setMovies(data.results);
      });
  }, []);

  const handleScrollToNext = (index: number) => {
    const nextVideo = document.getElementById(`video-${index + 1}`);
    if (nextVideo) {
      nextVideo.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <main className="h-screen w-full bg-black overflow-y-scroll snap-y snap-mandatory no-scrollbar relative">
      <button 
        onClick={() => setIsGlobalMuted(!isGlobalMuted)}
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
            />
          </div>
        ))
      ) : (
        <div className="flex h-full items-center justify-center text-white"><p>Cargando cartelera...</p></div>
      )}
    </main>
  );
}