"use client";

import dynamic from "next/dynamic";
import { useRealTimeAlerts } from "@/hooks/useRealTimeAlerts";
import { ShieldAlert, Activity, MapPin, Zap, CheckCircle } from "lucide-react";

// Lazy load Map
const MapComponent = dynamic(() => import("@/components/Map"), { ssr: false });

export default function Dashboard() {
  const { alerts } = useRealTimeAlerts();

  // Metrics Calculation
  const critical = alerts.filter((a) => a.risk_level === "CRITICAL").length;
  const high = alerts.filter((a) => a.risk_level === "HIGH").length;
  const safe = alerts.filter((a) => a.risk_level === "LOW").length;

  return (
    <div className="h-screen w-full bg-[#020617] text-slate-200 flex flex-col overflow-hidden">
      {/* 1. TOP NAVBAR */}
      <header className="h-16 border-b border-slate-800 bg-slate-950/50 backdrop-blur flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight text-white">
              TraceMind Sentinel
            </h1>
            <p className="text-[10px] text-blue-400 font-mono tracking-wider uppercase">
              Live Integrity Monitor
            </p>
          </div>
        </div>

        {/* Live Status Indicators */}
        <div className="flex items-center gap-6">
          <StatusBadge label="SYSTEM" status="ONLINE" color="bg-green-500" />
          <StatusBadge label="AI ENGINE" status="ACTIVE" color="bg-blue-500" />
          <StatusBadge
            label="BLOCKCHAIN"
            status="SYNCED"
            color="bg-purple-500"
          />
        </div>
      </header>

      {/* 2. MAIN GRID CONTENT */}
      <main className="flex-1 p-4 grid grid-cols-12 gap-4 overflow-hidden">
        {/* LEFT COLUMN: Metrics & Feed (Width: 4/12) */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-4 h-full overflow-hidden">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-2 gap-3 shrink-0">
            <MetricCard
              label="Critical Threats"
              value={critical}
              icon={<ShieldAlert className="w-5 h-5 text-red-500" />}
              trend="+2 this hour"
              borderColor="border-red-900/50"
            />
            <MetricCard
              label="Suspicious"
              value={high}
              icon={<Zap className="w-5 h-5 text-yellow-500" />}
              trend="Steady"
              borderColor="border-yellow-900/50"
            />
          </div>

          {/* Live Alert Feed */}
          <div className="flex-1 bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
            <div className="p-3 border-b border-slate-800 bg-slate-900/80 flex justify-between items-center">
              <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-400" /> Live Scan Feed
              </h2>
              <span className="text-[10px] bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded border border-blue-900/50 animate-pulse">
                RECEIVING DATA...
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
              {alerts.map((alert) => (
                <AlertItem key={alert.id} alert={alert} />
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Map & Visualization (Width: 8/12) */}
        <div className="col-span-12 lg:col-span-8 bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden relative flex flex-col">
          {/* Map Header */}
          <div className="absolute top-4 left-4 z-[400] flex gap-2">
            <div className="bg-black/80 backdrop-blur border border-slate-700 px-3 py-1.5 rounded-md text-xs font-mono text-slate-300 shadow-xl">
              <MapPin className="w-3 h-3 inline mr-1 text-blue-400" />
              Global View: INDIA REGION
            </div>
          </div>

          {/* The Map */}
          <div className="flex-1 bg-slate-950 relative">
            <MapComponent alerts={alerts} />
          </div>
        </div>
      </main>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function StatusBadge({ label, status, color }: any) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-1.5 h-1.5 rounded-full ${color} shadow-[0_0_8px_currentColor]`}
      />
      <div className="flex flex-col leading-none">
        <span className="text-[9px] text-slate-500 font-bold">{label}</span>
        <span className="text-[10px] text-slate-300 font-mono">{status}</span>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon, trend, borderColor }: any) {
  return (
    <div
      className={`bg-slate-900/50 border ${borderColor || "border-slate-800"} p-4 rounded-xl flex flex-col justify-between`}
    >
      <div className="flex justify-between items-start">
        <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">
          {label}
        </span>
        {icon}
      </div>
      <div className="mt-2">
        <span className="text-2xl font-bold text-white block">{value}</span>
        <span className="text-[10px] text-slate-500 mt-1 block font-mono">
          {trend}
        </span>
      </div>
    </div>
  );
}

function AlertItem({ alert }: any) {
  const isCritical = alert.risk_level === "CRITICAL";
  const isHigh = alert.risk_level === "HIGH";

  return (
    <div
      className={`group p-3 rounded-lg border transition-all hover:bg-slate-800 ${
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
      <div className="text-xs text-slate-300 font-medium mb-0.5">
        {alert.drug_id}
      </div>
      <div className="text-[11px] text-slate-500 leading-tight">
        {alert.details}
      </div>
    </div>
  );
}
