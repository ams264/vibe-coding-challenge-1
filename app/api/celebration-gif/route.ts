import { NextResponse } from 'next/server';

// Uses GIPHY_API_KEY env var; falls back to the public Giphy beta key for demos.
const API_KEY = process.env.GIPHY_API_KEY ?? 'dc6zaTOxFJmzC';

const QUERIES = [
  'celebration dance',
  'victory reaction',
  'happy winning',
  'party celebration',
  'excited celebration',
];

// GET /api/celebration-gif
// Returns an array of up to 25 family-friendly GIF URLs fetched from Giphy search.
// The client picks one at random so each win shows something different.
export async function GET() {
  const query = QUERIES[Math.floor(Math.random() * QUERIES.length)];
  const url =
    `https://api.giphy.com/v1/gifs/search` +
    `?api_key=${API_KEY}` +
    `&q=${encodeURIComponent(query)}` +
    `&limit=25` +
    `&rating=g` +
    `&lang=en`;

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } }); // cache 1 hr
    if (!res.ok) throw new Error('Giphy error');
    const json = await res.json();

    const gifUrls: string[] = (json?.data ?? [])
      .map((item: { images?: { original?: { url?: string } } }) => item?.images?.original?.url)
      .filter(Boolean);

    if (gifUrls.length === 0) throw new Error('No results');

    return NextResponse.json({ gifUrls });
  } catch {
    return NextResponse.json({ gifUrls: [] });
  }
}
