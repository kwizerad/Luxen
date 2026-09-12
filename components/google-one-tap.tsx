"use client";

import { GoogleOneTap } from "@/components/auth/GoogleOneTap";

/**
 * Backward-compatible re-export of the real Google One Tap component.
 *
 * Existing pages import `GoogleOneTap` from `@/components/google-one-tap`.
 * This wrapper preserves those imports while delegating to the production-ready
 * implementation in `components/auth/GoogleOneTap.tsx`.
 */
export { GoogleOneTap };
