"use client";

import React from "react";

interface OSWallpaperProps {
  className?: string;
}

export function OSWallpaper({ className = "" }: OSWallpaperProps) {
  return (
    <div
      aria-hidden="true"
      className={`absolute inset-0 pointer-events-none -z-10 overflow-hidden select-none transition-colors duration-500 ${className}`}
    >
      {/* 1. Base Studio Canvas */}
      <div className="absolute inset-0 bg-[#f8fafc] dark:bg-[#08090c] transition-colors duration-500" />

      {/* 2. Luminous Multi-Spectrum Aurora Mesh Gradients */}
      {/* Light Theme: Radiant Pearl, Emerald Spring, Sky Cyan, Warm Sun, and Twilight Violet */}
      <div className="absolute inset-0 block dark:hidden">
        {/* Emerald Radiance - Upper Left / Center */}
        <div className="absolute -top-[15%] left-[5%] w-[65vw] h-[65vw] max-w-[900px] max-h-[900px] rounded-full bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.18)_0%,rgba(16,185,129,0.06)_45%,transparent_70%)] blur-3xl transform-gpu" />

        {/* Crystalline Sky Blue - Upper Right */}
        <div className="absolute -top-[10%] right-[2%] w-[55vw] h-[55vw] max-w-[800px] max-h-[800px] rounded-full bg-[radial-gradient(circle_at_center,rgba(14,165,233,0.16)_0%,rgba(56,189,248,0.05)_45%,transparent_70%)] blur-3xl transform-gpu" />

        {/* Warm Morning Sun Gold / Amber - Bottom Left / Center Horizon */}
        <div className="absolute bottom-[2%] left-[20%] w-[50vw] h-[40vw] max-w-[700px] max-h-[550px] rounded-full bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.09)_0%,rgba(251,146,60,0.03)_50%,transparent_75%)] blur-3xl transform-gpu" />

        {/* Twilight Lilac / Indigo - Bottom Right */}
        <div className="absolute bottom-[0%] right-[5%] w-[45vw] h-[45vw] max-w-[650px] max-h-[650px] rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.07)_0%,rgba(168,85,247,0.02)_45%,transparent_70%)] blur-3xl transform-gpu" />
      </div>

      {/* Dark Theme: Deep Cosmic Obsidian with Emerald & Sapphire Nebulae */}
      <div className="absolute inset-0 hidden dark:block">
        <div className="absolute -top-[15%] left-[5%] w-[65vw] h-[65vw] max-w-[900px] max-h-[900px] rounded-full bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.16)_0%,rgba(16,185,129,0.03)_50%,transparent_70%)] blur-3xl transform-gpu" />
        <div className="absolute -top-[10%] right-[5%] w-[55vw] h-[55vw] max-w-[800px] max-h-[800px] rounded-full bg-[radial-gradient(circle_at_center,rgba(14,165,233,0.13)_0%,rgba(6,182,212,0.02)_50%,transparent_70%)] blur-3xl transform-gpu" />
        <div className="absolute bottom-[5%] right-[10%] w-[50vw] h-[50vw] max-w-[700px] max-h-[700px] rounded-full bg-[radial-gradient(circle_at_center,rgba(129,140,248,0.10)_0%,transparent_70%)] blur-3xl transform-gpu" />
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
