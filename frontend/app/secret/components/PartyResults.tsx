"use client";

import { Heart, Trophy } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { computeMatches, type PartyMatch, type PartyState } from "@/lib/party";

function MatchRow({ match, total, highlight }: { match: PartyMatch; total: number; highlight: boolean }) {
  const { t } = useTranslation();
  const { movie } = match;
  return (
    <li
      className={`flex gap-3 rounded-xl border p-2 ${
        highlight ? "border-red-600 bg-red-950/30" : "border-zinc-800 bg-zinc-900"
      }`}
    >
      {movie.poster_path ? (
        <img
          src={`https://image.tmdb.org/t/p/w154${movie.poster_path}`}
          alt=""
          className="h-24 w-16 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div className="h-24 w-16 shrink-0 rounded-lg bg-zinc-800" />
      )}
      <div className="min-w-0 flex-1 py-1">
        <p className="truncate font-bold">{movie.title}</p>
        <p className="text-xs text-zinc-400">
          {movie.year} · ⭐ {movie.vote_average.toFixed(1)}
        </p>
        <p className="mt-1 flex items-center gap-1 text-xs text-red-400">
          <Heart size={12} fill="currentColor" />
          {t.secret.partyUi.likedBy} {match.likes} {t.secret.partyUi.of} {total}
        </p>
      </div>
    </li>
  );
}

export function PartyResults({ state }: { state: PartyState }) {
  const { t } = useTranslation();
  const { full, partial, total } = computeMatches(state);
  const ui = t.secret.partyUi;

  return (
    <section>
      <h2 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-zinc-400">
        <Trophy size={14} /> {ui.matches}
      </h2>
      {full.length > 0 ? (
        <>
          <p className="mb-2 text-sm font-semibold text-red-400">{ui.perfectMatch}</p>
          <ul className="space-y-2">
            {full.map((m, i) => (
              <MatchRow key={m.movie.id} match={m} total={total} highlight={i === 0} />
            ))}
          </ul>
        </>
      ) : partial.length > 0 ? (
        <>
          <p className="mb-2 text-sm text-zinc-400">{ui.closest}</p>
          <ul className="space-y-2">
            {partial.map((m) => (
              <MatchRow key={m.movie.id} match={m} total={total} highlight={false} />
            ))}
          </ul>
        </>
      ) : (
        <p className="text-sm text-zinc-500">{ui.noMatchesYet}</p>
      )}
    </section>
  );
}
