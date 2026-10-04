"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ExamRedirect() {
  const router = useRouter();

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
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
    const targetHash = queryString ? `exam?${queryString}` : "exam";
    try {
      sessionStorage.setItem("intended-dashboard-view", targetHash);
    } catch {}
    router.replace(`/dashboard#${targetHash}`);
  }, [router]);

  return null;
}
