import { getAllUsers, getUserStats, getUserGrowth } from "../actions/users";
import { UserWorkspace } from "./components/user-workspace";

export const dynamic = "force-dynamic";

export default async function UsersManagementPage() {
  const [users, stats, growth] = await Promise.all([
    getAllUsers(),
    getUserStats(),
    getUserGrowth(30),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <UserWorkspace initialUsers={users} initialStats={stats} initialGrowth={growth} />
    </div>
  );
}
