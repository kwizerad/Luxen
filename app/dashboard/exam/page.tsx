"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ExamRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams();
    const challengeId = searchParams.get("challenge_id");
    const categoryId = searchParams.get("category_id");
    const mode = searchParams.get("mode");
    const from = searchParams.get("from");

    if (challengeId) params.set("challenge_id", challengeId);
    if (categoryId) params.set("category_id", categoryId);
    if (mode) params.set("mode", mode);
    if (from) params.set("from", from);

    const queryString = params.toString();
    if (queryString) {
      router.replace(`/dashboard#exam?${queryString}`);
    } else {
      router.replace("/dashboard#exam");
    }
  }, [router, searchParams]);

  return null;
}
