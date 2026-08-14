"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RetakeRequestsPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/Admin");
  }, [router]);
  return null;
}
