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
      link.integrity =
        "sha256-p4NxAoJBhIINfQ3yn5BqWnI6hGZVhA8Q4D7u9k4b7w4=";
      link.crossOrigin = "";
      document.head.appendChild(link);
    }

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${LEAFLET_JS}"]`
    );

    if (existing) {
      existing.addEventListener("load", () => {
        if (window.L) resolve(window.L);
      });
      existing.addEventListener("error", () =>
        reject(new Error("Leaflet failed to load"))
      );
      return;
    }

    const script = document.createElement("script");
    script.src = LEAFLET_JS;
    script.crossOrigin = "";
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
          scrollWheelZoom: false,
        });
        mapRef.current = map;

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 18,
          attribution: "&copy; OpenStreetMap contributors",
        }).addTo(map);

        const maxTotal = Math.max(
          ...locations.map((location) => location.total_accidents),
          1
        );

        const points: Array<[number, number]> = [];

        locations.forEach((location) => {
          const lat = Number(location.latitude);
          const lng = Number(location.longitude);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

          points.push([lat, lng]);

          const radius =
            5 + Math.sqrt(location.total_accidents / maxTotal) * 18;

          const marker = L.circleMarker([lat, lng], {
            radius,
            color: "#22d3ee",
            weight: 1.5,
            fillColor: "#06b6d4",
            fillOpacity: 0.55,
          }).addTo(map);

          const change =
            location.total_2020 > 0
              ? ((location.total_2021 - location.total_2020) /
                  location.total_2020) *
                100
              : 0;

          marker.bindPopup(`
            <div style="min-width:190px;font-family:system-ui,sans-serif">
              <strong style="font-size:14px">${escapeHtml(location.district)}</strong>
              <div style="margin-top:8px">2020: ${location.total_2020.toLocaleString("en-IN")}</div>
              <div>2021: ${location.total_2021.toLocaleString("en-IN")}</div>
              <div>Total: <strong>${location.total_accidents.toLocaleString("en-IN")}</strong></div>
              <div style="margin-top:6px">2021 change: ${change >= 0 ? "+" : ""}${change.toFixed(1)}%</div>
            </div>
          `);
        });

        if (points.length > 0) {
          map.fitBounds(L.latLngBounds(points), {
            padding: [28, 28],
            maxZoom: 8,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("The interactive map could not be loaded.");
        }
      });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [locations]);

  if (locations.length === 0) {
    return (
      <div className="flex h-[480px] items-center justify-center text-sm text-slate-500">
        Run district ingestion and dbt build to populate the map.
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[480px] items-center justify-center text-sm text-rose-300">
        {error}
      </div>
    );
  }

  return (
    <div className="relative">
      <div ref={containerRef} className="h-[480px] w-full bg-slate-950" />
      <div className="pointer-events-none absolute left-4 top-4 z-[500] rounded-lg border border-slate-700 bg-slate-950/90 px-3 py-2 text-xs text-slate-300 shadow-lg">
        Larger circles = more accidents
      </div>
    </div>
  );
}
