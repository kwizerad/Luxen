"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, type ReactNode } from "react";

interface ViewTransitionProps {
  viewKey: string;
  children: ReactNode;
}

export function ViewTransition({ viewKey, children }: ViewTransitionProps) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [viewKey]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={viewKey}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
