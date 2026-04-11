import { detectPlatform } from "@/lib/platform";
import {
  extractUrl,
  getFallbackTitle,
  isMeaningfulTitle,
  sanitizeTitle,
} from "@/lib/metadata/normalize";
import { parseDouyinShareText } from "@/lib/metadata/parsers/douyin";
import { fetchGenericWebMetadata } from "@/lib/metadata/parsers/generic";
import { parseXiaohongshuShareText } from "@/lib/metadata/parsers/xiaohongshu";
import type { MetadataResult } from "@/lib/metadata/types";

export async function resolveMetadata(rawInput: string): Promise<MetadataResult> {
  const trimmedInput = rawInput.trim();
  const extractedUrl = extractUrl(trimmedInput);
  const targetUrl = extractedUrl ?? trimmedInput;
  const platform = detectPlatform(targetUrl);

  let shareTextResult = null;

  if (platform === "douyin" && extractedUrl) {
    shareTextResult = parseDouyinShareText(trimmedInput, extractedUrl);
  }

  if (platform === "xiaohongshu" && extractedUrl) {
    shareTextResult = parseXiaohongshuShareText(trimmedInput, extractedUrl);
  }

  const shareTitle = shareTextResult?.title
    ? sanitizeTitle(shareTextResult.title)
    : undefined;
  let webMetadata = null;

  if (/^https?:\/\//i.test(targetUrl)) {
    webMetadata = await fetchGenericWebMetadata(targetUrl);
  }

  if (shareTitle) {
    const shareSource = shareTextResult?.metadataSource ?? "share_text";
    const shareConfidence = shareTextResult?.metadataConfidence ?? 0.75;

    return {
      rawInput: trimmedInput,
      url: targetUrl,
      resolvedUrl: targetUrl,
      platform,
      title: shareTitle,
      image: webMetadata?.image,
      metadataSource: shareSource,
      metadataConfidence: shareConfidence,
      needsEdit: false,
    };
  }

  if (isMeaningfulTitle(webMetadata?.title)) {
    return {
      rawInput: trimmedInput,
      url: targetUrl,
      resolvedUrl: targetUrl,
      platform,
      title: sanitizeTitle(webMetadata.title),
      image: webMetadata.image,
      metadataSource: webMetadata.metadataSource ?? "title_tag",
      metadataConfidence: webMetadata.metadataConfidence ?? 0.62,
      needsEdit: (webMetadata.metadataConfidence ?? 0.62) < 0.7,
    };
  }

  if (webMetadata?.image) {
    return {
      rawInput: trimmedInput,
      url: targetUrl,
      resolvedUrl: targetUrl,
      platform,
      title: getFallbackTitle(platform),
      image: webMetadata.image,
      metadataSource: webMetadata.metadataSource ?? "fallback",
      metadataConfidence: webMetadata.metadataConfidence ?? 0.45,
      needsEdit: true,
    };
  }

  return {
    rawInput: trimmedInput,
    url: targetUrl,
    resolvedUrl: targetUrl,
    platform,
    title: getFallbackTitle(platform),
    metadataSource: "fallback",
    metadataConfidence: 0.2,
    needsEdit: true,
  };
}
