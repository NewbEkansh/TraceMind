"use client";

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster"; // Import this
import "leaflet/dist/leaflet.css";
import { Alert } from "@/hooks/useRealTimeAlerts";

export default function Map({ alerts }: { alerts: Alert[] }) {
  return (
    <MapContainer
      center={[20.5937, 78.9629]}
      zoom={5}
      style={{ height: "100%", width: "100%" }}
      className="bg-slate-900"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />

      {/* WRAP EVERYTHING IN THIS GROUP */}
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
            // Critical alerts are larger and red
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
              fillOpacity: 0.8,
              weight: 2,
            }}
          >
            <Popup className="custom-popup">
              <div className="text-slate-900 text-sm font-sans">
                <strong className="block text-base mb-1">
                  {alert.drug_id}
                </strong>
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
                  {new Date(alert.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
