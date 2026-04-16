import type { GenericWebMetadata } from "@/lib/metadata/types";
import { isMeaningfulTitle, sanitizeTitle } from "@/lib/metadata/normalize";

const REQUEST_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "zh-CN,zh;q=0.9",
  Referer: "https://www.google.com/",
};

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function extractMetaContent(html: string, key: string): string | undefined {
  const patterns = [
    new RegExp(
      `<meta\\s+[^>]*property=["']${key}["'][^>]*content=["']([^"']+)["'][^>]*>`,
      "i"
    ),
    new RegExp(
      `<meta\\s+[^>]*content=["']([^"']+)["'][^>]*property=["']${key}["'][^>]*>`,
      "i"
    ),
    new RegExp(
      `<meta\\s+[^>]*name=["']${key}["'][^>]*content=["']([^"']+)["'][^>]*>`,
      "i"
    ),
    new RegExp(
      `<meta\\s+[^>]*content=["']([^"']+)["'][^>]*name=["']${key}["'][^>]*>`,
      "i"
    ),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return decodeHtmlEntities(match[1].trim());
    }
  }

  return undefined;
}

function sanitizeMetaTitle(value?: string): string | undefined {
  if (!value) return undefined;
  const sanitized = sanitizeTitle(value);
  return sanitized || undefined;
}

function resolveUrlCandidate(candidate: string | undefined, baseUrl: string): string | undefined {
  if (!candidate) return undefined;

  try {
    return new URL(candidate.trim(), baseUrl).toString();
  } catch {
    return undefined;
  }
}

function extractTitleTag(html: string): string | undefined {
  const match = html.match(/<title>([^<]+)<\/title>/i);
  return match?.[1] ? sanitizeTitle(match[1]) : undefined;
}

function extractLinkImageHref(html: string, baseUrl: string): string | undefined {
  const patterns = [
    /<link\s+[^>]*rel=["']image_src["'][^>]*href=["']([^"']+)["'][^>]*>/i,
    /<link\s+[^>]*href=["']([^"']+)["'][^>]*rel=["']image_src["'][^>]*>/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return resolveUrlCandidate(decodeHtmlEntities(match[1]), baseUrl);
    }
  }

  return undefined;
}

function findJsonLdTitleField(input: unknown, keys: string[]): string | undefined {
  if (!input) return undefined;

  if (Array.isArray(input)) {
    for (const item of input) {
      const value = findJsonLdTitleField(item, keys);
      if (value) return value;
    }
    return undefined;
  }

  if (typeof input === "object") {
    const record = input as Record<string, unknown>;

    for (const key of keys) {
      const value = record[key];
      if (typeof value === "string" && isMeaningfulTitle(value)) {
        return sanitizeTitle(value);
      }
      if (Array.isArray(value)) {
        const nestedValue = value.find((item): item is string => typeof item === "string");
        if (nestedValue && isMeaningfulTitle(nestedValue)) {
          return sanitizeTitle(nestedValue);
        }
      }
    }

    for (const value of Object.values(record)) {
      const nested = findJsonLdTitleField(value, keys);
      if (nested) return nested;
    }
  }

  return undefined;
}

function findJsonLdImageField(input: unknown): string | undefined {
  if (!input) return undefined;

  if (typeof input === "string") {
    return input.trim() || undefined;
  }

  if (Array.isArray(input)) {
    for (const item of input) {
      const value = findJsonLdImageField(item);
      if (value) return value;
    }
    return undefined;
  }

  if (typeof input === "object") {
    const record = input as Record<string, unknown>;

    for (const key of ["image", "thumbnailUrl", "url"]) {
      const value = record[key];
      const nested = findJsonLdImageField(value);
      if (nested) return nested;
    }

    for (const value of Object.values(record)) {
      const nested = findJsonLdImageField(value);
      if (nested) return nested;
    }
  }

  return undefined;
}

function extractJsonLdMetadata(html: string): GenericWebMetadata {
  const scripts = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];

  for (const script of scripts) {
    const rawJson = script[1]?.trim();
    if (!rawJson) continue;

    try {
      const parsed = JSON.parse(rawJson);
      const title = findJsonLdTitleField(parsed, ["headline", "name"]);
      const image = findJsonLdImageField(parsed);

      if (title || image) {
        return {
          title,
          image,
          metadataSource: "json_ld",
          metadataConfidence: title ? 0.9 : 0.7,
        };
      }
    } catch {
      continue;
    }
  }

  return {};
}

export async function fetchGenericWebMetadata(url: string): Promise<GenericWebMetadata> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      headers: REQUEST_HEADERS,
      redirect: "follow",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {};
    }

    const html = await response.text();
    const ogTitle = sanitizeMetaTitle(extractMetaContent(html, "og:title"));
    const twitterTitle = sanitizeMetaTitle(extractMetaContent(html, "twitter:title"));
    const ogImage =
      resolveUrlCandidate(extractMetaContent(html, "og:image"), url) ??
      resolveUrlCandidate(extractMetaContent(html, "og:image:url"), url) ??
      resolveUrlCandidate(extractMetaContent(html, "og:image:secure_url"), url);
    const twitterImage =
      resolveUrlCandidate(extractMetaContent(html, "twitter:image"), url) ??
      resolveUrlCandidate(extractMetaContent(html, "twitter:image:src"), url);
    const linkedImage = extractLinkImageHref(html, url);
    const jsonLdMetadata = extractJsonLdMetadata(html);
    const jsonLdImage = resolveUrlCandidate(jsonLdMetadata.image, url);
    const bestImage = ogImage ?? twitterImage ?? jsonLdImage ?? linkedImage;

    if (isMeaningfulTitle(ogTitle)) {
      return {
        title: ogTitle,
        image: bestImage,
        metadataSource: "og",
        metadataConfidence: 0.95,
      };
    }

    if (isMeaningfulTitle(jsonLdMetadata.title)) {
      return jsonLdMetadata;
    }

    if (isMeaningfulTitle(twitterTitle)) {
      return {
        title: twitterTitle,
        image: bestImage,
        metadataSource: "title_tag",
        metadataConfidence: 0.72,
      };
    }

    const titleTag = extractTitleTag(html);
    if (isMeaningfulTitle(titleTag)) {
      return {
        title: titleTag,
        image: bestImage,
        metadataSource: "title_tag",
        metadataConfidence: 0.72,
      };
    }

    if (bestImage) {
      return {
        image: bestImage,
        metadataSource: jsonLdImage ? "json_ld" : "og",
        metadataConfidence: jsonLdImage ? 0.7 : 0.6,
      };
    }

    return {};
  } catch {
    return {};
  }
}
