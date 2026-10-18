"use client";

import React from "react";

/**
 * High-definition, authentic vector SVG flags for Rwanda, United Kingdom, and France.
 * Features crisp aspect ratio, subtle border, rounded corners, and soft lighting sheen.
 */

export function RwandaFlag({ className = "w-full h-auto aspect-[3/2]" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 600 400"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Flag of Rwanda"
    >
      <defs>
        <clipPath id="rwanda-round">
          <rect width="600" height="400" rx="16" ry="16" />
        </clipPath>
        <linearGradient id="rwanda-sheen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.08" />
        </linearGradient>
      </defs>
      <g clipPath="url(#rwanda-round)">
        {/* Top half: Blue */}
        <rect width="600" height="200" fill="#00A1DE" />
        {/* Yellow band: 100px */}
        <rect y="200" width="600" height="100" fill="#FAD201" />
        {/* Green band: 100px */}
        <rect y="300" width="600" height="100" fill="#20603D" />

        {/* Golden Sun with 24 rays in top right */}
        <g transform="translate(470, 95)">
          <circle r="34" fill="#E5A823" />
          <circle r="30" fill="#FAD201" />
          {Array.from({ length: 24 }).map((_, i) => (
            <polygon
              key={i}
              points="-3,-34 0,-58 3,-34"
              fill="#FAD201"
              transform={`rotate(${i * 15})`}
            />
          ))}
          <circle r="14" fill="#E5A823" opacity="0.3" />
        </g>

        {/* Soft lighting sheen overlay */}
        <rect width="600" height="400" fill="url(#rwanda-sheen)" />
      </g>
    </svg>
  );
}

export function UKFlag({ className = "w-full h-auto aspect-[3/2]" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 600 400"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Flag of the United Kingdom"
    >
      <defs>
        <clipPath id="uk-round">
          <rect width="600" height="400" rx="16" ry="16" />
        </clipPath>
        <linearGradient id="uk-sheen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.08" />
        </linearGradient>
      </defs>
      <g clipPath="url(#uk-round)">
        {/* Blue field */}
        <rect width="600" height="400" fill="#012169" />

        {/* White saltire */}
        <path d="M0,0 L600,400 M600,0 L0,400" stroke="#FFFFFF" strokeWidth="80" strokeLinecap="square" />

        {/* Red saltire (counterchanged) */}
        <path d="M0,0 L300,200" stroke="#C8102E" strokeWidth="26" strokeLinecap="square" />
        <path d="M600,0 L300,200" stroke="#C8102E" strokeWidth="26" strokeLinecap="square" />
        <path d="M600,400 L300,200" stroke="#C8102E" strokeWidth="26" strokeLinecap="square" />
        <path d="M0,400 L300,200" stroke="#C8102E" strokeWidth="26" strokeLinecap="square" />

        {/* White cross */}
        <path d="M300,0 V400 M0,200 H600" stroke="#FFFFFF" strokeWidth="120" />

        {/* Red cross */}
        <path d="M300,0 V400 M0,200 H600" stroke="#C8102E" strokeWidth="72" />

        {/* Soft lighting sheen overlay */}
        <rect width="600" height="400" fill="url(#uk-sheen)" />
      </g>
    </svg>
  );
}

export function FranceFlag({ className = "w-full h-auto aspect-[3/2]" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 600 400"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Flag of France"
    >
      <defs>
        <clipPath id="france-round">
          <rect width="600" height="400" rx="16" ry="16" />
        </clipPath>
        <linearGradient id="france-sheen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.08" />
        </linearGradient>
      </defs>
      <g clipPath="url(#france-round)">
        {/* Blue vertical stripe */}
        <rect width="200" height="400" fill="#002654" />
        {/* White vertical stripe */}
        <rect x="200" width="200" height="400" fill="#FFFFFF" />
        {/* Red vertical stripe */}
        <rect x="400" width="200" height="400" fill="#ED2939" />

        {/* Soft lighting sheen overlay */}
        <rect width="600" height="400" fill="url(#france-sheen)" />
      </g>
    </svg>
  );
}
