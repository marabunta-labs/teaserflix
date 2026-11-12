"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { Check, Copy, Users } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { closeParty, fetchParty, type PartyState } from "@/lib/party";
import { SecretShell } from "../../components/SecretShell";
import { PartyResults } from "../../components/PartyResults";

const POLL_MS = 2500;

export default function PartyHostPage() {
  const { code: rawCode } = useParams<{ code: string }>();
  const code = rawCode.toUpperCase();
  const { t } = useTranslation();
  const ui = t.secret.partyUi;

  const [state, setState] = useState<PartyState | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [joinUrl, setJoinUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setJoinUrl(`${window.location.origin}/secret/party/${code}/swipe`);
  }, [code]);

  const refresh = useCallback(async () => {
    try {
      setState(await fetchParty(code));
    } catch {
      // keep the last known state; next poll will retry
    } finally {
      setLoaded(true);
    }
  }, [code]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable (insecure context)
    }
  };

  if (loaded && !state) {
    return (
      <SecretShell title={ui.createTitle}>
        <p className="text-zinc-400">{ui.notFound}</p>
      </SecretShell>
    );
  }

  const joined = state?.participants.length ?? 0;
  const finished = state?.participants.filter((p) => p.finished).length ?? 0;
  const closed = state?.status === "closed";

  return (
    <SecretShell title={`${t.secret.party} · ${code}`}>
      {!closed && (
        <div className="mb-6 flex flex-col items-center rounded-2xl bg-white p-5">
          {joinUrl && <QRCodeSVG value={joinUrl} size={220} />}
          <p className="mt-3 text-xs font-bold uppercase tracking-widest text-zinc-500">{ui.scanToJoin}</p>
          <p className="text-3xl font-black tracking-[0.3em] text-black">{code}</p>
        </div>
      )}
      {closed && <p className="mb-4 text-sm text-zinc-400">{ui.sessionClosed}</p>}

      <div className="mb-6 grid grid-cols-2 gap-2 text-center">
        <div className="rounded-xl bg-zinc-900 p-3">
          <p className="flex items-center justify-center gap-1 text-2xl font-black">
            <Users size={18} /> {joined}
          </p>
          <p className="text-xs text-zinc-500">{ui.joined}</p>
        </div>
        <div className="rounded-xl bg-zinc-900 p-3">
          <p className="text-2xl font-black">
            {finished}/{joined}
          </p>
          <p className="text-xs text-zinc-500">{ui.finished}</p>
        </div>
      </div>

      {state && <PartyResults state={state} />}

      <div className="mt-8 space-y-2">
        {!closed && (
          <>
            <Link
              href={`/secret/party/${code}/swipe`}
              className="block w-full rounded-full bg-red-600 py-3 text-center font-bold uppercase tracking-widest"
            >
              {ui.joinMyself}
            </Link>
            <button
              onClick={copy}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 py-3 text-sm"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? ui.copied : ui.joinLink}
            </button>
            <button
              onClick={async () => {
                await closeParty(code);
                refresh();
              }}
              className="w-full py-3 text-sm text-zinc-500"
            >
              {ui.closeSession}
            </button>
          </>
        )}
        {closed && (
          <Link href="/secret/party" className="block w-full rounded-full bg-red-600 py-3 text-center font-bold">
            {ui.newSession}
          </Link>
        )}
      </div>
    </SecretShell>
  );
}
