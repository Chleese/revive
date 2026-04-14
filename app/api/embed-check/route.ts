import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { isUrlSafe } from "@/lib/url-safety";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  if (!isUrlSafe(url)) {
    return NextResponse.json({ error: "url is not allowed" }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      method: "HEAD",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const xFrameOptions = response.headers.get("x-frame-options");
    const csp = response.headers.get("content-security-policy");

    // X-Frame-Options: DENY or SAMEORIGIN → not embeddable
    if (xFrameOptions) {
      const value = xFrameOptions.toUpperCase().trim();
      if (value === "DENY" || value === "SAMEORIGIN") {
        return NextResponse.json({ embeddable: false });
      }
    }

    // Content-Security-Policy frame-ancestors blocking
    if (csp) {
      const frameAncestorsMatch = csp.match(/frame-ancestors\s+([^;]+)/i);
      if (frameAncestorsMatch) {
        const directives = frameAncestorsMatch[1].trim();
        // 'none' blocks all, 'self' blocks cross-origin
        if (directives === "'none'" || directives === "'self'") {
          return NextResponse.json({ embeddable: false });
        }
      }
    }

    return NextResponse.json({ embeddable: true });
  } catch {
    // Request failed — safe default is not embeddable
    return NextResponse.json({ embeddable: false });
  }
}
