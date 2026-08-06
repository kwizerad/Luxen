"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LiveExamRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard#services/live-exam");
  }, [router]);

  return null;
}
