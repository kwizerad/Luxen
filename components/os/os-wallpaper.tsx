"use client";

import React from "react";

interface OSWallpaperProps {
  className?: string;
}

export function OSWallpaper({ className = "" }: OSWallpaperProps) {
  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 min-h-screen w-full bg-cover bg-center bg-no-repeat pointer-events-none -z-10 overflow-hidden select-none transition-colors duration-500 ${className}`}
    >
      {/* 1. Base Studio Canvas */}
      <div className="absolute inset-0 w-full h-full min-h-screen bg-slate-100 dark:bg-[#080c14] transition-colors duration-500" />

      {/* 2. Full-Page Luminous Multi-Spectrum Aurora Mesh (Light Theme) */}
      <div className="absolute inset-0 w-full h-full min-h-screen block dark:hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-100/60 via-slate-100 to-sky-100/40" />
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.18)_0%,transparent_50%)] blur-2xl" />
        <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_80%_30%,rgba(14,165,233,0.15)_0%,transparent_50%)] blur-2xl" />
        <div className="absolute bottom-0 left-0 right-0 w-full h-full bg-[radial-gradient(circle_at_50%_80%,rgba(99,102,241,0.10)_0%,transparent_60%)] blur-3xl" />
      </div>

      {/* 3. Full-Page Cosmic Nebula Canvas (Dark Theme) */}
      <div className="absolute inset-0 w-full h-full min-h-screen hidden dark:block">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0f172a] via-[#090d16] to-[#040711]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.22)_0%,rgba(6,182,212,0.08)_40%,transparent_70%)] blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_35%,rgba(14,165,233,0.18)_0%,rgba(99,102,241,0.06)_45%,transparent_70%)] blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_80%,rgba(139,92,246,0.14)_0%,rgba(16,185,129,0.08)_50%,transparent_75%)] blur-3xl" />
      </div>

      {/* 3. Designer Vector Glass Ribbon Topography (Mac/Windows 11 inspired flow) */}
      <svg
        className="absolute inset-0 w-full h-full opacity-65 dark:opacity-30"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1600 1000"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="navo-ribbon-1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
            <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.04" />
          </linearGradient>

          <linearGradient id="navo-ribbon-2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.18" />
            <stop offset="60%" stopColor="#818cf8" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.03" />
          </linearGradient>

          <linearGradient id="navo-ribbon-3" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.12" />
            <stop offset="40%" stopColor="#14b8a6" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          <filter id="soft-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="35" />
          </filter>
        </defs>

        {/* Primary flowing wave */}
        <path
          d="M-100,280 C320,160 550,560 920,380 C1250,220 1480,480 1750,340 L1750,1100 L-100,1100 Z"
          fill="url(#navo-ribbon-1)"
          filter="url(#soft-blur)"
        />

        {/* Secondary counter-flowing wave */}
        <path
          d="M-50,620 C280,450 640,780 1080,520 C1380,340 1560,610 1720,490 L1720,1100 L-50,1100 Z"
          fill="url(#navo-ribbon-2)"
          filter="url(#soft-blur)"
        />

        {/* Accent crest */}
        <path
          d="M100,120 C460,90 740,380 1200,240 C1440,160 1620,290 1720,220"
          fill="none"
          stroke="url(#navo-ribbon-3)"
          strokeWidth="60"
          filter="url(#soft-blur)"
        />
      </svg>

      {/* 4. Precision Micro-Dot Matrix Glass Layer */}
      <div
        className="absolute inset-0 opacity-[0.035] dark:opacity-[0.02]"
        style={{
          backgroundImage: `radial-gradient(currentColor 1px, transparent 1px)`,
          backgroundSize: "28px 28px",
        }}
      />

      {/* 5. Edge Vignette Softener */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(248,250,252,0.4)_100%)] dark:bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(8,9,12,0.4)_100%)] pointer-events-none" />
    </div>
  );
}
