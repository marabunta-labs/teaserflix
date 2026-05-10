"use client";

// OAuth callback page.
// After the provider (e.g. Google) redirects here, the Supabase client
// detects the session from the URL hash or `code` param and fires
// onAuthStateChange(SIGNED_IN). We then redirect to the feed.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // onAuthStateChange fires as soon as the client processes the URL fragment
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN" && session) {
          console.log("[AuthCallback] SIGNED_IN → redirecting to feed");
          subscription.unsubscribe();
          router.replace("/");
        }
      },
    );

    // In case the session is already available (e.g. PKCE code already exchanged)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        console.log("[AuthCallback] Session already active → redirecting to feed");
        subscription.unsubscribe();
        router.replace("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-black text-white">
      <div className="text-center">
        <div className="mb-4 mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
        <p className="text-zinc-400 text-sm">Iniciando sesión…</p>
      </div>
    </div>
  );
}
