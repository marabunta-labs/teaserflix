"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { GENRES, PLATFORMS } from "@/lib/tmdb";
import { useTranslation } from "@/lib/i18n";

// Emoji mappings (UI-only, not stored)
const GENRE_EMOJI: Record<number, string> = {
  28: "💥", 12: "🌋", 16: "🎨", 35: "😂", 80: "🕵️",
  99: "📹", 18: "🎭", 10751: "🏠", 14: "🦄", 36: "📜",
  27: "👻", 9648: "🔍", 10749: "💖", 878: "🚀", 53: "🔪", 10752: "⚔️",
};
const PLATFORM_EMOJI: Record<number, string> = {
  8: "🔴", 119: "🔵", 337: "✨", 1899: "🎬", 350: "🍎", 531: "⭐",
};

export default function OnboardingPage() {
  const { t, locale } = useTranslation();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const router = useRouter();

  // Guard: redirect to login if not authenticated
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/login");
      } else {
        setAuthChecked(true);
      }
    });
  }, [router]);

  const toggleGenre = (id: number) =>
    setSelectedGenres((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id],
    );

  const togglePlatform = (id: number) =>
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );

  const handleFinish = async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        preferred_genres: selectedGenres,
        preferred_providers: selectedPlatforms,
        has_completed_onboarding: true,
        updated_at: new Date().toISOString(),
      });

      if (!error) {
        router.push("/");
      } else {
        console.error("[Onboarding] Save error:", error);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  };

  const remaining = Math.max(0, 3 - selectedGenres.length);

  if (!authChecked) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center justify-center">
      {/* Step indicator */}
      <div className="flex gap-2 mb-10">
        {[1, 2].map((s) => (
          <div
            key={s}
            className={`h-1 w-12 rounded-full transition-all ${s <= step ? "bg-red-600" : "bg-zinc-800"}`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            className="max-w-2xl w-full text-center"
          >
            <h1 className="text-4xl font-black mb-3 uppercase tracking-tighter">
              {t.onboarding.genresTitle}{" "}
              <span className="text-red-600">{t.onboarding.genresTitleHighlight}</span>
            </h1>
            <p className="text-zinc-400 mb-8">{t.onboarding.genresDesc}</p>

            <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mb-10">
              {GENRES.map((genre) => (
                <button
                  key={genre.id}
                  onClick={() => toggleGenre(genre.id)}
                  className={`p-3 rounded-2xl border transition-all duration-200 flex flex-col items-center gap-1.5 ${
                    selectedGenres.includes(genre.id)
                      ? "bg-red-600 border-red-500 scale-105 shadow-[0_0_16px_rgba(220,38,38,0.4)]"
                      : "bg-zinc-900 border-zinc-800 hover:border-zinc-600"
                  }`}
                >
                  <span className="text-xl">{GENRE_EMOJI[genre.id] ?? "🎬"}</span>
                  <span className="text-[11px] font-bold uppercase leading-tight">
                    {genre.name[locale]}
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={selectedGenres.length < 3}
              className={`w-full py-4 rounded-full font-black uppercase tracking-widest transition-all ${
                selectedGenres.length >= 3
                  ? "bg-white text-black hover:bg-red-600 hover:text-white"
                  : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
              }`}
            >
              {remaining > 0
                ? `${t.onboarding.chooseMorePrefix} ${remaining} ${t.onboarding.chooseMoreSuffix}`
                : t.onboarding.next}
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            className="max-w-2xl w-full text-center"
          >
            <h1 className="text-4xl font-black mb-3 uppercase tracking-tighter">
              {t.onboarding.platformsTitle}{" "}
              <span className="text-red-600">{t.onboarding.platformsTitleHighlight}</span>
            </h1>
            <p className="text-zinc-400 mb-8">
              {t.onboarding.platformsDesc}<br />
              <span className="text-zinc-600 text-sm">{t.onboarding.platformsOptional}</span>
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
              {PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => togglePlatform(p.id)}
                  className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col items-center gap-2 ${
                    selectedPlatforms.includes(p.id)
                      ? "bg-blue-700/30 border-blue-500 scale-105 shadow-[0_0_16px_rgba(59,130,246,0.3)]"
                      : "bg-zinc-900 border-zinc-800 hover:border-zinc-600"
                  }`}
                >
                  <span className="text-3xl">{PLATFORM_EMOJI[p.id] ?? "📺"}</span>
                  <span className="text-xs font-bold uppercase">{p.name}</span>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-4 rounded-full border border-zinc-700 text-zinc-400 text-sm hover:text-white transition"
              >
                {t.onboarding.back}
              </button>
              <button
                onClick={handleFinish}
                disabled={loading}
                className="flex-1 py-4 rounded-full font-black uppercase tracking-widest bg-white text-black hover:bg-red-600 hover:text-white disabled:opacity-50 transition-all"
              >
                {loading ? t.onboarding.saving : t.onboarding.start}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

