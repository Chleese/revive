import type { Platform } from "@/lib/platform";

export type MetadataSource =
  | "share_text"
  | "og"
  | "json_ld"
  | "title_tag"
  | "fallback"
  | "manual";

export type MetadataResult = {
  rawInput: string;
  url: string;
  resolvedUrl?: string;
  platform: Platform;
  title: string;
  image?: string;
  metadataSource: MetadataSource;
  metadataConfidence: number;
  needsEdit: boolean;
};

export type GenericWebMetadata = {
  title?: string;
  image?: string;
  metadataSource?: Extract<MetadataSource, "og" | "json_ld" | "title_tag">;
  metadataConfidence?: number;
};

export type ShareTextMetadata = {
  title?: string;
  metadataSource: Extract<MetadataSource, "share_text">;
  metadataConfidence: number;
};
