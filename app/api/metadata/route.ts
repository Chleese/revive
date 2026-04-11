import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { isUrlSafe } from "@/lib/url-safety";
import { resolveMetadata } from "@/lib/metadata/resolve";

export const runtime = "nodejs";

async function authenticate() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

function validateTargetUrl(rawInput: string): string | null {
  try {
    const url = new URL(rawInput);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return isUrlSafe(rawInput) ? rawInput : null;
  } catch {
    // 非 URL 格式的分享文本，放行（resolveMetadata 内部会处理）
    return rawInput;
  }
}

export async function GET(request: NextRequest) {
  const user = await authenticate();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rawInput = request.nextUrl.searchParams.get("rawInput");
  const url = request.nextUrl.searchParams.get("url");
  const target = rawInput ?? url;

  if (!target) {
    return NextResponse.json({ error: "rawInput is required" }, { status: 400 });
  }

  const validated = validateTargetUrl(target);
  if (!validated) {
    return NextResponse.json({ error: "url is not allowed" }, { status: 400 });
  }

  const data = await resolveMetadata(validated);
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const user = await authenticate();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { rawInput?: string } | null;
  const rawInput = body?.rawInput?.trim();

  if (!rawInput) {
    return NextResponse.json({ error: "rawInput is required" }, { status: 400 });
  }

  const validated = validateTargetUrl(rawInput);
  if (!validated) {
    return NextResponse.json({ error: "url is not allowed" }, { status: 400 });
  }

  const data = await resolveMetadata(validated);
  return NextResponse.json(data);
}
