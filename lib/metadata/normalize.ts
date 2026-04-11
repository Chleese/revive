import { getPlatformName, type Platform } from "@/lib/platform";

const URL_PATTERN = /(https?:\/\/[^\s]+)/i;

export function extractUrl(text: string): string | null {
  const match = text.match(URL_PATTERN);
  return match?.[1] ?? null;
}

export function stripUrl(text: string, url: string): string {
  return text.replace(url, " ").trim();
}

export function normalizeWhitespace(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

export function sanitizeTitle(title: string): string {
  return normalizeWhitespace(
    title
      .replace(/^["'“”‘’]+|["'“”‘’]+$/g, "")
      .replace(/\s*[-|｜]\s*(抖音|小红书|微博|公众号|YouTube|B站).*$/i, "")
  );
}

export function getFallbackTitle(platform: Platform): string {
  const date = new Date().toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
  });

  return `${getPlatformName(platform)} - ${date}`;
}

export function isMeaningfulTitle(title?: string | null): title is string {
  if (!title) return false;
  const normalized = sanitizeTitle(title);
  if (!normalized) return false;
  if (/^https?:\/\//i.test(normalized)) return false;
  return normalized.length >= 2;
}

export function looksLikeFallbackTitle(title: string, platform: Platform): boolean {
  return title === getFallbackTitle(platform);
}
