"use client";

import { useEffect } from "react";

export function useActivityTracker() {
  useEffect(() => {
    const trackActivity = async () => {
      try {
        await fetch("/api/users/track-activity", {
          method: "POST",
        });
      } catch (error) {
        // Silently fail - this is non-critical
      }
    };

    // Track activity on mount
    trackActivity();

    // Track activity on user interactions
    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    let timeoutId: NodeJS.Timeout;

    const handleActivity = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(trackActivity, 5000); // Track every 5 seconds of activity
    };

    events.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    // Also track periodically every 30 seconds
    const intervalId = setInterval(trackActivity, 30000);

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, []);
}
