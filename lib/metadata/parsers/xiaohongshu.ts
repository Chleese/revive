import type { ShareTextMetadata } from "@/lib/metadata/types";
import { isMeaningfulTitle, sanitizeTitle, stripUrl } from "@/lib/metadata/normalize";

const XHS_NOISE_PATTERNS = [
  /复制这条信息.*$/i,
  /复制本条信息.*$/i,
  /打开小红书.*$/i,
  /快来看.*$/i,
  /一起看看.*$/i,
];

export function parseXiaohongshuShareText(
  rawInput: string,
  url: string
): ShareTextMetadata | null {
  const exactBracketMatch = rawInput.match(/【([^】]+)】/);
  if (exactBracketMatch?.[1]) {
    const title = sanitizeTitle(exactBracketMatch[1]);
    if (isMeaningfulTitle(title)) {
      return {
        title,
        metadataSource: "share_text",
        metadataConfidence: 0.82,
      };
    }
  }

  const cleaned = XHS_NOISE_PATTERNS.reduce(
    (text, pattern) => text.replace(pattern, " "),
    stripUrl(rawInput, url)
  );

  const lines = cleaned
    .split("\n")
    .map((line) => sanitizeTitle(line))
    .filter((line) => isMeaningfulTitle(line));

  const title = lines.sort((a, b) => b.length - a.length)[0];

  if (!title) return null;

  return {
    title,
    metadataSource: "share_text",
    metadataConfidence: 0.76,
  };
}
