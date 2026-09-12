"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ServicesRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard#services");
  }, [router]);

  return null;
}
