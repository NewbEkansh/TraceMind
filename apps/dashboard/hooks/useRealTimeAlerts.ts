import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export interface Alert {
  id: string;
  drug_id: string;
  risk_level: "LOW" | "HIGH" | "CRITICAL";
  timestamp: string;
  location: [number, number];
  details: string;
}

export function useRealTimeAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  // HELPER: Converts DB row → Dashboard Alert format
  const mapDatabaseRowToAlert = (row: any): Alert => {
    // Use risk_level directly from DB if available, fallback to anomaly_detected
    let risk_level: "LOW" | "HIGH" | "CRITICAL" = "LOW";

    if (row.risk_level === "CRITICAL") {
      risk_level = "CRITICAL";
    } else if (row.risk_level === "HIGH") {
      risk_level = "HIGH";
    } else if (row.anomaly_detected) {
      // Fallback for old scans that don't have risk_level stored
      risk_level = "CRITICAL";
    } else {
      risk_level = "LOW";
    }

    return {
      id: row.id,
      drug_id: row.unit_id || "Unknown ID",
      risk_level,
      timestamp: row.timestamp,
      location: [row.latitude || 20.5, row.longitude || 78.9],
      details: row.anomaly_reason || "Routine Scan",
    };
  };

  useEffect(() => {
    // 1. Fetch History
    const fetchHistory = async () => {
      const { data, error } = await supabase
        .from("scans")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(50);

      if (data && !error) {
        setAlerts(data.map(mapDatabaseRowToAlert));
      }
    };

    fetchHistory();

    // 2. Subscribe to Realtime
    const channel = supabase
      .channel("realtime-scans")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "scans" },
        (payload) => {
          console.log("New Scan Received!", payload.new);
          const newAlert = mapDatabaseRowToAlert(payload.new);
          setAlerts((prev) => [newAlert, ...prev]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { alerts };
}