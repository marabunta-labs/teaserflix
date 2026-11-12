"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "@/lib/i18n";

export function SecretShell({
  title,
  backHref = "/secret",
  children,
}: {
  title: string;
  backHref?: string;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex w-full flex-col bg-black text-white" style={{ minHeight: "var(--app-height, 100dvh)" }}>
      <header
        className="sticky top-0 z-10 flex items-center gap-2 border-b border-zinc-900 bg-black/90 px-4 pb-3 backdrop-blur-lg"
        style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
      >
        <Link href={backHref} aria-label={t.secret.back} className="-ml-2 rounded-full p-2 hover:bg-zinc-900">
          <ChevronLeft size={22} />
        </Link>
        <h1 className="text-lg font-black uppercase tracking-tighter">{title}</h1>
      </header>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-5">{children}</div>
    </div>
  );
}
