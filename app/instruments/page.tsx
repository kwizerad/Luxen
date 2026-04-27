import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";

async function InstrumentsData() {
  const supabase = await createClient();
  const { data: instruments, error } = await supabase
    .from("instruments")
    .select("*");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "(missing)";
  const hasPublishableKey = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );

  if (error) {
    return (
      <div className="space-y-4 text-sm text-slate-700">
        <div className="text-red-600">Error loading instruments: {error.message}</div>
        <div>Supabase URL: {supabaseUrl}</div>
        <div>Publishable key loaded: {hasPublishableKey ? "yes" : "no"}</div>
      </div>
    );
  }

  if (!instruments || instruments.length === 0) {
    return (
      <div className="space-y-4 text-sm text-slate-700">
        <div>No instruments found.</div>
        <div>Supabase URL: {supabaseUrl}</div>
        <div>Publishable key loaded: {hasPublishableKey ? "yes" : "no"}</div>
        <div>Row count: {instruments?.length ?? 0}</div>
      </div>
    );
  }

  return <pre>{JSON.stringify(instruments, null, 2)}</pre>;
}

export default function Instruments() {
  return (
    <Suspense fallback={<div>Loading instruments...</div>}>
      <InstrumentsData />
    </Suspense>
  );
}