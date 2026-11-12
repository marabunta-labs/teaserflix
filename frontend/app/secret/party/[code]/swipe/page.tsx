"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { Heart, X } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import {
  castVote,
  fetchParty,
  finishVoting,
  getVoterId,
  joinParty,
  type PartyMovie,
  type PartyState,
} from "@/lib/party";
import { SecretShell } from "../../../components/SecretShell";
import { PartyResults } from "../../../components/PartyResults";

const SWIPE_THRESHOLD = 100;
const POLL_MS = 2500;

function SwipeCard({ movie, onDecide }: { movie: PartyMovie; onDecide: (liked: boolean) => void }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const likeOpacity = useTransform(x, [20, SWIPE_THRESHOLD], [0, 1]);
  const skipOpacity = useTransform(x, [-SWIPE_THRESHOLD, -20], [1, 0]);
  const decided = useRef(false);

  const decide = (liked: boolean) => {
    if (decided.current) return;
    decided.current = true;
    animate(x, liked ? 600 : -600, { duration: 0.25, onComplete: () => onDecide(liked) });
  };

  // Expose the buttons' action through a custom event so the parent doesn't need a ref
  useEffect(() => {
    const handler = (e: Event) => decide((e as CustomEvent<boolean>).detail);
    window.addEventListener("party-decide", handler);
    return () => window.removeEventListener("party-decide", handler);
  });

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      style={{ x, rotate, touchAction: "pan-y" }}
      onDragEnd={(_, info) => {
        if (info.offset.x > SWIPE_THRESHOLD) decide(true);
        else if (info.offset.x < -SWIPE_THRESHOLD) decide(false);
        else animate(x, 0, { type: "spring", stiffness: 400, damping: 30 });
      }}
      className="absolute inset-0 cursor-grab overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 shadow-2xl active:cursor-grabbing"
    >
      {movie.poster_path && (
        <img
          src={`https://image.tmdb.org/t/p/w780${movie.poster_path}`}
          alt=""
          draggable={false}
          className="h-full w-full select-none object-cover"
        />
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4 pt-16">
        <h2 className="text-xl font-black leading-tight">{movie.title}</h2>
        <p className="text-xs text-zinc-300">
          {movie.year} · ⭐ {movie.vote_average.toFixed(1)}
        </p>
        <p className="mt-1 line-clamp-3 text-xs text-zinc-400">{movie.overview}</p>
      </div>
      <motion.div
        style={{ opacity: likeOpacity }}
        className="absolute left-4 top-6 -rotate-12 rounded-lg border-4 border-green-500 px-3 py-1 text-2xl font-black text-green-500"
      >
        LIKE
      </motion.div>
      <motion.div
        style={{ opacity: skipOpacity }}
        className="absolute right-4 top-6 rotate-12 rounded-lg border-4 border-red-500 px-3 py-1 text-2xl font-black text-red-500"
      >
        NOPE
      </motion.div>
    </motion.div>
  );
}

export default function PartySwipePage() {
  const { code: rawCode } = useParams<{ code: string }>();
  const code = rawCode.toUpperCase();
  const { t } = useTranslation();
  const ui = t.secret.partyUi;

  const [state, setState] = useState<PartyState | null>(null);
  const [status, setStatus] = useState<"loading" | "missing" | "ready">("loading");
  const [index, setIndex] = useState(0);
  const voterIdRef = useRef("");

  // Join (once) and load the deck
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const voterId = getVoterId();
        voterIdRef.current = voterId;
        const initial = await fetchParty(code);
        if (cancelled) return;
        if (!initial) return setStatus("missing");
        if (initial.status === "open") await joinParty(code, voterId);
        const fresh = await fetchParty(code);
        if (cancelled || !fresh) return;
        setState(fresh);
        // Resume where this device left off if it reloads
        const mine = new Set(fresh.votes.filter((v) => v.voter_id === voterId).map((v) => v.movie_id));
        const firstPending = fresh.movies.findIndex((m) => !mine.has(m.id));
        setIndex(firstPending === -1 ? fresh.movies.length : firstPending);
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("missing");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  const movies = state?.movies ?? [];
  const finished = status === "ready" && index >= movies.length;

  // After finishing, poll so the results update as others vote
  useEffect(() => {
    if (!finished) return;
    const id = setInterval(async () => {
      try {
        const fresh = await fetchParty(code);
        if (fresh) setState(fresh);
      } catch {
        // retry on the next tick
      }
    }, POLL_MS);
    return () => clearInterval(id);
  }, [finished, code]);

  const decide = (liked: boolean) => {
    const movie = movies[index];
    if (!movie) return;
    const voterId = voterIdRef.current;
    // Optimistic: advance immediately; the vote is upserted so a retry is harmless
    castVote(code, voterId, movie.id, liked).catch(() => {});
    if (index + 1 >= movies.length) finishVoting(code, voterId).catch(() => {});
    setIndex(index + 1);
  };

  if (status === "loading") {
    return (
      <SecretShell title={t.secret.party} backHref={`/secret/party/${code}`}>
        <p className="text-zinc-500">{t.common.loading}</p>
      </SecretShell>
    );
  }
  if (status === "missing" || !state) {
    return (
      <SecretShell title={t.secret.party} backHref="/secret">
        <p className="text-zinc-400">{ui.notFound}</p>
      </SecretShell>
    );
  }
  if (state.status === "closed" && !finished) {
    return (
      <SecretShell title={t.secret.party} backHref="/secret">
        <p className="text-zinc-400">{ui.sessionClosed}</p>
      </SecretShell>
    );
  }

  if (finished) {
    return (
      <SecretShell title={t.secret.party} backHref="/secret">
        <p className="mb-1 text-xl font-black">{ui.allDone}</p>
        <p className="mb-6 text-sm text-zinc-400">{ui.waiting}</p>
        <PartyResults state={state} />
      </SecretShell>
    );
  }

  const fire = (liked: boolean) => window.dispatchEvent(new CustomEvent("party-decide", { detail: liked }));

  return (
    <SecretShell title={`${index + 1} / ${movies.length}`} backHref="/secret">
      <div className="relative w-full flex-1" style={{ minHeight: 380, maxHeight: "65vh" }}>
        {/* next card peeking underneath */}
        {movies[index + 1]?.poster_path && (
          <div className="absolute inset-0 scale-95 overflow-hidden rounded-3xl opacity-60">
            <img
              src={`https://image.tmdb.org/t/p/w342${movies[index + 1].poster_path}`}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
        )}
        <SwipeCard key={movies[index].id} movie={movies[index]} onDecide={decide} />
      </div>
      <p className="mt-3 text-center text-xs text-zinc-500">{ui.swipeHint}</p>
      <div className="mt-3 flex justify-center gap-6">
        <button
          onClick={() => fire(false)}
          aria-label={ui.skip}
          className="rounded-full border border-zinc-700 bg-zinc-900 p-4 text-red-500 transition active:scale-90"
        >
          <X size={28} />
        </button>
        <button
          onClick={() => fire(true)}
          aria-label={ui.like}
          className="rounded-full border border-zinc-700 bg-zinc-900 p-4 text-green-500 transition active:scale-90"
        >
          <Heart size={28} />
        </button>
      </div>
    </SecretShell>
  );
}
