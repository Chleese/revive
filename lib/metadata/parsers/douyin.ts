import type { ShareTextMetadata } from "@/lib/metadata/types";
import { isMeaningfulTitle, sanitizeTitle, stripUrl } from "@/lib/metadata/normalize";

const DOUBLED_NOISE_PATTERNS = [
  /复制此链接.*$/i,
  /打开.*搜索.*$/i,
  /直接观看视频.*$/i,
  /www\.douyin\.com.*$/i,
];

function pickBestLine(lines: string[]): string | undefined {
  const candidates = lines
    .map((line) =>
      sanitizeTitle(
        line
          .replace(/^[\d\s.:/\w@-]+\s*/i, "")
          .replace(/^.*?发布在抖音.*$/i, "")
      )
    )
    .filter((line) => isMeaningfulTitle(line));

  return candidates.sort((a, b) => b.length - a.length)[0];
}

export function parseDouyinShareText(rawInput: string, url: string): ShareTextMetadata | null {
  const withoutUrl = stripUrl(rawInput, url);
  const cleaned = DOUBLED_NOISE_PATTERNS.reduce(
    (text, pattern) => text.replace(pattern, " "),
    withoutUrl
  );

  const lines = cleaned
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const title = pickBestLine(lines);

  if (!title) return null;

  return {
    title,
    metadataSource: "share_text",
    metadataConfidence: 0.78,
  };
}
