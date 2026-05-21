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
    default: "TeaserFlix — Descubre películas a través de sus tráilers",
    template: "%s | TeaserFlix",
  },
  description:
    "Descubre tu próxima película favorita en segundos. TeaserFlix es un feed infinito de tráilers con recomendaciones personalizadas.",
  keywords: [
    "películas",
    "tráilers",
    "movies",
    "trailers",
    "recomendaciones",
    "watchlist",
    "streaming",
    "TeaserFlix",
  ],
  authors: [{ name: "Marabunta Labs", url: "https://marabunta-labs.vercel.app" }],
  creator: "Marabunta Labs",
  publisher: "Marabunta Labs",
  metadataBase: new URL("https://teaserflix.vercel.app"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "es_ES",
    alternateLocale: "en_US",
    url: "https://teaserflix.vercel.app",
    siteName: "TeaserFlix",
    title: "TeaserFlix — Descubre películas a través de sus tráilers",
    description:
      "Feed infinito de tráilers con recomendaciones personalizadas. Guarda tu watchlist, filtra por plataforma y género.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "TeaserFlix — feed infinito de tráilers",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TeaserFlix — Descubre películas a través de sus tráilers",
    description:
      "Feed infinito de tráilers con recomendaciones personalizadas.",
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
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}

