"use client";

import { useEffect, useRef, useState } from "react";

type AccidentLocation = {
  district: string;
  total_2020: number;
  total_2021: number;
  total_accidents: number;
  latitude: number;
  longitude: number;
};

type Props = {
  locations: AccidentLocation[];
};

type LeafletMap = {
  remove: () => void;
  fitBounds: (bounds: unknown, options?: Record<string, unknown>) => void;
};

type LeafletGlobal = {
  map: (element: HTMLElement, options?: Record<string, unknown>) => LeafletMap;
  tileLayer: (url: string, options?: Record<string, unknown>) => {
    addTo: (map: LeafletMap) => unknown;
  };
  circleMarker: (
    coordinates: [number, number],
    options?: Record<string, unknown>
  ) => {
    addTo: (map: LeafletMap) => {
      bindPopup: (html: string) => unknown;
    };
  };
  latLngBounds: (points: Array<[number, number]>) => unknown;
};

declare global {
  interface Window {
    L?: LeafletGlobal;
  }
}

const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

function loadLeaflet(): Promise<LeafletGlobal> {
  return new Promise((resolve, reject) => {
    if (window.L) {
      resolve(window.L);
      return;
    }

    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${LEAFLET_JS}"]`
    );

    if (existing) {
      existing.addEventListener("load", () => window.L && resolve(window.L));
      existing.addEventListener("error", () => reject(new Error("Leaflet failed to load")));
      return;
    }

    const script = document.createElement("script");
    script.src = LEAFLET_JS;
    script.onload = () => {
      if (window.L) resolve(window.L);
      else reject(new Error("Leaflet loaded without global API"));
    };
    script.onerror = () => reject(new Error("Leaflet failed to load"));
    document.body.appendChild(script);
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export default function AccidentMap({ locations }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || locations.length === 0) return;

    let cancelled = false;

    loadLeaflet()
      .then((L) => {
        if (cancelled || !containerRef.current) return;

        mapRef.current?.remove();

        const map = L.map(containerRef.current, {
          zoomControl: true,
          scrollWheelZoom: true,
        });
        mapRef.current = map;

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 18,
          attribution: "&copy; OpenStreetMap contributors",
        }).addTo(map);

        const maxTotal = Math.max(...locations.map((location) => location.total_accidents), 1);
        const points: Array<[number, number]> = [];

        locations.forEach((location) => {
          const lat = Number(location.latitude);
          const lng = Number(location.longitude);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

          points.push([lat, lng]);

          const radius = 6 + Math.sqrt(location.total_accidents / maxTotal) * 18;
          const marker = L.circleMarker([lat, lng], {
            radius,
            color: "#67e8f9",
            weight: 1.5,
            fillColor: "#06b6d4",
            fillOpacity: 0.48,
          }).addTo(map);

          const change =
            location.total_2020 > 0
              ? ((location.total_2021 - location.total_2020) / location.total_2020) * 100
              : 0;

          marker.bindPopup(`
            <div style="min-width:210px;font-family:Inter,system-ui,sans-serif">
              <strong style="font-size:15px">${escapeHtml(location.district)}</strong>
              <div style="margin-top:10px;color:#94a3b8">2020 accidents</div>
              <div style="font-size:16px;font-weight:700">${location.total_2020.toLocaleString("en-IN")}</div>
              <div style="margin-top:6px;color:#94a3b8">2021 accidents</div>
              <div style="font-size:16px;font-weight:700">${location.total_2021.toLocaleString("en-IN")}</div>
              <div style="margin-top:8px;color:#22d3ee;font-weight:700">Total ${location.total_accidents.toLocaleString("en-IN")}</div>
              <div style="margin-top:6px;color:#cbd5e1">2021 change: ${change >= 0 ? "+" : ""}${change.toFixed(1)}%</div>
            </div>
          `);
        });

        if (points.length > 0) {
          map.fitBounds(L.latLngBounds(points), {
            padding: [36, 36],
            maxZoom: 8,
          });
        }
      })
      .catch(() => {
        if (!cancelled) setError("The interactive map could not be loaded.");
      });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [locations]);

  if (locations.length === 0) {
    return (
      <div className="flex h-[620px] items-center justify-center rounded-3xl border border-white/10 bg-slate-950 text-sm text-slate-500">
        No validated location data available.
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[620px] items-center justify-center rounded-3xl border border-rose-400/20 bg-rose-400/5 text-sm text-rose-300">
        {error}
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl shadow-cyan-950/20">
      <div ref={containerRef} className="h-[620px] w-full" />
      <div className="pointer-events-none absolute left-5 top-5 z-[500] rounded-full border border-white/10 bg-slate-950/90 px-4 py-2 text-xs font-medium text-slate-200 backdrop-blur">
        Marker size = combined 2020–2021 accidents
      </div>
    </div>
  );
}
