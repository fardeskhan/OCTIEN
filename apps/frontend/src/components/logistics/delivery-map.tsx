"use client";

import * as React from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from "react-leaflet";

export interface MapStop {
  seq: number;
  name: string;
  lat: number;
  lng: number;
  status: string;
  eta?: string;
  customer?: string;
}
export interface MapRun {
  id: string;
  code: string;
  color: string;
  driver?: string;
  vehicle?: string;
  stops: MapStop[];
}

const STOP_COLOR: Record<string, string> = {
  COMPLETED: "#10b981",
  ARRIVED: "#f59e0b",
  PENDING: "#64748b",
  SKIPPED: "#ef4444",
};

function markerIcon(seq: number, fill: string, dimmed: boolean) {
  return L.divIcon({
    className: "",
    html: `<div style="background:${fill};width:26px;height:26px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:700;opacity:${dimmed ? 0.35 : 1}">${seq}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  React.useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 11);
    } else {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
    }
  }, [map, points]);
  return null;
}

export default function DeliveryMap({ runs, selectedRunId, onSelectRun, height = 520 }: {
  runs: MapRun[];
  selectedRunId?: string | null;
  onSelectRun?: (id: string) => void;
  height?: number;
}) {
  const allPoints = runs.flatMap((r) => r.stops.map((s) => [s.lat, s.lng] as [number, number]));
  const center: [number, number] = allPoints.length ? allPoints[0] : [19.076, 72.8777];

  return (
    <div style={{ height }} className="overflow-hidden rounded-lg border border-border">
      <MapContainer center={center} zoom={9} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={allPoints} />
        {runs.map((r) => {
          const dimmed = !!selectedRunId && selectedRunId !== r.id;
          const positions = r.stops.map((s) => [s.lat, s.lng] as [number, number]);
          return (
            <React.Fragment key={r.id}>
              {positions.length > 1 && (
                <Polyline
                  positions={positions}
                  pathOptions={{ color: r.color, weight: dimmed ? 2 : 4, opacity: dimmed ? 0.3 : 0.85, dashArray: "8 6" }}
                  eventHandlers={{ click: () => onSelectRun?.(r.id) }}
                />
              )}
              {r.stops.map((s) => (
                <Marker
                  key={`${r.id}-${s.seq}`}
                  position={[s.lat, s.lng]}
                  icon={markerIcon(s.seq, STOP_COLOR[s.status] ?? "#64748b", dimmed)}
                  eventHandlers={{ click: () => onSelectRun?.(r.id) }}
                >
                  <Popup>
                    <div style={{ fontSize: 12, lineHeight: 1.5 }}>
                      <strong>{r.code}</strong> · Stop {s.seq}<br />
                      {s.name}{s.customer ? ` — ${s.customer}` : ""}<br />
                      Status: {s.status}{s.eta ? ` · ETA ${s.eta}` : ""}<br />
                      {r.driver ? `Driver: ${r.driver}` : ""}{r.vehicle ? ` · ${r.vehicle}` : ""}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </React.Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
}
