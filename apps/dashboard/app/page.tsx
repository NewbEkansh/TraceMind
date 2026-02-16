"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRealTimeAlerts } from "@/hooks/useRealTimeAlerts";
import {
  ShieldAlert,
  Activity,
  MapPin,
  Zap,
  Search,
  CheckCircle,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Clock,
} from "lucide-react";

const MapComponent = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-slate-900">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-slate-400">Loading Map...</p>
      </div>
    </div>
  ),
});

export default function Dashboard() {
  const { alerts, loading } = useRealTimeAlerts();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRisk, setFilterRisk] = useState<string>("all");

  const filteredAlerts = alerts.filter((alert) => {
    const matchesSearch = alert.drug_id
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesRisk = filterRisk === "all" || alert.risk_level === filterRisk;
    return matchesSearch && matchesRisk;
  });

  const totalScans = alerts.length;
  const criticalCount = alerts.filter((a) => a.risk_level === "CRITICAL").length;
  const highCount = alerts.filter((a) => a.risk_level === "HIGH").length;
  const lowCount = alerts.filter((a) => a.risk_level === "LOW").length;
  const anomalyRate = totalScans > 0 
    ? ((criticalCount + highCount) / totalScans * 100).toFixed(1) 
    : "0.0";

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "CRITICAL":
        return "bg-gradient-to-r from-red-500 to-red-600 text-white";
      case "HIGH":
        return "bg-gradient-to-r from-yellow-500 to-yellow-600 text-white";
      case "LOW":
        return "bg-gradient-to-r from-blue-500 to-blue-600 text-white";
      default:
        return "bg-gradient-to-r from-gray-500 to-gray-600 text-white";
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="bg-slate-900/50 backdrop-blur-xl border-b border-slate-800 flex-shrink-0 z-50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2.5 rounded-xl shadow-lg shadow-blue-500/20">
                <ShieldAlert className="text-white" size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  TraceMind
                </h1>
                <p className="text-xs text-slate-400 font-medium">
                  Real-time Pharmaceutical Intelligence
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 bg-slate-800/50 px-4 py-2 rounded-full border border-slate-700">
              <div className="relative">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <div className="absolute inset-0 w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
              </div>
              <span className="text-sm font-medium text-green-400">Live</span>
              <span className="text-xs text-slate-400">Auto-refresh: 5s</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <div className="flex-1 overflow-hidden flex flex-col p-6 gap-6">
        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 flex-shrink-0">
          {/* Total Scans */}
          <div className="group bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50 hover:border-blue-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1">
            <div className="flex items-start justify-between mb-4">
              <div className="bg-blue-500/10 p-3 rounded-xl group-hover:bg-blue-500/20 transition-colors">
                <Activity className="text-blue-400" size={24} />
              </div>
              <TrendingUp className="text-blue-400 opacity-50" size={20} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-400">Total Scans</p>
              <p className="text-4xl font-bold text-white">{totalScans}</p>
              <p className="text-xs text-slate-500">All-time activity</p>
            </div>
          </div>

          {/* Critical */}
          <div className="group bg-gradient-to-br from-red-900/20 to-slate-900/50 backdrop-blur-xl rounded-2xl p-6 border border-red-500/30 hover:border-red-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-red-500/10 hover:-translate-y-1">
            <div className="flex items-start justify-between mb-4">
              <div className="bg-red-500/10 p-3 rounded-xl group-hover:bg-red-500/20 transition-colors">
                <XCircle className="text-red-400" size={24} />
              </div>
              <AlertTriangle className="text-red-400 opacity-50" size={20} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-400">Critical</p>
              <p className="text-4xl font-bold text-red-400">{criticalCount}</p>
              <p className="text-xs text-red-500/70">Immediate action required</p>
            </div>
          </div>

          {/* High Risk */}
          <div className="group bg-gradient-to-br from-yellow-900/20 to-slate-900/50 backdrop-blur-xl rounded-2xl p-6 border border-yellow-500/30 hover:border-yellow-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-yellow-500/10 hover:-translate-y-1">
            <div className="flex items-start justify-between mb-4">
              <div className="bg-yellow-500/10 p-3 rounded-xl group-hover:bg-yellow-500/20 transition-colors">
                <AlertTriangle className="text-yellow-400" size={24} />
              </div>
              <Zap className="text-yellow-400 opacity-50" size={20} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-400">High Risk</p>
              <p className="text-4xl font-bold text-yellow-400">{highCount}</p>
              <p className="text-xs text-yellow-500/70">Suspicious patterns</p>
            </div>
          </div>

          {/* Anomaly Rate */}
          <div className="group bg-gradient-to-br from-purple-900/20 to-slate-900/50 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/30 hover:border-purple-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10 hover:-translate-y-1">
            <div className="flex items-start justify-between mb-4">
              <div className="bg-purple-500/10 p-3 rounded-xl group-hover:bg-purple-500/20 transition-colors">
                <Zap className="text-purple-400" size={24} />
              </div>
              <Activity className="text-purple-400 opacity-50" size={20} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-400">Anomaly Rate</p>
              <p className="text-4xl font-bold text-purple-400">{anomalyRate}%</p>
              <p className="text-xs text-purple-500/70">AI detection accuracy</p>
            </div>
          </div>
        </div>

        {/* Map and Activity Feed - Takes remaining space */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
          {/* Map - 2/3 width */}
          <div className="lg:col-span-2 bg-slate-800/30 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden shadow-2xl flex flex-col">
            <div className="bg-slate-800/50 px-6 py-4 border-b border-slate-700/50 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <MapPin className="text-blue-400" size={20} />
                <h2 className="text-lg font-semibold text-white">Threat Heatmap</h2>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span>Critical</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span>High</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span>Low</span>
                </div>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <MapComponent alerts={filteredAlerts} />
            </div>
          </div>

          {/* Activity Feed - 1/3 width */}
          <div className="bg-slate-800/30 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden shadow-2xl flex flex-col">
            <div className="bg-slate-800/50 px-6 py-4 border-b border-slate-700/50 flex-shrink-0">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="text-purple-400" size={20} />
                <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
              </div>

              {/* Search and Filter */}
              <div className="space-y-3">
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={18}
                  />
                  <input
                    type="text"
                    placeholder="Search by drug ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                  />
                </div>

                <div className="flex gap-2">
                  {["all", "CRITICAL", "HIGH", "LOW"].map((risk) => (
                    <button
                      key={risk}
                      onClick={() => setFilterRisk(risk)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        filterRisk === risk
                          ? risk === "CRITICAL"
                            ? "bg-red-500 text-white"
                            : risk === "HIGH"
                            ? "bg-yellow-500 text-white"
                            : risk === "LOW"
                            ? "bg-blue-500 text-white"
                            : "bg-slate-700 text-white"
                          : "bg-slate-800/50 text-slate-400 hover:bg-slate-700/50"
                      }`}
                    >
                      {risk === "all" ? "All" : risk}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Scrollable Activity List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar min-h-0">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-2"></div>
                    <p className="text-sm text-slate-400">Loading scans...</p>
                  </div>
                </div>
              ) : filteredAlerts.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <CheckCircle className="mx-auto mb-2 text-slate-600" size={48} />
                    <p className="text-sm text-slate-400">No scans found</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {searchTerm || filterRisk !== "all"
                        ? "Try adjusting filters"
                        : "Waiting for scan activity..."}
                    </p>
                  </div>
                </div>
              ) : (
                filteredAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="bg-slate-900/30 rounded-xl p-4 border border-slate-700/50 hover:border-slate-600 transition-all hover:shadow-lg group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-mono text-sm font-semibold text-white">
                            {alert.drug_id}
                          </p>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getRiskColor(
                              alert.risk_level
                            )}`}
                          >
                            {alert.risk_level}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-2">
                          {alert.details}
                        </p>
                      </div>
                    </div>

                    {alert.speed_kmh !== undefined && alert.speed_kmh > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-700/50 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-slate-500">Speed</p>
                          <p className="font-semibold text-slate-300">
                            {alert.speed_kmh.toFixed(0)} km/h
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500">Distance</p>
                          <p className="font-semibold text-slate-300">
                            {alert.distance_km?.toFixed(1) || "0"} km
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="mt-2 pt-2 border-t border-slate-700/50">
                      <p className="text-[10px] text-slate-500 font-mono">
                        {new Date(alert.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Custom Scrollbar */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgb(15 23 42 / 0.5);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgb(71 85 105 / 0.5);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgb(71 85 105 / 0.8);
        }
      `}</style>
    </div>
  );
}