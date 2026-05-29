import { NextRequest, NextResponse } from "next/server";

const TMDB_BASE = "https://api.themoviedb.org/3";

// Allowed TMDB path prefixes — reject anything not on this list
const ALLOWED_PREFIXES = [
  "movie/",
  "trending/movie/",
  "discover/movie",
  "search/movie",
  "person/",
];

function isAllowedPath(path: string): boolean {
  return ALLOWED_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "TMDB API key not configured" },
      { status: 500 },
    );
  }

  const { path } = await params;
  const tmdbPath = path.join("/");

  // Validate the path to prevent arbitrary TMDB API access
  if (!isAllowedPath(tmdbPath)) {
    return NextResponse.json(
      { error: "Forbidden path" },
      { status: 403 },
    );
  }

  const searchParams = request.nextUrl.searchParams;

  const url = new URL(`${TMDB_BASE}/${tmdbPath}`);
  searchParams.forEach((value, key) => url.searchParams.set(key, value));
  url.searchParams.set("api_key", apiKey);

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      next: { revalidate: 300 },
    });
    const data = await res.json();
    return NextResponse.json(data, {
      status: res.status,
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch {
    return NextResponse.json({ error: "TMDB fetch failed" }, { status: 502 });
  }
}
