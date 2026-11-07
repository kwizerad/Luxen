"use client";

import React from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Loader2, Lock, UserCheck } from "lucide-react";

export interface WelcomingOverlayProps {
  open: boolean;
  fullName?: string | null;
  avatarUrl?: string | null;
  subtitle?: string | null;
  isRw?: boolean;
}

export function WelcomingCardOverlay({
  open,
  fullName,
  avatarUrl,
  subtitle,
  isRw = true,
}: WelcomingOverlayProps) {
  if (!open) return null;

  const displayName = fullName?.trim() || (isRw ? "Umuturage" : "Citizen");
  const initial = displayName.charAt(0).toUpperCase() || "N";

  const defaultSubtitle = isRw
    ? "Bigenze neza · Turimo kukwerekeza ku ntego..."
    : "Direct Navo Authentication · Verified Record";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[100000] flex items-center justify-center bg-background/70 backdrop-blur-md px-4 select-none"
          aria-busy="true"
          aria-live="polite"
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 10 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center text-center max-w-sm w-full gap-4 rounded-3xl bg-card/95 dark:bg-zinc-900/95 p-7 shadow-2xl border border-emerald-500/25 dark:border-emerald-500/20 backdrop-blur-2xl"
          >
            {/* Rounded Green Profile Container (With Shield Badge) */}
            <div className="relative flex items-center justify-center">
              {avatarUrl ? (
                <div className="w-16 h-16 rounded-2xl overflow-hidden ring-2 ring-emerald-500/30 flex items-center justify-center bg-emerald-500/10 dark:bg-emerald-500/20 p-0.5 shadow-md">
                  <Image
                    src={avatarUrl}
                    alt={displayName}
                    width={64}
                    height={64}
                    className="object-cover rounded-xl w-full h-full"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-800 text-white font-extrabold text-2xl flex items-center justify-center shadow-md">
                  {initial}
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center ring-2 ring-card shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Greeting & Full Names */}
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-bold text-foreground dark:text-white leading-snug">
                {isRw ? `Murakaza neza, ${displayName}!` : `Welcome, ${displayName}!`}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {subtitle || defaultSubtitle}
              </p>
            </div>

            {/* Spinner & Security Assurance */}
            <div className="flex items-center gap-2 pt-1">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-600 dark:text-emerald-400" />
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                <span>Direct Navo Authentication</span>
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
