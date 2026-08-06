"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function CourseRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const lessonId = searchParams.get("lesson");
    if (lessonId) {
      router.replace(`/dashboard#course?lesson=${lessonId}`);
    } else {
      router.replace("/dashboard#course");
    }
  }, [router, searchParams]);

  return null;
}
