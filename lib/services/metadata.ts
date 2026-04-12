import type { MetadataResult } from "@/lib/metadata/types";

export const metadataService = {
  async resolve(rawInput: string): Promise<MetadataResult | null> {
    try {
      const response = await fetch("/api/metadata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rawInput }),
      });

      if (!response.ok) {
        return null;
      }

      return (await response.json()) as MetadataResult;
    } catch (error) {
      console.error("Failed to resolve metadata:", error);
      return null;
    }
  },
};
