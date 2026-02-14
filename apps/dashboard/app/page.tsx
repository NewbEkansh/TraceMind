"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRealTimeAlerts } from "@/hooks/useRealTimeAlerts";
import {
  ShieldAlert,
  Activity,
  MapPin,
  Zap,
  Map,
  Table,
  Search,
  CheckCircle,
} from "lucide-react";

const MapComponent = dynamic(() => import("@/components/Map"), { ssr: false });

type RiskFilter = "ALL" | "CRITICAL" | "HIGH" | "LOW";
type ViewMode = "MAP" | "TABLE";

export default function Dashboard() {
  const { alerts } = useRealTimeAlerts();
  const [viewMode, setViewMode] = useState<ViewMode>("MAP");
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Metrics
  const critical = alerts.filter((a) => a.risk_level === "CRITICAL").length;
  const high = alerts.filter((a) => a.risk_level === "HIGH").length;
  const safe = alerts.filter((a) => a.risk_level === "LOW").length;

  // Filtered alerts for table
  const filteredAlerts = alerts.filter((a) => {
    const matchesRisk = riskFilter === "ALL" || a.risk_level === riskFilter;
    const matchesSearch =
      searchQuery === "" ||
      a.drug_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.details.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRisk && matchesSearch;
  });

  return (
    <div className="h-screen w-full bg-[#020617] text-slate-200 flex flex-col overflow-hidden">
      {/* NAVBAR */}
      <header className="h-16 border-b border-slate-800 bg-slate-950/50 backdrop-blur flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight text-white">
              TraceMind
            </h1>
            <p className="text-[10px] text-blue-400 font-mono tracking-wider uppercase">
              Live Integrity Monitor
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <StatusBadge label="SYSTEM" status="ONLINE" color="bg-green-500" />
          <StatusBadge label="AI ENGINE" status="ACTIVE" color="bg-blue-500" />
          <StatusBadge label="BLOCKCHAIN" status="SYNCED" color="bg-purple-500" />
        </div>
      </header>

      {/* MAIN GRID */}
      <main className="flex-1 p-4 grid grid-cols-12 gap-4 overflow-hidden">
        {/* LEFT COLUMN */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-4 h-full overflow-hidden">
          {/* Metric Cards */}
          <div className="grid grid-cols-3 gap-3 shrink-0">
            <MetricCard
              label="Critical"
              value={critical}
              icon={<ShieldAlert className="w-4 h-4 text-red-500" />}
              borderColor="border-red-900/50"
            />
            <MetricCard
              label="Suspicious"
              value={high}
              icon={<Zap className="w-4 h-4 text-yellow-500" />}
              borderColor="border-yellow-900/50"
            />
            <MetricCard
              label="Safe"
              value={safe}
              icon={<CheckCircle className="w-4 h-4 text-green-500" />}
              borderColor="border-green-900/50"
            />
          </div>

          {/* Live Alert Feed */}
          <div className="flex-1 bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
            <div className="p-3 border-b border-slate-800 bg-slate-900/80 flex justify-between items-center shrink-0">
              <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-400" /> Live Scan Feed
              </h2>
              <span className="text-[10px] bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded border border-blue-900/50 animate-pulse">
                {alerts.length} SCANS
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {alerts.length === 0 && (
                <div className="text-center text-slate-600 text-xs mt-8">
                  Waiting for scans...
                </div>
              )}
              {alerts.map((alert) => (
                <AlertItem key={alert.id} alert={alert} />
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="col-span-12 lg:col-span-8 bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden relative flex flex-col">
          {/* Map/Table Toggle Header */}
          <div className="shrink-0 border-b border-slate-800 bg-slate-900/80 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-xs font-mono text-slate-400">
                {viewMode === "MAP" ? "GLOBAL VIEW: INDIA REGION" : `SCAN LOG — ${filteredAlerts.length} RESULTS`}
              </span>
            </div>
            {/* Toggle Buttons */}
            <div className="flex items-center gap-1 bg-slate-950 rounded-lg p-1 border border-slate-800">
              <button
                onClick={() => setViewMode("MAP")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  viewMode === "MAP"
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Map className="w-3 h-3" /> Map
              </button>
              <button
                onClick={() => setViewMode("TABLE")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  viewMode === "TABLE"
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Table className="w-3 h-3" /> Scan Log
              </button>
            </div>
          </div>

          {/* MAP VIEW */}
          {viewMode === "MAP" && (
            <div className="flex-1 relative">
              <MapComponent alerts={alerts} />
            </div>
          )}

          {/* TABLE VIEW */}
          {viewMode === "TABLE" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Search + Filter Bar */}
              <div className="shrink-0 p-3 border-b border-slate-800 flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search by unit ID or reason..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-blue-700"
                  />
                </div>
                <div className="flex items-center gap-1">
                  {(["ALL", "CRITICAL", "HIGH", "LOW"] as RiskFilter[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => setRiskFilter(f)}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-all ${
                        riskFilter === f
                          ? f === "CRITICAL"
                            ? "bg-red-600 border-red-600 text-white"
                            : f === "HIGH"
                            ? "bg-yellow-600 border-yellow-600 text-white"
                            : f === "LOW"
                            ? "bg-green-700 border-green-700 text-white"
                            : "bg-blue-600 border-blue-600 text-white"
                          : "bg-transparent border-slate-700 text-slate-400 hover:border-slate-500"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-slate-950 border-b border-slate-800">
                    <tr>
                      <th className="text-left px-4 py-2.5 text-slate-500 font-semibold uppercase tracking-wider">Timestamp</th>
                      <th className="text-left px-4 py-2.5 text-slate-500 font-semibold uppercase tracking-wider">Unit ID</th>
                      <th className="text-left px-4 py-2.5 text-slate-500 font-semibold uppercase tracking-wider">Risk</th>
                      <th className="text-left px-4 py-2.5 text-slate-500 font-semibold uppercase tracking-wider">Details</th>
                      <th className="text-left px-4 py-2.5 text-slate-500 font-semibold uppercase tracking-wider">Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAlerts.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-slate-600">
                          No scans match the current filter.
                        </td>
                      </tr>
                    )}
                    {filteredAlerts.map((alert, i) => (
                      <tr
                        key={alert.id}
                        className={`border-b border-slate-800/50 transition-colors hover:bg-slate-800/30 ${
                          alert.risk_level === "CRITICAL"
                            ? "bg-red-950/10"
                            : alert.risk_level === "HIGH"
                            ? "bg-yellow-950/10"
                            : ""
                        }`}
                      >
                        <td className="px-4 py-3 font-mono text-slate-500 whitespace-nowrap">
                          {new Date(alert.timestamp).toLocaleString("en-IN", {
                            month: "short",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-300 font-medium">
                          {alert.drug_id}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              alert.risk_level === "CRITICAL"
                                ? "text-red-400 bg-red-950 border-red-900"
                                : alert.risk_level === "HIGH"
                                ? "text-yellow-400 bg-yellow-950 border-yellow-900"
                                : "text-green-400 bg-green-950 border-green-900"
                            }`}
                          >
                            {alert.risk_level}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400 max-w-[220px] truncate">
                          {alert.details}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-500 whitespace-nowrap">
                          {alert.location[0].toFixed(3)}, {alert.location[1].toFixed(3)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// --- SUB-COMPONENTS ---
function StatusBadge({ label, status, color }: any) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-1.5 h-1.5 rounded-full ${color} shadow-[0_0_8px_currentColor]`} />
      <div className="flex flex-col leading-none">
        <span className="text-[9px] text-slate-500 font-bold">{label}</span>
        <span className="text-[10px] text-slate-300 font-mono">{status}</span>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon, borderColor }: any) {
  return (
    <div className={`bg-slate-900/50 border ${borderColor || "border-slate-800"} p-3 rounded-xl flex flex-col justify-between`}>
      <div className="flex justify-between items-start">
        <span className="text-slate-400 text-[10px] font-medium uppercase tracking-wider">{label}</span>
        {icon}
      </div>
      <span className="text-2xl font-bold text-white mt-2 block">{value}</span>
    </div>
  );
}

function AlertItem({ alert }: any) {
  const isCritical = alert.risk_level === "CRITICAL";
  const isHigh = alert.risk_level === "HIGH";
  return (
    <div
      className={`p-3 rounded-lg border transition-all hover:bg-slate-800 ${
        isCritical
          ? "bg-red-950/10 border-red-900/30 hover:border-red-700"
          : isHigh
          ? "bg-yellow-950/10 border-yellow-900/30 hover:border-yellow-700"
          : "bg-slate-950/30 border-slate-800 hover:border-slate-700"
      }`}
    >
      <div className="flex justify-between items-start mb-1">
        <span className="font-mono text-[10px] text-slate-500">
          {new Date(alert.timestamp).toLocaleTimeString()}
        </span>
        <span
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
            isCritical
              ? "text-red-400 bg-red-950 border-red-900"
              : isHigh
              ? "text-yellow-400 bg-yellow-950 border-yellow-900"
              : "text-green-400 bg-green-950 border-green-900"
          }`}
        >
          {alert.risk_level}
        </span>
      </div>
      <div className="text-xs text-slate-300 font-medium mb-0.5">{alert.drug_id}</div>
      <div className="text-[11px] text-slate-500 leading-tight">{alert.details}</div>
    </div>
  );
}