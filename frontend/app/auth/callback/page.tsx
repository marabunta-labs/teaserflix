"use client";

// OAuth / magic-link / password-recovery callback page.
// After the provider redirects here, the Supabase client processes the URL
// and fires onAuthStateChange. We redirect based on the event type:
//   PASSWORD_RECOVERY → /reset-password
//   SIGNED_IN         → ?next= param or feed

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const next = searchParams.get("next") || "/";

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "PASSWORD_RECOVERY") {
          console.log("[AuthCallback] PASSWORD_RECOVERY → /reset-password");
          subscription.unsubscribe();
          router.replace("/reset-password");
          return;
        }
        if (event === "SIGNED_IN" && session) {
          console.log("[AuthCallback] SIGNED_IN → redirecting to", next);
          subscription.unsubscribe();
          router.replace(next);
        }
      },
    );

    // In case the session is already available (PKCE code already exchanged)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        console.log("[AuthCallback] Session already active → redirecting to", next);
        subscription.unsubscribe();
        router.replace(next);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-black">
      <div className="text-center">
        <img src="/logo.gif" alt="" className="w-32 h-auto mx-auto mb-4" />
        <p className="text-zinc-400 text-sm">Iniciando sesión…</p>
      </div>
    </div>
  );
}

const Loading = () => (
  <div className="flex h-screen w-full items-center justify-center bg-black">
    <img src="/logo.gif" alt="" className="w-32 h-auto" />
  </div>
);

export default function AuthCallback() {
  return (
    <Suspense fallback={<Loading />}>
      <AuthCallbackInner />
    </Suspense>
  );
}
