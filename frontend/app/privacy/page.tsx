import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "TeaserFlix Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-black text-zinc-300 px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-zinc-500 hover:text-white text-sm mb-10 transition"
        >
          <ChevronLeft size={16} />
          Back to TeaserFlix
        </Link>

        <h1 className="text-3xl font-black text-white mb-2 tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-zinc-600 text-sm mb-10">Last updated: May 2026</p>

        <div className="space-y-8 text-sm leading-relaxed">
          <section>
            <h2 className="text-white font-bold text-base mb-2">1. Data We Collect</h2>
            <p className="text-zinc-400">
              When you create an account, we collect your email address and store it
              securely via Supabase Auth. We also store:
            </p>
            <ul className="list-disc list-inside mt-2 text-zinc-400 space-y-1">
              <li>Movies you like or add to your watchlist</li>
              <li>Your viewing interactions (watch time, genre preferences) to power recommendations</li>
              <li>Your selected genre and platform preferences</li>
            </ul>
            <p className="text-zinc-400 mt-2">
              Guest users: no personal data is stored server-side. Preferences are saved only in
              your device&apos;s localStorage.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">2. How We Use Your Data</h2>
            <p className="text-zinc-400">
              Your data is used exclusively to personalize your movie feed and watchlist. We do
              not sell, share, or use your data for advertising purposes.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">3. Third-Party Services</h2>
            <ul className="list-disc list-inside text-zinc-400 space-y-1">
              <li>
                <strong className="text-zinc-300">TMDB</strong> — movie metadata and posters.{" "}
                <a href="https://www.themoviedb.org/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-red-500 hover:text-red-400 transition">Privacy Policy</a>
              </li>
              <li>
                <strong className="text-zinc-300">YouTube</strong> — trailer playback.{" "}
                <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-red-500 hover:text-red-400 transition">Privacy Policy</a>
              </li>
              <li>
                <strong className="text-zinc-300">Supabase</strong> — authentication and database.{" "}
                <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-red-500 hover:text-red-400 transition">Privacy Policy</a>
              </li>
              <li>
                <strong className="text-zinc-300">Vercel Analytics</strong> — anonymous usage analytics.{" "}
                <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-red-500 hover:text-red-400 transition">Privacy Policy</a>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">4. Data Retention &amp; Deletion</h2>
            <p className="text-zinc-400">
              You can delete your account at any time from your profile page. This permanently
              removes all your data from our servers.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">5. Cookies &amp; Local Storage</h2>
            <p className="text-zinc-400">
              We use browser localStorage to remember your language preference, auth session,
              and (for guests) which movies you&apos;ve already seen. No tracking cookies are used.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">6. Contact</h2>
            <p className="text-zinc-400">
              For privacy inquiries, reach us at{" "}
              <a
                href="https://marabunta-labs.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-500 hover:text-red-400 transition"
              >
                marabunta-labs.vercel.app
              </a>
              .
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-zinc-900 text-zinc-700 text-xs text-center">
          © {new Date().getFullYear()} Marabunta Labs · TeaserFlix
        </div>
      </div>
    </main>
  );
}
