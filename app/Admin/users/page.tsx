"use client";

import { UserWorkspace } from "./components/user-workspace";
import type { UserWithStatus, UserStats, GrowthPoint } from "./components/types";

const INITIAL_USERS: UserWithStatus[] = [];
const INITIAL_STATS: UserStats = {
  totalUsers: 0,
  students: 0,
  administrators: 0,
  onlineUsers: 0,
  suspendedUsers: 0,
  pendingVerification: 0,
  newUsersThisWeek: 0,
};
const INITIAL_GROWTH: GrowthPoint[] = [];

export default function UsersManagementPage() {
  return (
    <div className="min-h-screen bg-background">
      <UserWorkspace
        initialUsers={INITIAL_USERS}
        initialStats={INITIAL_STATS}
        initialGrowth={INITIAL_GROWTH}
      />
    </div>
  );
}

