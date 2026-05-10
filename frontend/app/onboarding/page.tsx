"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";

const GENRES = [
  { id: 28, name: "Acción", emoji: "💥" },
  { id: 12, name: "Aventura", emoji: "🌋" },
  { id: 16, name: "Animación", emoji: "🎨" },
  { id: 35, name: "Comedia", emoji: "😂" },
  { id: 80, name: "Crimen", emoji: "🕵️" },
  { id: 99, name: "Documental", emoji: "📹" },
  { id: 18, name: "Drama", emoji: "🎭" },
  { id: 10751, name: "Familia", emoji: "🏠" },
  { id: 14, name: "Fantasía", emoji: "🦄" },
  { id: 36, name: "Historia", emoji: "📜" },
  { id: 27, name: "Terror", emoji: "👻" },
  { id: 10402, name: "Música", emoji: "🎵" },
  { id: 9648, name: "Misterio", emoji: "🔍" },
  { id: 10749, name: "Romance", emoji: "💖" },
  { id: 878, name: "Ciencia Ficción", emoji: "🚀" },
  { id: 53, name: "Thriller", emoji: "🔪" },
];

export default function OnboardingPage() {
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const toggleGenre = (id: number) => {
    setSelected(prev => 
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };

  const handleFinish = async () => {
    if (selected.length < 3) return;
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { error } = await supabase
        .from("profiles")
        .upsert({ 
          id: user.id, 
          preferred_genres: selected,
          updated_at: new Date().toISOString() 
        });

      if (!error) {
        router.push("/");
      } else {
        console.error(error);
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center justify-center">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full text-center"
      >
        <h1 className="text-4xl font-black mb-4 uppercase tracking-tighter">
          Personaliza tu <span className="text-red-600">Feed</span>
        </h1>
        <p className="text-zinc-400 mb-8">Elige al menos 3 géneros que te encanten para empezar.</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {GENRES.map((genre) => (
            <button
              key={genre.id}
              onClick={() => toggleGenre(genre.id)}
              className={`p-4 rounded-2xl border transition-all duration-300 flex flex-col items-center gap-2 ${
                selected.includes(genre.id)
                  ? "bg-red-600 border-red-500 scale-105 shadow-[0_0_20px_rgba(220,38,38,0.4)]"
                  : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
              }`}
            >
              <span className="text-2xl">{genre.emoji}</span>
              <span className="text-xs font-bold uppercase">{genre.name}</span>
            </button>
          ))}
        </div>

        <button
          onClick={handleFinish}
          disabled={selected.length < 3 || loading}
          className={`w-full py-4 rounded-full font-black uppercase tracking-widest transition-all ${
            selected.length >= 3 
              ? "bg-white text-black hover:bg-red-600 hover:text-white" 
              : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
          }`}
        >
          {loading ? "Guardando..." : selected.length < 3 ? `Elige ${3 - selected.length} más` : "¡Empezar a ver!"}
        </button>
      </motion.div>
    </div>
  );
}