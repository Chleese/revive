import { NextRequest, NextResponse } from "next/server";
import { fetchGenericWebMetadata } from "@/lib/metadata/parsers/generic";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  const data = await fetchGenericWebMetadata(url);
  return NextResponse.json(data);
}
