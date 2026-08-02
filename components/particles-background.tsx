"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useThemeConfig } from "@/lib/theme-config";

const Particles = dynamic(() => import("@/components/Particles"), { ssr: false });
const LightRays = dynamic(() => import("@/components/LightRays"), { ssr: false });

export function ParticlesBackground() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setIsMounted] = useState(false);
  const { config } = useThemeConfig();

  useEffect(() => {
    setIsMounted(true);
    const checkDark = () => setIsDark(document.documentElement.classList.contains("dark"));
    checkDark();

    const observer = new MutationObserver(() => checkDark());
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return () => observer.disconnect();
  }, []);

  if (!mounted) return null;

  if (config.backgroundEnabled === false) return null;

  // In solid background mode, the background is always dark (hsl(240 6% 4%)),
  // so show particles regardless of light/dark theme.
  // In gradient mode, only show in dark mode (legacy behavior).
  const backgroundMode = config.backgroundMode || 'solid';
  if (backgroundMode === 'gradient' && !isDark) return null;

  const effect = config.backgroundEffect || "particles";

  return (
    <div className="fixed inset-0 -z-10 pointer-events-none">
      {effect === "lightrays" ? (
        <LightRays
          raysOrigin="top-center"
          raysColor="#ffffff"
          raysSpeed={0.8}
          lightSpread={1.2}
          rayLength={2.5}
          fadeDistance={1.2}
          saturation={0.8}
          followMouse
          mouseInfluence={0.08}
          noiseAmount={0.02}
          distortion={0.1}
          className="opacity-60"
        />
      ) : (
        <Particles
          particleCount={150}
          particleSpread={12}
          speed={0.15}
          particleColors={["#22C55E", "#4ADE80", "#86EFAC", "#ffffff"]}
          alphaParticles
          particleBaseSize={80}
          sizeRandomness={0.8}
          cameraDistance={22}
          moveParticlesOnHover
          particleHoverFactor={1.5}
          pixelRatio={1}
        />
      )}
    </div>
  );
}
