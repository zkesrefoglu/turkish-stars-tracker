import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseNbaLivePollingOptions {
  enabled?: boolean;
  intervalMs?: number;
}

export const useNbaLivePolling = ({ 
  enabled = true, 
  intervalMs = 30000 
}: UseNbaLivePollingOptions = {}) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPolling = useRef(false);

  const syncLiveNba = useCallback(async () => {
    if (isPolling.current) return;
    
    isPolling.current = true;
    try {
      console.log('[NBA Live] Syncing live NBA matches...');
      
      const { data, error } = await supabase.functions.invoke('sync-live-nba-matches');
      
      if (error) {
        console.error('[NBA Live] Sync error:', error);
      } else {
        console.log('[NBA Live] Sync result:', data);
      }
    } catch (err) {
      console.error('[NBA Live] Unexpected error:', err);
    } finally {
      isPolling.current = false;
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Initial sync
    syncLiveNba();

    // Set up polling interval
    intervalRef.current = setInterval(syncLiveNba, intervalMs);

    // Pause when tab is hidden
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else {
        // Resume polling when tab becomes visible
        syncLiveNba();
        intervalRef.current = setInterval(syncLiveNba, intervalMs);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, intervalMs, syncLiveNba]);

  return { syncNow: syncLiveNba };
};
