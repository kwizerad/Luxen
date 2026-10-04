"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Loader2, X } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

export interface RatingModalProps {
  open: boolean;
  onClose: () => void;
  driverId: string;
  existingRating?: number;
  existingReview?: string;
}

export function RatingModal({ open, onClose, driverId, existingRating, existingReview }: RatingModalProps) {
  const { t } = useLanguage();
  const [rating, setRating] = useState(existingRating || 0);
  const [review, setReview] = useState(existingReview || "");
  const [loading, setLoading] = useState(false);
  const [hover, setHover] = useState(0);

  useEffect(() => {
    if (open) {
      setRating(existingRating || 0);
      setReview(existingReview || "");
    }
  }, [open, existingRating, existingReview]);

  const handleSubmit = async () => {
    if (rating < 1 || rating > 5) return;

    setLoading(true);
    try {
      await fetch("/api/driver/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driver_id: driverId, rating, review }),
      });
      onClose();
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", damping: 26, stiffness: 340, mass: 0.8 }}
            className="w-full max-w-md rounded-2xl border border-border/50 dark:border-border/30 bg-card shadow-xl p-6 transform-gpu"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">{t("rateDriver")}</h2>
              <button onClick={onClose} className="rounded-lg p-1 hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHover(star)}
                    onMouseLeave={() => setHover(0)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-8 w-8 ${
                        star <= (hover || rating)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground"
                      }`}
                    />
                  </button>
                ))}
              </div>

              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder={t("writeReview")}
                rows={4}
                className="w-full rounded-xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary resize-none"
              />

              <button
                onClick={handleSubmit}
                disabled={loading || rating < 1}
                className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50 hover:opacity-90 transition-opacity"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("submitting")}
                  </span>
                ) : (
                  t("submit")
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
