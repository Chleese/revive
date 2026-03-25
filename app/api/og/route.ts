import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

interface OpenGraphData {
  title?: string;
  image?: string;
  description?: string;
}

/**
 * 获取网页的 Open Graph 元数据
 */
async function fetchOpenGraph(url: string): Promise<OpenGraphData> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Referer": "https://www.google.com/",
      },
      redirect: "follow", // 跟随重定向
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error("Response not OK:", response.status, response.statusText);
      return {};
    }

    const html = await response.text();

    // 提取 Open Graph 元数据（支持单引号和双引号）
    const titleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
    const imageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
    const descMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);

    // 如果没有 og:title，尝试获取普通 title
    let plainTitleMatch: RegExpMatchArray | null = null;
    if (!titleMatch) {
      plainTitleMatch = html.match(/<title>([^<]+)<\/title>/i);
    }

    const result = {
      title: titleMatch?.[1] || plainTitleMatch?.[1],
      image: imageMatch?.[1],
      description: descMatch?.[1],
    };

    console.log("OG data extracted:", result);
    return result;
  } catch (error) {
    console.error("Failed to fetch Open Graph data:", error);
    return {};
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  console.log("Fetching OG for:", url);
  const data = await fetchOpenGraph(url);
  return NextResponse.json(data);
}
