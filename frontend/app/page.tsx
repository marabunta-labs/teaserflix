"use client";

import { useEffect, useState } from "react";
import { Heart, Bookmark, Share2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion"; // ✨ Nueva importación

const API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;

function TrailerCard({ movie }: { movie: any }) {
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  
  // ✨ Nuevos estados para la animación y el like
  const [isLiked, setIsLiked] = useState(false);
  const [showGiantHeart, setShowGiantHeart] = useState(false);

  useEffect(() => {
    fetch(`https://api.themoviedb.org/3/movie/${movie.id}/videos?api_key=${API_KEY}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.results) {
          const trailer = data.results.find(
            (vid: any) => vid.type === "Trailer" && vid.site === "YouTube"
          );
          if (trailer) setTrailerKey(trailer.key);
        }
      });
  }, [movie.id]);

  // ✨ Función que maneja el doble toque
  const handleDoubleTap = () => {
    if (!isLiked) setIsLiked(true); // Encendemos el botón lateral
    setShowGiantHeart(true); // Mostramos el corazón gigante
    
    // Lo ocultamos después de 800ms para que se pueda volver a hacer
    setTimeout(() => {
      setShowGiantHeart(false);
    }, 800);
  };

  return (
    <div 
      className="relative h-screen w-full snap-start bg-black flex items-center justify-center overflow-hidden"
      onDoubleClick={handleDoubleTap} // ✨ Activamos el evento aquí
    >
      
      {/* 1. EL REPRODUCTOR */}
      {trailerKey ? (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <iframe
            className="w-full h-full object-cover scale-150"
            src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=1&loop=1&controls=0&playlist=${trailerKey}`}
            allow="autoplay; encrypted-media"
          />
        </div>
      ) : (
        <img 
          src={`https://image.tmdb.org/t/p/original${movie.poster_path}`} 
          alt={movie.title}
          className="absolute inset-0 w-full h-full object-cover opacity-60 pointer-events-none"
        />
      )}

      {/* 2. CAPA DE DEGRADADO */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/30 to-black/90 pointer-events-none" />

      {/* ✨ 3. LA MAGIA: El corazón gigante animado en el centro */}
      <AnimatePresence>
        {showGiantHeart && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 0 }}
            animate={{ opacity: 1, scale: 1.5, y: -20 }}
            exit={{ opacity: 0, scale: 2, y: -100 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="absolute z-50 flex items-center justify-center pointer-events-none"
          >
            <Heart size={120} className="text-red-500 fill-red-500 drop-shadow-2xl" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. INTERFAZ DE TEXTO */}
      <div className="absolute bottom-20 left-4 right-20 z-10 pointer-events-none">
        <h2 className="text-3xl font-bold text-white uppercase tracking-wider mb-2 drop-shadow-xl">
          {movie.title}
        </h2>
        <p className="text-gray-200 text-sm line-clamp-3 drop-shadow-lg">
          {movie.overview}
        </p>
      </div>

      {/* 5. BOTONERA LATERAL */}
      <div className="absolute bottom-20 right-4 flex flex-col gap-6 items-center z-20">
        
        {/* ✨ Botón de Like interactivo */}
        <button 
          onClick={() => setIsLiked(!isLiked)} // Por si le dan click normal
          className="flex flex-col items-center gap-1 transition active:scale-90"
        >
          <div className="bg-white/20 p-3 rounded-full backdrop-blur-lg">
            <Heart 
              size={28} 
              // Cambiamos el color si está "Liked"
              className={`transition-colors duration-300 ${isLiked ? "text-red-500 fill-red-500" : "text-white"}`} 
            />
          </div>
        </button>

        <button className="flex flex-col items-center gap-1 text-white hover:text-blue-400 transition active:scale-90">
          <div className="bg-white/20 p-3 rounded-full backdrop-blur-lg">
            <Bookmark size={28} />
          </div>
        </button>
        <button className="flex flex-col items-center gap-1 text-white hover:text-green-400 transition active:scale-90">
          <div className="bg-white/20 p-3 rounded-full backdrop-blur-lg">
            <Share2 size={28} />
          </div>
        </button>
      </div>
    </div>
  );
}

// ... (Aquí mantienes intacto tu componente export default function TeaserflixFeed con su useEffect)
export default function TeaserflixFeed() {
  const [movies, setMovies] = useState<any[]>([]);

  useEffect(() => {
    fetch(`https://api.themoviedb.org/3/movie/popular?api_key=${API_KEY}&language=es-ES&page=1`)
      .then((res) => res.json())
      .then((data) => {
        if (data.results) setMovies(data.results);
      });
  }, []);

  return (
    <main className="h-screen w-full bg-black overflow-y-scroll snap-y snap-mandatory no-scrollbar">
      {movies.length > 0 ? (
        movies.map((movie) => <TrailerCard key={movie.id} movie={movie} />)
      ) : (
        <div className="flex h-full items-center justify-center text-white">
          <p>Cargando cartelera...</p>
        </div>
      )}
    </main>
  );
}