import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });

  try {
    // Microlink handles JS-rendered pages and Cloudflare-protected sites (free, no key).
    const res = await fetch(
      `https://api.microlink.io/?url=${encodeURIComponent(url)}&meta=false`,
      { next: { revalidate: 3600 } }
    );

    if (!res.ok) return NextResponse.json({ image: null });

    const json = await res.json();
    const image =
      json?.data?.image?.url ??
      json?.data?.logo?.url ??
      null;

    return NextResponse.json({ image });
  } catch {
    return NextResponse.json({ image: null });
  }
}
