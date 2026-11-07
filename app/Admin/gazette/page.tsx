export const dynamic = "force-dynamic";

import { GazetteManager } from "@/components/admin/gazette-manager";

export default function AdminGazettePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <GazetteManager />
    </div>
  );
}
