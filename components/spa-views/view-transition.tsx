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
    <AnimatePresence mode="popLayout">
      <motion.div
        key={viewKey}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
