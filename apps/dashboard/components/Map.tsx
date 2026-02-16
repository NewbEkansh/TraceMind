"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet/dist/leaflet.css";
import { Alert } from "@/hooks/useRealTimeAlerts";

// Auto-zoom to latest critical alert + heatmap layer
function MapController({ alerts }: { alerts: Alert[] }) {
  const map = useMap();
  const prevCriticalCount = useRef(0);
  const heatLayerRef = useRef<any>(null);

  // Heatmap effect - FIXED with dynamic import
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Dynamic import to avoid SSR issues
    const loadHeatmap = async () => {
      try {
        const L = (await import("leaflet")).default;
        
        // Dynamically import leaflet.heat
        await import("leaflet.heat");

        // Remove existing heat layer
        if (heatLayerRef.current) {
          map.removeLayer(heatLayerRef.current);
        }

        const heatPoints = alerts
          .filter((a) => a.location[0] && a.location[1])
          .map((a) => [
            a.location[0],
            a.location[1],
            a.risk_level === "CRITICAL" ? 1.0 : a.risk_level === "HIGH" ? 0.5 : 0.2,
          ]);

        if (heatPoints.length > 0) {
          heatLayerRef.current = (L as any).heatLayer(heatPoints, {
            radius: 35,
            blur: 25,
            maxZoom: 10,
            max: 1.0,
            gradient: {
              0.0: "#1e3a5f",
              0.3: "#1d4ed8",
              0.5: "#f59e0b",
              0.8: "#ef4444",
              1.0: "#ff0000",
            },
          });
          heatLayerRef.current.addTo(map);
        }
      } catch (error) {
        console.error("Error loading heatmap:", error);
      }
    };

    loadHeatmap();

    // Cleanup
    return () => {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
      }
    };
  }, [alerts, map]);

  // Auto-zoom to new critical alerts
  useEffect(() => {
    const criticals = alerts.filter((a) => a.risk_level === "CRITICAL");
    if (criticals.length > prevCriticalCount.current && criticals.length > 0) {
      const latest = criticals[0];
      if (latest.location[0] && latest.location[1]) {
        map.flyTo(latest.location, 10, { animate: true, duration: 1.5 });
      }
    }
    prevCriticalCount.current = criticals.length;
  }, [alerts, map]);

  return null;
}

export default function Map({ alerts }: { alerts: Alert[] }) {
  return (
    <MapContainer
      center={[20.5937, 78.9629]}
      zoom={5}
      style={{ height: "100%", width: "100%" }}
      className="bg-slate-900"
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />

      <MapController alerts={alerts} />

      <MarkerClusterGroup
        chunkedLoading
        polygonOptions={{
          fillColor: "#ffffff",
          color: "#ffffff",
          weight: 2,
          opacity: 1,
          fillOpacity: 0.5,
        }}
      >
        {alerts.map((alert) => (
          <CircleMarker
            key={alert.id}
            center={alert.location}
            radius={alert.risk_level === "CRITICAL" ? 10 : 6}
            pathOptions={{
              color:
                alert.risk_level === "CRITICAL"
                  ? "#ef4444"
                  : alert.risk_level === "HIGH"
                  ? "#eab308"
                  : "#3b82f6",
              fillColor:
                alert.risk_level === "CRITICAL"
                  ? "#ef4444"
                  : alert.risk_level === "HIGH"
                  ? "#eab308"
                  : "#3b82f6",
              fillOpacity: 0.85,
              weight: 2,
            }}
          >
            <Popup>
              <div className="text-slate-900 text-sm font-sans min-w-[160px]">
                <strong className="block text-base mb-1">{alert.drug_id}</strong>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-bold text-white ${
                    alert.risk_level === "CRITICAL"
                      ? "bg-red-600"
                      : alert.risk_level === "HIGH"
                      ? "bg-yellow-600"
                      : "bg-blue-600"
                  }`}
                >
                  {alert.risk_level}
                </span>
                <p className="mt-2 text-xs text-slate-600">{alert.details}</p>
                <div className="mt-2 pt-2 border-t border-slate-200 text-[10px] text-slate-500 font-mono">
                  {new Date(alert.timestamp).toLocaleString()}
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
}