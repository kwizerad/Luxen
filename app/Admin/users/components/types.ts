import type { UserProfile } from "@/lib/database.types";
import type { GrowthPoint, UserStats, UserProgressSummary } from "../../actions/users";

export interface UserWithStatus extends UserProfile {
  is_online: boolean;
}

export type { GrowthPoint, UserStats, UserProgressSummary };
