"use client";

import { useEffect, useState } from "react";
import { useThemeConfig } from "@/lib/theme-config";
import Particles from "@/components/Particles";
import LightRays from "@/components/LightRays";

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

  const effect = config.backgroundEffect || "particles";

  return (
    <div className="fixed inset-0 -z-10 pointer-events-none">
      {effect === "lightrays" ? (
        <LightRays
          raysOrigin="top-center"
          raysColor={isDark ? "#ffffff" : (config.light.primaryColor || "#22C55E")}
          raysSpeed={0.8}
          lightSpread={1.2}
          rayLength={2.5}
          fadeDistance={1.2}
          saturation={0.8}
          followMouse
          mouseInfluence={0.08}
          noiseAmount={0.02}
          distortion={0.1}
          className={isDark ? "opacity-60" : "opacity-35"}
        />
      ) : (
        <Particles
          particleCount={150}
          particleSpread={12}
          speed={0.15}
          particleColors={
            isDark
              ? [config.dark.primaryColor || "#22C55E", config.dark.hoverBorderColor || "#4ADE80", "#ffffff"]
              : [config.light.primaryColor || "#22C55E", config.light.hoverBorderColor || "#16A34A", "#64748B"]
          }
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
