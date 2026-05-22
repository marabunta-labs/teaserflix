import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClientProviders } from "@/app/components/ClientProviders";
import { Analytics } from "@vercel/analytics/next"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: {
    default: "TeaserFlix — Swipe Movie Trailers & Discover Films",
    template: "%s | TeaserFlix",
  },
  description:
    "TikTok for movies. Swipe through infinite trailers, save your watchlist, and get personalized recommendations. Descubre tu próxima película favorita en segundos.",
  keywords: [
    // TikTok-style movie discovery
    "tiktok for movies",
    "tiktok movies",
    "tiktokmovies",
    "tiktok trailer",
    "movie tiktok",
    "movies swipe",
    "swipe movies",
    "movie scroll",
    "scroll movies",
    "trailer flix",
    "trailerflix",
    "movie feed",
    "infinite movie trailers",
    "movie discovery app",
    "swipe trailers",
    "trailer swipe",
    "short movie trailers",
    "movie reels",
    // Generic discovery
    "discover movies",
    "movie recommendations",
    "personalized movie recommendations",
    "what to watch",
    "movie watchlist",
    "best movies to watch",
    "find movies",
    // Spanish
    "películas",
    "tráilers",
    "descubrir películas",
    "recomendaciones de películas",
    "qué ver",
    "watchlist películas",
    "tráilers cortos",
    "feed de tráilers",
    "películas para ver",
    // Brand
    "TeaserFlix",
    "teaserflix",
    // Streaming context
    "streaming",
    "netflix",
    "prime video",
    "disney plus",
    "movies",
    "trailers",
    "cinema",
    "film discovery",
  ],
  authors: [{ name: "Marabunta Labs", url: "https://marabunta-labs.vercel.app" }],
  creator: "Marabunta Labs",
  publisher: "Marabunta Labs",
  metadataBase: new URL("https://teaserflix.vercel.app"),
  alternates: {
    canonical: "/",
    languages: {
      "es": "https://teaserflix.vercel.app",
      "en": "https://teaserflix.vercel.app",
      "x-default": "https://teaserflix.vercel.app",
    },
  },
  verification: {
    google: "9E9qC957fjoZRJkZ-oF2MVGW07hf21zbklJXKRMtToY",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    alternateLocale: ["es_ES"],
    url: "https://teaserflix.vercel.app",
    siteName: "TeaserFlix",
    title: "TeaserFlix — TikTok for Movies",
    description:
      "Swipe through infinite trailers, save your watchlist, and get personalized movie recommendations. · Descubre tu próxima película favorita deslizando tráilers.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "TeaserFlix — Swipe movie trailers",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TeaserFlix — TikTok for Movies",
    description:
      "Swipe trailers. Discover films. Save your watchlist. · Desliza tráilers. Descubre películas.",
    images: ["/og-image.png"],
    creator: "@marabunta_labs",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ClientProviders>
          {children}
        </ClientProviders>
        <Analytics />
      </body>
    </html>
  );
}