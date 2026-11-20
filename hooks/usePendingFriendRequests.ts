"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";

type Listener = (count: number) => void;

const listeners = new Set<Listener>();
let activeUserId: string | null = null;
let cachedCount = 0;
let inFlightPromise: Promise<void> | null = null;
let lastFetchedAt = 0;

function notifyListeners(count: number) {
  cachedCount = count;
  listeners.forEach((listener) => listener(count));
}

async function refreshPendingFriendRequests(userId: string, force = false) {
  const now = Date.now();
  if (!force && inFlightPromise && activeUserId === userId) {
    return inFlightPromise;
  }
  if (!force && activeUserId === userId && now - lastFetchedAt < 4000) {
    return;
  }

  activeUserId = userId;
  inFlightPromise = (async () => {
    try {
      const res = await fetch("/api/classmate-requests", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const requests: Array<{ direction?: string; status?: string }> = Array.isArray(data?.requests)
        ? data.requests
        : [];
      const count = requests.filter(
        (r) => r.direction === "received" && r.status === "pending"
      ).length;
      lastFetchedAt = Date.now();
      if (activeUserId === userId) {
        notifyListeners(count);
      }
    } catch {
      // Non-critical background badge update
    } finally {
      inFlightPromise = null;
    }
  })();

  return inFlightPromise;
}

export function usePendingFriendRequests(): number {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [count, setCount] = useState<number>(() =>
    userId && activeUserId === userId ? cachedCount : 0
  );

  useEffect(() => {
    if (!userId || typeof window === "undefined") {
      activeUserId = null;
      cachedCount = 0;
      setCount(0);
      return;
    }

    if (activeUserId !== userId) {
      activeUserId = userId;
      cachedCount = 0;
      lastFetchedAt = 0;
      setCount(0);
    } else {
      setCount(cachedCount);
    }

    const listener: Listener = (nextCount) => {
      setCount(nextCount);
    };
    listeners.add(listener);

    void refreshPendingFriendRequests(userId);

    const handleCustomUpdate = () => {
      void refreshPendingFriendRequests(userId, true);
    };
    window.addEventListener("friend-request-updated", handleCustomUpdate);

    // Subscribe to realtime changes on classmate_requests for instant badge updates
    const supabase = createClient();
    const channel = supabase
      .channel(`pending-friend-req-${userId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "classmate_requests",
        },
        (payload: any) => {
          const row = payload?.new || payload?.old;
          if (
            payload?.eventType === "DELETE" ||
            row?.receiver_id === userId ||
            row?.sender_id === userId
          ) {
            void refreshPendingFriendRequests(userId, true);
          }
        }
      )
      .subscribe();

    return () => {
      listeners.delete(listener);
      window.removeEventListener("friend-request-updated", handleCustomUpdate);
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return count;
}
