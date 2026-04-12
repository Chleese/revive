import type { ShareTextMetadata } from "@/lib/metadata/types";
import { isMeaningfulTitle, sanitizeTitle, stripUrl } from "@/lib/metadata/normalize";

const XHS_NOISE_PATTERNS = [
  /复制这条信息.*$/i,
  /复制本条信息.*$/i,
  /打开小红书.*$/i,
  /快来看.*$/i,
  /一起看看.*$/i,
];
const XHS_IGNORED_TITLES = [/^小红书$/i, /^app$/i];

function isUsefulXhsTitle(title: string): boolean {
  return isMeaningfulTitle(title) && !XHS_IGNORED_TITLES.some((pattern) => pattern.test(title));
}

export function parseXiaohongshuShareText(
  rawInput: string,
  url: string
): ShareTextMetadata | null {
  const bracketMatches = [...rawInput.matchAll(/【([^】]+)】/g)];
  for (const match of bracketMatches) {
    const title = sanitizeTitle(match[1] ?? "");
    if (isUsefulXhsTitle(title)) {
      return {
        title,
        metadataSource: "share_text",
        metadataConfidence: 0.82,
      }
    }
  }

  const cleaned = XHS_NOISE_PATTERNS.reduce(
    (text, pattern) => text.replace(pattern, " "),
    stripUrl(rawInput, url)
  );

  const lines = cleaned
    .split("\n")
    .map((line) => sanitizeTitle(line))
    .filter((line) => isUsefulXhsTitle(line));

  const title = lines.sort((a, b) => b.length - a.length)[0];

  if (!title) return null;

  return {
    title,
    metadataSource: "share_text",
    metadataConfidence: 0.76,
  };
}
