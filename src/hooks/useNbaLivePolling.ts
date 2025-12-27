import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseNbaLivePollingOptions {
  enabled?: boolean;
  intervalMs?: number;
}

// Check if we're within a window where an NBA game might be live
async function isWithinMatchWindow(): Promise<boolean> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - 4 * 60 * 60 * 1000); // 4 hours ago (game might still be on)
  const windowEnd = new Date(now.getTime() + 90 * 60 * 1000); // 90 mins ahead (tipoff soon)
  
  // Check for any NBA matches in the window
  const { data: upcomingNba, error } = await supabase
    .from('athlete_upcoming_matches')
    .select('id, match_date')
    .eq('competition', 'NBA')
    .gte('match_date', windowStart.toISOString())
    .lte('match_date', windowEnd.toISOString())
    .limit(1);
  
  if (error) {
    console.log('[NBA Live] Error checking match window:', error.message);
    return false;
  }
  
  // Also check if there's an active live match already
  const { data: liveMatches } = await supabase
    .from('athlete_live_matches')
    .select('id')
    .eq('competition', 'NBA')
    .in('match_status', ['live', 'halftime'])
    .limit(1);
  
  const hasUpcoming = (upcomingNba?.length || 0) > 0;
  const hasLive = (liveMatches?.length || 0) > 0;
  
  console.log(`[NBA Live] Window check: upcoming=${hasUpcoming}, live=${hasLive}`);
  
  return hasUpcoming || hasLive;
}

export const useNbaLivePolling = ({ 
  enabled = false, // DEFAULT TO FALSE - opt-in only
  intervalMs = 60000 // Increase default to 60 seconds
}: UseNbaLivePollingOptions = {}) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPolling = useRef(false);
  const [isInWindow, setIsInWindow] = useState(false);

  const syncLiveNba = useCallback(async () => {
    if (isPolling.current) return;
    
    isPolling.current = true;
    try {
      // First check if we're in a match window
      const inWindow = await isWithinMatchWindow();
      setIsInWindow(inWindow);
      
      if (!inWindow) {
        console.log('[NBA Live] Skipping sync - outside match window');
        return;
      }
      
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

  return { syncNow: syncLiveNba, isInWindow };
};
