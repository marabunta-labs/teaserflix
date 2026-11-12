"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, RotateCcw } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import {
  QUESTIONS,
  VERDICT_THRESHOLD,
  buildOracleParams,
  type OracleAnswer,
} from "@/lib/akinator";
import {
  fetchDiscoverRaw,
  fetchMovieDetails,
  fetchMovieTrailerKey,
  type TMDBMovie,
  type TMDBProvider,
} from "@/lib/tmdb";
import { SecretShell } from "../components/SecretShell";

type ChatMessage = { from: "bot" | "user"; text: string };

export default function OraclePage() {
  const { t, locale } = useTranslation();
  const o = t.secret.oracle;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [committed, setCommitted] = useState<OracleAnswer[]>([]);
  const [busy, setBusy] = useState(false);
  const [pool, setPool] = useState<TMDBMovie[]>([]);
  const [pickIndex, setPickIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [providers, setProviders] = useState<TMDBProvider[]>([]);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const pick = done ? pool[pickIndex] : undefined;

  const restart = useCallback(() => {
    setCommitted([]);
    setQIndex(0);
    setPool([]);
    setPickIndex(0);
    setDone(false);
    setBusy(false);
    setMessages([
      { from: "bot", text: o.intro },
      { from: "bot", text: QUESTIONS[0].text[locale] },
    ]);
  }, [o.intro, locale]);

  // Start once on mount; later locale switches keep the conversation as is.
  useEffect(() => {
    restart();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, done, pickIndex]);

  // Load providers + trailer for the current pick
  useEffect(() => {
    if (!pick) return;
    let cancelled = false;
    setProviders([]);
    setTrailerKey(null);
    Promise.all([fetchMovieDetails(pick.id), fetchMovieTrailerKey(pick.id)]).then(([details, key]) => {
      if (cancelled) return;
      setProviders(details?.providers ?? []);
      setTrailerKey(key);
    });
    return () => {
      cancelled = true;
    };
  }, [pick?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const answer = async (a: OracleAnswer) => {
    if (busy) return;
    setBusy(true);
    const userMsg: ChatMessage = { from: "user", text: a.label[locale] };
    const candidate = [...committed, a];
    const { results, total, ok } = await fetchDiscoverRaw(buildOracleParams(candidate));

    if (!ok) {
      setMessages((m) => [...m, userMsg, { from: "bot", text: o.error }]);
      setBusy(false);
      return;
    }

    const next: ChatMessage[] = [userMsg];
    let activePool = pool;
    let activeCommitted = committed;
    let activeTotal = total;

    if (results.length === 0) {
      // This answer would leave nothing: ignore it and keep the previous pool
      next.push({ from: "bot", text: o.relaxed });
      activeTotal = -1;
    } else {
      activePool = results;
      activeCommitted = candidate;
      next.push({ from: "bot", text: `${o.remaining} ${total > 1000 ? "1000+" : total}` });
    }

    setCommitted(activeCommitted);
    setPool(activePool);

    const isLast = qIndex + 1 >= QUESTIONS.length;
    const finished = isLast || (activeTotal >= 0 && activeTotal <= VERDICT_THRESHOLD);

    if (finished) {
      if (activePool.length === 0) {
        // Nothing committed yet (every answer so far came back empty)
        const fallback = await fetchDiscoverRaw(buildOracleParams([]));
        activePool = fallback.results;
        setPool(fallback.results);
      }
      next.push({ from: "bot", text: o.verdict });
      setDone(true);
      setPickIndex(0);
    } else {
      setQIndex(qIndex + 1);
      next.push({ from: "bot", text: QUESTIONS[qIndex + 1].text[locale] });
    }
    setMessages((m) => [...m, ...next]);
    setBusy(false);
  };

  const currentQuestion = !done ? QUESTIONS[qIndex] : null;

  return (
    <SecretShell title={t.secret.akinator}>
      <div className="flex-1 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                m.from === "user" ? "rounded-br-sm bg-red-600" : "rounded-bl-sm bg-zinc-800"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}

        {busy && <p className="text-xs text-zinc-500">{o.thinking}</p>}

        {pick && (
          <div className="overflow-hidden rounded-2xl border border-red-600 bg-zinc-900">
            {pick.poster_path && (
              <img
                src={`https://image.tmdb.org/t/p/w500${pick.backdrop_path ?? pick.poster_path}`}
                alt=""
                className="h-48 w-full object-cover"
              />
            )}
            <div className="space-y-2 p-4">
              <h2 className="text-xl font-black">{pick.title}</h2>
              <p className="text-xs text-zinc-400">
                {pick.release_date?.slice(0, 4)} · ⭐ {pick.vote_average.toFixed(1)}
              </p>
              <p className="line-clamp-5 text-sm text-zinc-300">{pick.overview}</p>
              {providers.length > 0 && (
                <p className="text-xs text-zinc-400">
                  {o.availableOn} {providers.map((p) => p.provider_name).join(", ")}
                </p>
              )}
              {trailerKey && (
                <a
                  href={`https://www.youtube.com/watch?v=${trailerKey}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-red-500"
                >
                  {o.trailer} <ExternalLink size={14} />
                </a>
              )}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-0 -mx-4 mt-4 border-t border-zinc-900 bg-black px-4 pb-4 pt-3" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
        {currentQuestion ? (
          <div className="flex flex-wrap gap-2">
            {currentQuestion.answers.map((a) => (
              <button
                key={a.label.en}
                disabled={busy}
                onClick={() => answer(a)}
                className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm transition active:scale-95 hover:border-red-600 disabled:opacity-40"
              >
                {a.label[locale]}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex gap-2">
            {pickIndex + 1 < pool.length ? (
              <button
                onClick={() => setPickIndex(pickIndex + 1)}
                className="flex-1 rounded-full border border-zinc-700 bg-zinc-900 py-3 text-sm font-bold"
              >
                {o.another}
              </button>
            ) : (
              <p className="flex-1 self-center text-sm text-zinc-500">{o.noMore}</p>
            )}
            <button
              onClick={restart}
              className="flex items-center justify-center gap-2 rounded-full bg-red-600 px-5 py-3 text-sm font-bold"
            >
              <RotateCcw size={14} /> {o.playAgain}
            </button>
          </div>
        )}
      </div>
    </SecretShell>
  );
}
