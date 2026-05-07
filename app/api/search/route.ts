import { NextRequest, NextResponse } from "next/server";
import { searchAnime } from "@/lib/anilist";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const perPage = parseInt(searchParams.get("perPage") ?? "24", 10);
  const genresParam = searchParams.get("genres");
  const genres = genresParam ? genresParam.split(",") : undefined;

  try {
    const data = await searchAnime(q || " ", page, perPage, genres);
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to search" }, { status: 500 });
  }
}
