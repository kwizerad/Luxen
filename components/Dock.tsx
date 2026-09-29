"use client";

import {
  motion,
  MotionValue,
  useMotionValue,
  useSpring,
  useTransform,
  type SpringOptions,
  AnimatePresence,
} from "framer-motion";
import React, { Children, cloneElement, useEffect, useMemo, useRef, useState } from "react";

export type DockItemData = {
  icon: React.ReactNode;
  label: React.ReactNode;
  onClick: () => void;
  className?: string;
};

export type DockProps = {
  items: DockItemData[];
  className?: string;
  distance?: number;
  panelHeight?: number;
  baseItemSize?: number;
  dockHeight?: number;
  magnification?: number;
  spring?: SpringOptions;
};

type DockItemProps = {
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  mouseX: MotionValue<number>;
  spring: SpringOptions;
  distance: number;
  baseItemSize: number;
  magnification: number;
  label?: React.ReactNode;
  isTouchDevice: boolean;
};

function DockItem({
  children,
  className = "",
  onClick,
  mouseX,
  spring,
  distance,
  magnification,
  baseItemSize,
  label,
  isTouchDevice,
}: DockItemProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const isHovered = useMotionValue(0);

  // Compute distance from mouse to center of this item
  const mouseDistance = useTransform(mouseX, (val: number) => {
    if (isTouchDevice || !Number.isFinite(val)) return distance + 100;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return distance + 100;
    return val - (rect.left + rect.width / 2);
  });

  // Calculate icon scale based on distance (using transform scale instead of changing layout width)
  const maxScale = baseItemSize > 0 ? Math.min(1.25, magnification / baseItemSize) : 1;
  const targetScale = useTransform(
    mouseDistance,
    [-distance, 0, distance],
    [1, maxScale, 1]
  );
  const scale = useSpring(targetScale, spring);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onClick?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      onClick?.();
    }
  };

  return (
    <button
      type="button"
      ref={ref}
      style={{
        width: baseItemSize,
        height: baseItemSize,
      }}
      onMouseEnter={() => {
        if (!isTouchDevice) isHovered.set(1);
      }}
      onMouseLeave={() => {
        isHovered.set(0);
      }}
      onFocus={() => {
        if (!isTouchDevice) isHovered.set(1);
      }}
      onBlur={() => {
        isHovered.set(0);
      }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`relative flex-shrink-0 inline-flex items-center justify-center rounded-xl transition-all duration-150 active:scale-90 select-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary ${className}`}
      aria-label={typeof label === "string" ? label : undefined}
    >
      <motion.div
        style={!isTouchDevice ? { scale } : undefined}
        className="flex items-center justify-center w-full h-full pointer-events-none"
      >
        {Children.map(children, (child) =>
          React.isValidElement(child)
            ? cloneElement(child as React.ReactElement<{ isHovered?: MotionValue<number> }>, { isHovered })
            : child
        )}
      </motion.div>
    </button>
  );
}

type DockLabelProps = {
  className?: string;
  children: React.ReactNode;
  isHovered?: MotionValue<number>;
};

function DockLabel({ children, className = "", isHovered }: DockLabelProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isHovered) return;
    const unsubscribe = isHovered.on("change", (latest: number) => {
      setIsVisible(latest === 1);
    });
    return () => unsubscribe();
  }, [isHovered]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: 1, y: -10 }}
          exit={{ opacity: 0, y: 0 }}
          transition={{ duration: 0.15 }}
          className={`${className} absolute -top-8 left-1/2 w-fit whitespace-nowrap rounded-md border border-black/10 dark:border-white/10 bg-white/95 dark:bg-[#121217]/95 backdrop-blur-md px-2.5 py-1 text-xs font-medium text-black dark:text-white shadow-xl pointer-events-none z-50`}
          role="tooltip"
          style={{ x: "-50%" }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

type DockIconProps = {
  className?: string;
  children: React.ReactNode;
  isHovered?: MotionValue<number>;
};

function DockIcon({ children, className = "" }: DockIconProps) {
  return <div className={`flex items-center justify-center ${className}`}>{children}</div>;
}

function Dock({
  items,
  className = "",
  spring = { mass: 0.1, stiffness: 200, damping: 18 },
  magnification = 60,
  distance = 140,
  panelHeight = 64,
  baseItemSize = 48,
}: DockProps) {
  const mouseX = useMotionValue(Infinity);
  const [isTouchDevice, setIsTouchDevice] = useState(true); // Default to true on initial render to prevent layout jump

  useEffect(() => {
    const check = () => {
      const isCoarse = window.matchMedia("(pointer: coarse)").matches;
      const isSmall = window.innerWidth < 768;
      const noHover = !window.matchMedia("(hover: hover)").matches;
      setIsTouchDevice(isCoarse || isSmall || noHover);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const effectivePanelHeight = isTouchDevice ? Math.max(54, Math.round(panelHeight * 0.85)) : panelHeight;
  const effectiveBaseItemSize = isTouchDevice ? Math.max(42, Math.round(baseItemSize * 0.88)) : baseItemSize;

  return (
    <div className="mx-2 flex max-w-full items-center justify-center">
      <div
        onMouseMove={(e) => {
          if (isTouchDevice) return;
          mouseX.set(e.pageX);
        }}
        onMouseLeave={() => {
          mouseX.set(Infinity);
        }}
        onTouchStart={() => {
          mouseX.set(Infinity);
        }}
        className={`${className} pointer-events-auto absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 flex items-center justify-center w-fit gap-1.5 md:gap-2 rounded-2xl border border-black/10 dark:border-white/10 px-2 md:px-3 backdrop-blur-xl bg-white/85 dark:bg-[#121217]/85 shadow-2xl z-50`}
        style={{ height: effectivePanelHeight }}
        role="toolbar"
        aria-label="Application dock"
      >
        {items.map((item, index) => {
          const itemKey = typeof item.label === "string" ? `${item.label}-${index}` : `dock-item-${index}`;
          return (
            <DockItem
              key={itemKey}
              onClick={item.onClick}
              className={item.className}
              mouseX={mouseX}
              spring={spring}
              distance={distance}
              magnification={magnification}
              baseItemSize={effectiveBaseItemSize}
              label={item.label}
              isTouchDevice={isTouchDevice}
            >
              <DockIcon>{item.icon}</DockIcon>
              <DockLabel>{item.label}</DockLabel>
            </DockItem>
          );
        })}
      </div>
    </div>
  );
}

export default React.memo(Dock);
