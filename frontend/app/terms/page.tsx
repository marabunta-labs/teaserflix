import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "TeaserFlix Terms and Conditions of Use",
};

export default function TermsPage() {
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
          Terms &amp; Conditions
        </h1>
        <p className="text-zinc-600 text-sm mb-10">Last updated: May 2026</p>

        <div className="space-y-8 text-sm leading-relaxed">
          <section>
            <h2 className="text-white font-bold text-base mb-2">1. Acceptance</h2>
            <p className="text-zinc-400">
              By using TeaserFlix you agree to these Terms. If you disagree, please do not use
              the service. TeaserFlix is an independent project developed by{" "}
              <a
                href="https://marabunta-labs.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-500 hover:text-red-400 transition"
              >
                Marabunta Labs
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">2. Service Description</h2>
            <p className="text-zinc-400">
              TeaserFlix is a movie discovery platform that displays publicly available trailers
              via the TMDB API and YouTube. We do not host any video content directly.
              Movie data is provided by{" "}
              <a
                href="https://www.themoviedb.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-500 hover:text-red-400 transition"
              >
                The Movie Database (TMDB)
              </a>
              . This product uses the TMDB API but is not endorsed or certified by TMDB.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">3. User Accounts</h2>
            <p className="text-zinc-400">
              You may use TeaserFlix as a guest or by creating an account. You are responsible
              for maintaining the security of your credentials. We reserve the right to
              terminate accounts that violate these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">4. Intellectual Property</h2>
            <p className="text-zinc-400">
              The TeaserFlix brand, logo, and original codebase are property of Marabunta Labs.
              Movie posters, titles, and descriptions are the property of their respective
              studios. Trailers are served from YouTube and are subject to YouTube&apos;s Terms of
              Service.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">5. Disclaimer of Warranties</h2>
            <p className="text-zinc-400">
              TeaserFlix is provided &ldquo;as is&rdquo; without warranty of any kind. We do not guarantee
              uninterrupted service, accuracy of movie data, or availability of specific trailers.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">6. Limitation of Liability</h2>
            <p className="text-zinc-400">
              Marabunta Labs shall not be liable for any indirect, incidental, or consequential
              damages arising from your use of TeaserFlix.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">7. Changes to Terms</h2>
            <p className="text-zinc-400">
              We may update these Terms at any time. Continued use of the service constitutes
              acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">8. Contact</h2>
            <p className="text-zinc-400">
              Questions? Reach us at{" "}
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
