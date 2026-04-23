import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { isUrlSafe } from "@/lib/url-safety";

const IMAGE_REQUEST_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
  Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
  "Accept-Language": "zh-CN,zh;q=0.9",
};

function resolveImageReferer(imageUrl: string, sourceUrl: string | null): string {
  if (!sourceUrl || !isUrlSafe(sourceUrl)) {
    return "https://www.google.com/";
  }

  try {
    const imageHost = new URL(imageUrl).hostname.toLowerCase();
    const sourceHost = new URL(sourceUrl).hostname.toLowerCase();

    const isWechatArticle = sourceHost === "mp.weixin.qq.com";
    const isWechatImageHost =
      imageHost.endsWith("qpic.cn") || imageHost.endsWith("weixin.qq.com");

    if (isWechatArticle && isWechatImageHost) {
      return sourceUrl;
    }
  } catch {
    return "https://www.google.com/";
  }

  return "https://www.google.com/";
}

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = request.nextUrl.searchParams.get("url");
  const source = request.nextUrl.searchParams.get("source");

  if (!url) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  if (!isUrlSafe(url)) {
    return NextResponse.json({ error: "url is not allowed" }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const referer = resolveImageReferer(url, source);

    const response = await fetch(url, {
      headers: {
        ...IMAGE_REQUEST_HEADERS,
        Referer: referer,
      },
      redirect: "follow",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return NextResponse.json({ error: "image fetch failed" }, { status: response.status });
    }

    const contentType = response.headers.get("content-type") ?? "application/octet-stream";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: "remote resource is not an image" }, { status: 415 });
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer());

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "image proxy failed" }, { status: 502 });
  }
}
