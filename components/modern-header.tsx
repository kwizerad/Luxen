"use client";

import { useState } from "react";
import { Car, Menu, X } from "lucide-react";

interface ModernHeaderProps {
  brandName?: string;
  navLinks?: { label: string; href: string }[];
  ctaLabel?: string;
  onCtaClick?: () => void;
}

export function ModernHeader({
  brandName = "React Bits",
  navLinks = [
    { label: "Features", href: "#features" },
    { label: "About", href: "#about" },
  ],
  ctaLabel = "Sign up",
  onCtaClick,
}: ModernHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-3xl">
      <nav className="flex items-center justify-between rounded-full border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/40 backdrop-blur-xl px-4 py-2.5 shadow-lg">
        {/* Left: Brand */}
        <a href="/" className="flex items-center gap-2 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15">
            <Car className="h-4 w-4 text-primary-readable" />
          </div>
          <span className="text-sm font-semibold text-foreground dark:text-white tracking-tight hidden sm:block">
            {brandName}
          </span>
        </a>

        {/* Center: Nav links (hidden on mobile) */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground hover:text-foreground dark:text-zinc-400 dark:hover:text-white transition-colors duration-200"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Right: CTA + mobile toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onCtaClick}
            className="hidden sm:inline-flex items-center justify-center rounded-full bg-foreground text-background dark:bg-white dark:text-black px-4 py-1.5 text-sm font-bold hover:bg-foreground/80 dark:hover:bg-zinc-200 transition-colors duration-200"
          >
            {ctaLabel}
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground dark:text-zinc-400 dark:hover:text-white transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </nav>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="md:hidden mt-2 rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-black/60 backdrop-blur-xl p-4 shadow-lg">
          <div className="flex flex-col gap-3">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="text-sm text-muted-foreground hover:text-foreground dark:text-zinc-400 dark:hover:text-white transition-colors duration-200"
              >
                {link.label}
              </a>
            ))}
            <button
              onClick={() => {
                setMobileOpen(false);
                onCtaClick?.();
              }}
              className="mt-1 inline-flex items-center justify-center rounded-full bg-foreground text-background dark:bg-white dark:text-black px-4 py-2 text-sm font-bold hover:bg-foreground/80 dark:hover:bg-zinc-200 transition-colors duration-200"
            >
              {ctaLabel}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
