"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { useTranslation } from "@/lib/i18n";

const LABELS = {
  es: {
    title: "Nueva contraseña",
    subtitle: "Elige una contraseña segura para tu cuenta.",
    newPassword: "Nueva contraseña",
    confirmPassword: "Confirmar contraseña",
    submit: "Actualizar contraseña",
    mismatch: "Las contraseñas no coinciden.",
    tooShort: "La contraseña debe tener al menos 6 caracteres.",
    success: "¡Contraseña actualizada! Redirigiendo…",
  },
  en: {
    title: "New password",
    subtitle: "Choose a secure password for your account.",
    newPassword: "New password",
    confirmPassword: "Confirm password",
    submit: "Update password",
    mismatch: "Passwords don't match.",
    tooShort: "Password must be at least 6 characters.",
    success: "Password updated! Redirecting…",
  },
} as const;

export default function ResetPasswordPage() {
  const router = useRouter();
  const { locale } = useTranslation();
  const l = LABELS[(locale as keyof typeof LABELS) ?? "es"] ?? LABELS.es;

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  // Guard: ensure there is an active recovery session; otherwise send to login
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/login");
    });
  }, [router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError(l.mismatch); return; }
    if (password.length < 6) { setError(l.tooShort); return; }

    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) {
      setError(err.message);
      setLoading(false);
    } else {
      setDone(true);
      setTimeout(() => router.replace("/"), 2000);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-black p-4">
      {/* Logo */}
      <div className="mb-8 flex justify-center">
        <Image
          src="/logo.png"
          alt="TeaserFlix"
          width={2816}
          height={1536}
          style={{ width: "200px", height: "auto" }}
          className="object-contain"
          priority
        />
      </div>

      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-center text-2xl font-bold text-white">{l.title}</h1>
        <p className="mb-6 text-center text-sm text-zinc-400">{l.subtitle}</p>

        {done ? (
          <div className="rounded-xl bg-green-500/10 border border-green-500/30 px-4 py-4 text-center text-green-400 text-sm">
            {l.success}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="password"
              placeholder={l.newPassword}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-white placeholder-zinc-500 outline-none focus:ring-2 focus:ring-red-600"
            />
            <input
              type="password"
              placeholder={l.confirmPassword}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-white placeholder-zinc-500 outline-none focus:ring-2 focus:ring-red-600"
            />

            {error && (
              <p className="rounded-xl bg-red-500/10 px-4 py-2 text-center text-sm text-red-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-red-600 py-3 font-semibold text-white transition hover:bg-red-500 active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {l.submit}
                </span>
              ) : l.submit}
            </button>
          </form>
        )}
      </div>

      {/* Footer */}
      <p className="mt-10 text-center text-[11px] text-zinc-600">
        Powered by{" "}
        <a
          href="https://marabunta-labs.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-zinc-400"
        >
          Marabunta Labs
        </a>
      </p>
    </div>
  );
}
