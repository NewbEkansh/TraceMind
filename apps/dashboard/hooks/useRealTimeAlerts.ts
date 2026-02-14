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

  // HELPER: Converts Friend's DB Format -> Your Dashboard Format
  const mapDatabaseRowToAlert = (row: any): Alert => {
    return {
      id: row.id,
      drug_id: row.unit_id || "Unknown ID", // Mapping unit_id -> drug_id

      // Logic: If anomaly is TRUE, we mark it CRITICAL. Else LOW.
      risk_level: row.anomaly_detected ? "CRITICAL" : "LOW",

      timestamp: row.timestamp,

      // Combine lat/long back into an array
      location: [row.latitude || 20.5, row.longitude || 78.9],

      details: row.anomaly_reason || "Routine Scan", // Mapping anomaly_reason -> details
    };
  };

  useEffect(() => {
    // 1. Fetch History
    const fetchHistory = async () => {
      const { data, error } = await supabase
        .from("scans")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(20);

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
