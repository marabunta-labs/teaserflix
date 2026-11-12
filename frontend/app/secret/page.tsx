"use client";

import Link from "next/link";
import { MessageCircleQuestion, QrCode } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { SecretShell } from "./components/SecretShell";

export default function SecretMenu() {
  const { t } = useTranslation();
  const items = [
    { href: "/secret/akinator", icon: MessageCircleQuestion, title: t.secret.akinator, desc: t.secret.akinatorDesc },
    { href: "/secret/party", icon: QrCode, title: t.secret.party, desc: t.secret.partyDesc },
  ];
  return (
    <SecretShell title={t.secret.title} backHref="/">
      <p className="mb-6 text-sm text-zinc-400">{t.secret.subtitle} 🤫</p>
      <div className="space-y-3">
        {items.map(({ href, icon: Icon, title, desc }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 transition active:scale-[0.98] hover:border-red-600"
          >
            <Icon size={28} className="shrink-0 text-red-600" />
            <div>
              <p className="font-bold">{title}</p>
              <p className="text-sm text-zinc-400">{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </SecretShell>
  );
}
