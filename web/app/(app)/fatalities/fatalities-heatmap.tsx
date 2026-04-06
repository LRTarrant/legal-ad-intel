"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L, { type LatLngExpression } from "leaflet";
import "leaflet.heat";
import type { HeatmapPoint } from "@/lib/queries";

type FatalitiesHeatmapProps = {
  points: HeatmapPoint[];
  title: string;
};

function HeatLayer({ points }: { points: HeatmapPoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) {
      return;
    }

    const layer = L.heatLayer(
      points.map((point) => [point.latitude, point.longitude, point.intensity] as [number, number, number]),
      {
        blur: 22,
        max: 8,
        minOpacity: 0.35,
        radius: 18,
      }
    ).addTo(map);

    return () => {
      map.removeLayer(layer);
    };
  }, [map, points]);

  return null;
}

function FitBounds({ points }: { points: HeatmapPoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) {
      map.setView([39.5, -98.35], 4);
      return;
    }

    const bounds = L.latLngBounds(
      points.map((point) => [point.latitude, point.longitude] as [number, number])
    );
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 10 });
  }, [map, points]);

  return null;
}

export function FatalitiesHeatmap({
  points,
  title,
}: FatalitiesHeatmapProps) {
  const center: LatLngExpression = points.length
    ? [points[0].latitude, points[0].longitude]
    : [39.5, -98.35];

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-midnight-navy/5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl font-semibold text-midnight-navy">
            Geo Heatmap
          </h2>
          <p className="mt-1 text-sm text-slate-gray">{title}</p>
        </div>
        <div className="rounded-full bg-cloud px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-intelligence-teal">
          {points.length.toLocaleString()} points
        </div>
      </div>

      {points.length === 0 ? (
        <div className="mt-4 flex h-[420px] items-center justify-center rounded-2xl bg-cloud text-sm text-slate-gray">
          No crash coordinates match the current filter.
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border border-midnight-navy/10">
          <MapContainer
            center={center}
            zoom={4}
            scrollWheelZoom={false}
            className="h-[420px] w-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBounds points={points} />
            <HeatLayer points={points} />
          </MapContainer>
        </div>
      )}
    </div>
  );
}
