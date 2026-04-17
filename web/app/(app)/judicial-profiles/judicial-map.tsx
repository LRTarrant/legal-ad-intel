"use client";

import { useEffect, useMemo, useState } from "react";
import { GeoJSON, MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import type { Feature, FeatureCollection, GeoJsonProperties, Geometry } from "geojson";
import type { JudicialProfileRow } from "@/lib/queries";

const COUNTY_GEOJSON_URL =
  "https://cdn.jsdelivr.net/gh/plotly/datasets@master/geojson-counties-fips.json";

const DEFAULT_CENTER: [number, number] = [39.5, -98.35];
const DEFAULT_ZOOM = 4;

const profileColors: Record<string, string> = {
  Conservative: "#EF4444",
  Moderate: "#F59E0B",
  Liberal: "#3B82F6",
};

function fipsCode(value: number | string): string {
  return String(value).padStart(5, "0");
}

function countyFeatureId(feature: Feature<Geometry, GeoJsonProperties>): string | null {
  const id = feature.id;
  const propertyId = feature.properties?.GEOID;
  const value = typeof id === "string" || typeof id === "number" ? id : propertyId;
  return value == null ? null : fipsCode(value);
}

function MapViewUpdater({
  filteredGeoJson,
  selectedState,
}: {
  filteredGeoJson: FeatureCollection<Geometry, GeoJsonProperties>;
  selectedState: string | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (selectedState && filteredGeoJson.features.length > 0) {
      const geoJsonLayer = L.geoJSON(filteredGeoJson);
      const bounds = geoJsonLayer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [20, 20] });
      }
    } else {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    }
  }, [map, filteredGeoJson, selectedState]);

  return null;
}

export function JudicialMap({
  rows,
  selectedState,
}: {
  rows: JudicialProfileRow[];
  selectedState: string | null;
}) {
  const [geoJson, setGeoJson] = useState<FeatureCollection<Geometry, GeoJsonProperties> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadGeoJson() {
      try {
        const response = await fetch(COUNTY_GEOJSON_URL);
        if (!response.ok) {
          throw new Error(`Failed to load county geometry (${response.status})`);
        }

        const data = (await response.json()) as FeatureCollection<
          Geometry,
          GeoJsonProperties
        >;

        if (!ignore) {
          setGeoJson(data);
          setError(null);
        }
      } catch (fetchError) {
        if (!ignore) {
          const message =
            fetchError instanceof Error ? fetchError.message : "Unable to load map data.";
          setError(message);
        }
      }
    }

    void loadGeoJson();

    return () => {
      ignore = true;
    };
  }, []);

  const rowsByFips = useMemo(() => {
    return new Map(rows.map((row) => [fipsCode(row.fips), row]));
  }, [rows]);

  const filteredGeoJson = useMemo(() => {
    if (!geoJson) {
      return null;
    }

    const features = geoJson.features.filter((feature) => {
      const geoid = countyFeatureId(feature);
      return geoid != null && rowsByFips.has(geoid);
    });

    return {
      ...geoJson,
      features,
    };
  }, [geoJson, rowsByFips]);

  const mapKey = selectedState ?? "all-states";

  function onEachFeature(
    feature: Feature<Geometry, GeoJsonProperties>,
    layer: L.Layer
  ) {
    const geoid = countyFeatureId(feature);
    if (!geoid || !(layer instanceof L.Path)) {
      return;
    }

    const row = rowsByFips.get(geoid);
    if (!row) {
      return;
    }

    layer.bindTooltip(
      `<strong>${row.county_name}, ${row.state}</strong><br/>${row.judicial_profile}`,
      {
        sticky: true,
      }
    );
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-midnight-navy/5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="font-heading text-xl font-semibold text-midnight-navy">
            Judicial Profile Map
          </h2>
          <p className="mt-1 text-sm text-slate-gray">
            County-level choropleth colored by judicial profile.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.16em]">
          <LegendItem color="#EF4444" label="Conservative" />
          <LegendItem color="#F59E0B" label="Moderate" />
          <LegendItem color="#3B82F6" label="Liberal" />
        </div>
      </div>

      {error ? (
        <div className="mt-4 flex h-[520px] items-center justify-center rounded-2xl bg-cloud text-sm text-slate-gray">
          {error}
        </div>
      ) : !filteredGeoJson ? (
        <div className="mt-4 flex h-[520px] items-center justify-center rounded-2xl bg-cloud text-sm text-slate-gray">
          Loading county boundaries…
        </div>
      ) : filteredGeoJson.features.length === 0 ? (
        <div className="mt-4 flex h-[520px] items-center justify-center rounded-2xl bg-cloud text-sm text-slate-gray">
          No county boundaries match the current filter.
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border border-midnight-navy/10">
          <MapContainer
            key={mapKey}
            center={DEFAULT_CENTER}
            zoom={DEFAULT_ZOOM}
            scrollWheelZoom={false}
            className="h-[520px] w-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <GeoJSON
              data={filteredGeoJson}
              style={(feature) => {
                const geoid = feature ? countyFeatureId(feature) : null;
                const row = geoid ? rowsByFips.get(geoid) : null;
                const color = row ? profileColors[row.judicial_profile] ?? "#94A3B8" : "#CBD5E1";

                return {
                  color: "#FFFFFF",
                  fillColor: color,
                  fillOpacity: 0.78,
                  opacity: 1,
                  weight: 0.7,
                };
              }}
              onEachFeature={onEachFeature}
            />
            <MapViewUpdater
              filteredGeoJson={filteredGeoJson}
              selectedState={selectedState}
            />
          </MapContainer>
        </div>
      )}
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-cloud px-3 py-1 text-slate-gray">
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}
