"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { VisitorLocationPoint } from "@/app/Admin/actions/visitor-geo";

interface VisitorMapInnerProps {
  points: VisitorLocationPoint[];
  selectedPoint: VisitorLocationPoint | null;
  onSelectPoint: (point: VisitorLocationPoint | null) => void;
  theme?: "dark" | "light";
}

function createCustomPin(deviceType: string, isSelected: boolean) {
  const isMobile = deviceType.toLowerCase().includes("mobile");
  const isTablet = deviceType.toLowerCase().includes("tablet");

  const color = isMobile ? "#38BDF8" : isTablet ? "#A855F7" : "#4ADE80";
  const ringColor = isSelected ? "#F59E0B" : color;
  const size = isSelected ? 36 : 28;

  const html = `
    <div style="position: relative; width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center;">
      <div style="
        position: absolute;
        inset: 0;
        border-radius: 9999px;
        background: ${ringColor};
        opacity: ${isSelected ? 0.35 : 0.2};
        animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
      "></div>
      <div style="
        width: ${size - 10}px;
        height: ${size - 10}px;
        border-radius: 9999px;
        background: ${ringColor};
        border: 2px solid #ffffff;
        box-shadow: 0 4px 12px rgba(0,0,0,0.35);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="width: 6px; height: 6px; border-radius: 9999px; background: #0F172A;"></div>
      </div>
    </div>
  `;

  return L.divIcon({
    className: "custom-visitor-pin",
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

function renderPopupContent(point: VisitorLocationPoint) {
  const isMobile = point.deviceType.toLowerCase().includes("mobile");
  const isTablet = point.deviceType.toLowerCase().includes("tablet");
  const deviceIcon = isMobile ? "📱" : isTablet ? "📟" : "💻";
  const locationText = [point.city, point.country].filter(Boolean).join(", ") || "Global Location";
  const timeStr = new Date(point.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return `
    <div class="p-1 min-w-[210px] text-slate-100 font-sans">
      <div class="flex items-center justify-between gap-2 border-b border-slate-700/60 pb-2 mb-2">
        <div class="flex items-center gap-1.5 font-bold text-sm text-slate-100">
          <span>🌐</span>
          <span>${locationText}</span>
        </div>
        <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
          ${point.ip}
        </span>
      </div>

      <div class="space-y-1.5 text-xs text-slate-300">
        <div class="flex items-center justify-between">
          <span class="flex items-center gap-1.5">
            <span>${deviceIcon}</span>
            <span class="text-slate-400">Device:</span>
          </span>
          <span class="font-medium text-slate-200 capitalize">${point.deviceType}</span>
        </div>

        <div class="flex items-center justify-between">
          <span class="flex items-center gap-1.5">
            <span>🧭</span>
            <span class="text-slate-400">OS/Browser:</span>
          </span>
          <span class="font-medium text-slate-200 truncate max-w-[130px]">
            ${point.os || "OS"} • ${point.browser || "Browser"}
          </span>
        </div>

        <div class="flex items-center justify-between">
          <span class="flex items-center gap-1.5">
            <span>🛡️</span>
            <span class="text-slate-400">Visited:</span>
          </span>
          <span class="font-mono text-[11px] truncate max-w-[130px] text-amber-400 font-semibold">
            ${point.path || "/"}
          </span>
        </div>

        <div class="flex items-center justify-between text-slate-400 text-[11px] pt-1.5 border-t border-slate-700/60">
          <span>🕒 Timestamp:</span>
          <span class="text-slate-300 font-medium">${timeStr}</span>
        </div>
      </div>
    </div>
  `;
}

export default function VisitorMapInner({
  points,
  selectedPoint,
  onSelectPoint,
  theme = "dark",
}: VisitorMapInnerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const markersMapRef = useRef<Map<string, L.Marker>>(new Map());

  // 1. Initialize Map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const defaultCenter: [number, number] = points.length > 0
      ? [points[0].latitude, points[0].longitude]
      : [-1.9441, 30.0619];

    const map = L.map(containerRef.current, {
      center: defaultCenter,
      zoom: points.length > 1 ? 3 : 6,
      zoomControl: true,
      attributionControl: false,
    });

    const tileUrl = theme === "dark"
      ? "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

    L.tileLayer(tileUrl, {
      maxZoom: 19,
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    layerGroupRef.current = layerGroup;
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [theme]); // eslint-disable-line react-hooks/exhaustive-deps

  // 2. Render Markers & Auras
  useEffect(() => {
    const map = mapRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();
    markersMapRef.current.clear();

    points.forEach((point) => {
      const isSelected = selectedPoint?.id === point.id;
      const marker = L.marker([point.latitude, point.longitude], {
        icon: createCustomPin(point.deviceType, isSelected),
      });

      marker.bindPopup(renderPopupContent(point), {
        className: "visitor-custom-popup",
        closeButton: true,
      });

      marker.on("click", () => {
        onSelectPoint(point);
      });

      marker.addTo(layerGroup);
      markersMapRef.current.set(point.id, marker);

      // Add radial aura for points
      const isMobile = point.deviceType.toLowerCase().includes("mobile");
      L.circleMarker([point.latitude, point.longitude], {
        radius: 18,
        color: isMobile ? "#38BDF8" : "#4ADE80",
        fillColor: isMobile ? "#38BDF8" : "#4ADE80",
        fillOpacity: 0.12,
        weight: 1,
      }).addTo(layerGroup);
    });
  }, [points, selectedPoint, onSelectPoint]);

  // 3. Fly to Selected Point
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedPoint) return;

    map.flyTo([selectedPoint.latitude, selectedPoint.longitude], 8, {
      duration: 1.2,
    });

    const marker = markersMapRef.current.get(selectedPoint.id);
    if (marker) {
      marker.openPopup();
    }
  }, [selectedPoint]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[420px] rounded-2xl overflow-hidden relative z-0"
      style={{ background: "#0F172A" }}
    />
  );
}
