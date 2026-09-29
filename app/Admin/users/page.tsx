import { getAllUsers, getUserStats, getUserGrowth } from "../actions/users";
import { UserWorkspace } from "./components/user-workspace";
import type { UserWithStatus, UserStats, GrowthPoint } from "./components/types";

export const dynamic = "force-dynamic";

export default async function UsersManagementPage() {
  let users: UserWithStatus[] = [];
  let stats: UserStats = {
    totalUsers: 0,
    students: 0,
    administrators: 0,
    onlineUsers: 0,
    suspendedUsers: 0,
    pendingVerification: 0,
    newUsersThisWeek: 0,
  };
  let growth: GrowthPoint[] = [];

  try {
    const [u, s, g] = await Promise.all([
      getAllUsers().catch((err) => {
        console.warn("[UsersManagementPage] getAllUsers server fallback:", err?.message);
        return [] as UserWithStatus[];
      }),
      getUserStats().catch((err) => {
        console.warn("[UsersManagementPage] getUserStats server fallback:", err?.message);
        return null;
      }),
      getUserGrowth(30).catch((err) => {
        console.warn("[UsersManagementPage] getUserGrowth server fallback:", err?.message);
        return [] as GrowthPoint[];
      }),
    ]);

    if (u && u.length > 0) users = u;
    if (s) stats = s;
    if (g && g.length > 0) growth = g;
  } catch (err) {
    console.warn("[UsersManagementPage] Server render fallback:", err);
  }

  return (
    <div className="min-h-screen bg-background">
      <UserWorkspace initialUsers={users} initialStats={stats} initialGrowth={growth} />
    </div>
  );
}

