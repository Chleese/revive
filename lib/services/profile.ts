import { getUserProfile } from "@/lib/profiles/queries";
import type { UserProfileRecord } from "@/lib/profiles/types";

export const profileService = {
  getUserProfile(userId: string): Promise<UserProfileRecord> {
    return getUserProfile(userId);
  },
};
