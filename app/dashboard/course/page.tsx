"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function CourseRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams();
    const lessonId = searchParams.get("lesson") || searchParams.get("lessonId");
    const topicId = searchParams.get("topic") || searchParams.get("topicId");
    const moduleId = searchParams.get("module") || searchParams.get("moduleId");

    if (lessonId) params.set("lesson", lessonId);
    if (topicId) params.set("topic", topicId);
    if (moduleId) params.set("module", moduleId);

    const queryString = params.toString();
    if (queryString) {
      router.replace(`/dashboard#course?${queryString}`);
    } else {
      router.replace("/dashboard#course");
    }
  }, [router, searchParams]);

  return null;
}
