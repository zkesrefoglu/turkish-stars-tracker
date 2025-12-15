import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface SyncLog {
  id: string;
  sync_type: string;
  synced_at: string;
  status: string;
  details: any;
}

export function useSyncLogs() {
  const [syncLogs, setSyncLogs] = useState<Record<string, SyncLog | null>>({
    football: null,
    nba: null,
    hollinger: null,
    transfermarkt: null,
  });
  const [loading, setLoading] = useState(true);

  const fetchSyncLogs = async () => {
    const types = ["football", "nba", "hollinger", "transfermarkt"];
    const logs: Record<string, SyncLog | null> = {};

    for (const type of types) {
      const { data } = await supabase
        .from("sync_logs")
        .select("*")
        .eq("sync_type", type)
        .order("synced_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      logs[type] = data;
    }

    setSyncLogs(logs);
    setLoading(false);
  };

  useEffect(() => {
    fetchSyncLogs();
  }, []);

  const getLastSyncedText = (type: string): string => {
    const log = syncLogs[type];
    if (!log) return "Never synced";
    
    try {
      return `Last synced: ${formatDistanceToNow(new Date(log.synced_at), { addSuffix: true })}`;
    } catch {
      return "Unknown";
    }
  };

  const logSync = async (type: string, status: "success" | "error", details: any = {}) => {
    await supabase
      .from("sync_logs")
      .insert({
        sync_type: type,
        status,
        details,
      });
    
    // Refresh logs after logging
    fetchSyncLogs();
  };

  return {
    syncLogs,
    loading,
    getLastSyncedText,
    logSync,
    refetch: fetchSyncLogs,
  };
}
