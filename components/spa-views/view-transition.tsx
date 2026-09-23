"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, type ReactNode } from "react";

interface ViewTransitionProps {
  viewKey: string;
  children: ReactNode;
}

export function ViewTransition({ viewKey, children }: ViewTransitionProps) {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [viewKey]);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={viewKey}
        initial={{ opacity: 0, y: 3 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
        className="w-full transform-gpu will-change-transform"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
