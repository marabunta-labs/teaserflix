"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { useTranslation } from "@/lib/i18n";

// Map Supabase English error messages to localised strings
const AUTH_ERRORS: Record<string, { es: string; en: string }> = {
  "Invalid login credentials":           { es: "Credenciales incorrectas. Comprueba tu email y contraseña.",   en: "Incorrect email or password." },
  "Email not confirmed":                  { es: "Email no confirmado. Revisa tu bandeja de entrada.",            en: "Email not confirmed. Check your inbox." },
  "User already registered":              { es: "Este email ya está registrado.",                                en: "This email is already registered." },
  "Password should be at least 6":        { es: "La contraseña debe tener al menos 6 caracteres.",              en: "Password must be at least 6 characters." },
  "Unable to validate email address":     { es: "Formato de email inválido.",                                    en: "Invalid email format." },
  "Email rate limit exceeded":            { es: "Demasiados intentos. Espera unos minutos.",                    en: "Too many attempts. Please wait a moment." },
  "over_email_send_rate_limit":           { es: "Demasiados intentos. Espera unos minutos.",                    en: "Too many attempts. Please wait a moment." },
  "signup_disabled":                      { es: "El registro está deshabilitado temporalmente.",                 en: "Sign up is temporarily disabled." },
  "For security purposes":                { es: "Por seguridad, espera unos segundos antes de volver a intentarlo.", en: "For security purposes, please wait before retrying." },
};

function translateAuthError(msg: string, locale: string): string {
  for (const [key, map] of Object.entries(AUTH_ERRORS)) {
    if (msg.includes(key)) return map[(locale as "es" | "en") in map ? (locale as "es" | "en") : "en"];
  }
  return msg;
}

export default function LoginPage() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const [mode, setMode] = useState<"sign_in" | "sign_up" | "forgot">("sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Redirect to feed if already authenticated
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/");
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (session) router.replace("/");
    });
    return () => subscription.unsubscribe();
  }, [router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
      if (error) { setError(translateAuthError(error.message, locale)); } else { setMessage(t.login.resetSent); }
      setLoading(false);
      return;
    }

    if (mode === "sign_in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError(translateAuthError(error.message, locale)); setLoading(false); }
      // On success, onAuthStateChange above redirects
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(translateAuthError(error.message, locale));
      } else {
        setMessage(t.login.successMessage);
      }
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  const inputCls =
    "w-full rounded-lg bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500 border border-zinc-700 focus:border-red-500 focus:outline-none transition";

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-black p-4">
      <div className="w-full max-w-md rounded-2xl bg-zinc-900 p-8 border border-zinc-800 shadow-2xl">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <Image
            src="/logo.png"
            alt="TeaserFlix"
            width={2816}
            height={1536}
            style={{ width: "240px", height: "auto" }}
            className="object-contain"
            priority
          />
        </div>

        {/* Email / password form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "forgot" && (
            <p className="text-zinc-400 text-sm text-center">{t.login.forgotDesc}</p>
          )}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            autoComplete="email"
            className={inputCls}
          />
          {mode !== "forgot" && (
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.login.passwordPlaceholder}
              required
              autoComplete={mode === "sign_in" ? "current-password" : "new-password"}
              className={inputCls}
            />
          )}

          {error && <p className="text-red-500 text-sm">{error}</p>}
          {message && <p className="text-green-500 text-sm">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-red-600 py-3 font-bold text-white uppercase tracking-widest hover:bg-red-700 disabled:opacity-50 transition"
          >
            {loading ? "…" : mode === "forgot" ? t.login.sendReset : mode === "sign_in" ? t.login.signIn : t.login.createAccount}
          </button>
        </form>

        {mode === "forgot" ? (
          <button
            onClick={() => { setMode("sign_in"); setError(""); setMessage(""); }}
            className="mt-4 w-full text-zinc-500 text-sm hover:text-zinc-300 transition"
          >
            {t.login.backToLogin}
          </button>
        ) : (
          <>
            {/* Google OAuth */}
            <button
              onClick={handleGoogle}
              disabled={loading}
              className="mt-3 w-full rounded-full border border-zinc-700 bg-zinc-800 py-3 text-sm text-white hover:border-zinc-500 transition flex items-center justify-center gap-2"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"/>
                <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58Z"/>
              </svg>
              {t.login.googleContinue}
            </button>

            {/* Forgot password */}
            {mode === "sign_in" && (
              <button
                onClick={() => { setMode("forgot"); setError(""); setMessage(""); }}
                className="mt-2 w-full text-zinc-600 text-xs hover:text-zinc-400 transition"
              >
                {t.login.forgotPassword}
              </button>
            )}

            {/* Toggle sign-in / sign-up */}
            <button
              onClick={() => { setMode(mode === "sign_in" ? "sign_up" : "sign_in"); setError(""); setMessage(""); }}
              className="mt-2 w-full text-zinc-500 text-sm hover:text-zinc-300 transition"
            >
              {mode === "sign_in" ? t.login.switchToSignUp : t.login.switchToSignIn}
            </button>

            {/* Continue as guest */}
            <div className="mt-6 border-t border-zinc-800 pt-6 text-center">
              <p className="mb-3 text-xs text-zinc-600">
                {t.login.guestNote}
              </p>
              <button
                onClick={() => router.push("/")}
                className="w-full rounded-full border border-zinc-700 py-3 text-sm text-zinc-400 hover:text-white hover:border-zinc-500 transition"
              >
                {t.login.continueGuest}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Marabunta Labs footer */}
      <div className="mt-6 text-center space-y-1">
        <p className="text-zinc-600 text-xs">
          Made with ♥ by{" "}
          <a
            href="https://marabunta-labs.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-500 hover:text-white transition"
          >
          Marabunta Labs
          </a>
        </p>
        <p className="text-zinc-700 text-xs">
          <a href="/terms" className="hover:text-zinc-500 transition">Terms &amp; Conditions</a>
          {" · "}
          <a href="/privacy" className="hover:text-zinc-500 transition">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}
