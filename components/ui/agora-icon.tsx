"use client";

import React from "react";

interface AgoraIconProps {
  className?: string;
  size?: number;
}

export function AgoraIcon({ className = "w-6 h-6", size = 24 }: AgoraIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="agoraGrad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="50%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>

      {/* Outer Pillars / Agora Forum Framework */}
      <path
        d="M4 19V9L12 4L20 9V19M4 19H20M4 19H2M20 19H22"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Inner Central Pillar Nodes / Speech Pillars */}
      <path
        d="M8 12V16M12 10V16M16 12V16"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />

      {/* Central Dialogue Spark Bubble */}
      <circle cx="12" cy="7" r="1.5" fill="currentColor" />
    </svg>
  );
}

export default AgoraIcon;
