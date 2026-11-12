"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GENRES, PLATFORMS } from "@/lib/tmdb";
import { useTranslation } from "@/lib/i18n";
import { buildDeck, createParty, type PartyFilters } from "@/lib/party";
import { SecretShell } from "../components/SecretShell";

const ERAS = [
  { key: "eraAny", minYear: null, maxYear: null },
  { key: "eraRecent", minYear: 2015, maxYear: null },
  { key: "eraModern", minYear: 2000, maxYear: null },
  { key: "eraClassic", minYear: null, maxYear: 1999 },
] as const;

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm transition active:scale-95 ${
        active ? "border-red-600 bg-red-600 text-white" : "border-zinc-700 bg-zinc-900 text-zinc-300"
      }`}
    >
      {children}
    </button>
  );
}

function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

export default function NewPartyPage() {
  const { t, locale } = useTranslation();
  const ui = t.secret.partyUi;
  const router = useRouter();

  const [genres, setGenres] = useState<number[]>([]);
  const [platforms, setPlatforms] = useState<number[]>([]);
  const [eraIndex, setEraIndex] = useState(0);
  const [minRating, setMinRating] = useState(6);
  const [count, setCount] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    setLoading(true);
    setError(null);
    try {
      const era = ERAS[eraIndex];
      const filters: PartyFilters = {
        genres,
        platforms,
        minYear: era.minYear,
        maxYear: era.maxYear,
        minRating,
        count,
      };
      const movies = await buildDeck(filters);
      if (movies.length === 0) {
        setError(ui.noMovies);
        return;
      }
      const code = await createParty(filters, movies);
      router.push(`/secret/party/${code}`);
    } catch {
      setError(ui.failed);
    } finally {
      setLoading(false);
    }
  };

  const label = "mb-2 text-xs font-bold uppercase tracking-widest text-zinc-500";

  return (
    <SecretShell title={ui.createTitle}>
      <p className="mb-5 text-sm text-zinc-400">{ui.createDesc}</p>

      <div className="space-y-6">
        <div>
          <p className={label}>{t.filter.genres} · {ui.anyGenre}</p>
          <div className="flex flex-wrap gap-2">
            {GENRES.map((g) => (
              <Chip key={g.id} active={genres.includes(g.id)} onClick={() => setGenres(toggle(genres, g.id))}>
                {g.name[locale]}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <p className={label}>{t.filter.platforms}</p>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <Chip key={p.id} active={platforms.includes(p.id)} onClick={() => setPlatforms(toggle(platforms, p.id))}>
                {p.name}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <p className={label}>{ui.era}</p>
          <div className="flex flex-wrap gap-2">
            {ERAS.map((e, i) => (
              <Chip key={e.key} active={eraIndex === i} onClick={() => setEraIndex(i)}>
                {ui[e.key]}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <p className={label}>{ui.minRating}: ⭐ {minRating.toFixed(1)}</p>
          <input
            type="range"
            min={0}
            max={8}
            step={0.5}
            value={minRating}
            onChange={(e) => setMinRating(Number(e.target.value))}
            className="w-full accent-red-600"
          />
        </div>

        <div>
          <p className={label}>{ui.cards}</p>
          <div className="flex gap-2">
            {[10, 20, 30].map((n) => (
              <Chip key={n} active={count === n} onClick={() => setCount(n)}>
                {n}
              </Chip>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          onClick={create}
          disabled={loading}
          className="w-full rounded-full bg-red-600 py-3 font-bold uppercase tracking-widest transition hover:bg-red-700 disabled:opacity-50"
        >
          {loading ? ui.creating : ui.create}
        </button>
      </div>
    </SecretShell>
  );
}
