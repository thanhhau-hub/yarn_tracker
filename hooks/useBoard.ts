import { useState, useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { AreaWithCount } from '../types';

/**
 * Fetches all active areas with a live count of yarn rolls (LOTs) inside each one.
 * This powers the Board View (home screen).
 * Real-time: re-fetches whenever any yarn_roll is updated.
 */
export function useBoard() {
  const [areas, setAreas] = useState<AreaWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef<AbortController | null>(null);
  const lastFetchStartedAtRef = useRef(0);

  async function fetchBoard(retryCount = 0, force = false) {
    const now = Date.now();
    if (!force && inFlightRef.current) return;
    if (!force && now - lastFetchStartedAtRef.current < 1000) return;

    const controller = new AbortController();
    inFlightRef.current = controller;
    lastFetchStartedAtRef.current = now;
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

    try {
      const { data, error } = await supabase
        .from('areas')
        .select(`
          *,
          yarn_rolls (
            id,
            yarn_code,
            area_id,
            status,
            updated_at
          )
        `)
        .eq('is_active', true)
        .order('code')
        .abortSignal(controller.signal);

      clearTimeout(timeoutId);

      if (error) {
        throw error;
      } else {
        const formatted: AreaWithCount[] = (data || []).map((area: any) => {
          const activeYarns = (area.yarn_rolls || []).filter(
            (y: any) => y.status === 'in_stock'
          );
          return {
            ...area,
            yarns: activeYarns,
            yarn_count: activeYarns.length,
          };
        });
        setAreas(formatted);
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      // If it's an AbortError (timeout) and we haven't retried yet, retry once
      if (err.name === 'AbortError' && retryCount < 1) {
        console.warn('fetchBoard timed out, retrying...');
        return fetchBoard(retryCount + 1, true);
      }
      setError(err.message);
    } finally {
      if (inFlightRef.current === controller) {
        inFlightRef.current = null;
      }
      if (retryCount === 0) setLoading(false);
    }
  }

  useEffect(() => {
    fetchBoard();

    // Coalesce / Debounce multiple rapid realtime notifications (e.g. bulk operations)
    let debounceTimer: any = null;
    const debouncedFetchBoard = () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = setTimeout(() => {
        // Only fetch if tab is visible on Web, or if it is standard React Native environment
        if (Platform.OS === 'web' && typeof document !== 'undefined' && document.visibilityState === 'hidden') {
          return;
        }
        fetchBoard();
      }, 3000); // 3-second debounce cooldown
    };

    const channelId = `board-realtime-${Date.now()}-${Math.random()}`;
    const subscription = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'yarn_rolls' },
        () => {
          debouncedFetchBoard();
        }
      )
      .subscribe();

    // Visibility listener for Web CPU saving
    const handleVisibilityChange = () => {
      if (Platform.OS === 'web' && typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchBoard();
      }
    };

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    // AppState listener: refetch when returning from background (Native platforms only to save CPU/battery)
    let subscriptionAppState: any = null;
    if (Platform.OS !== 'web') {
      subscriptionAppState = AppState.addEventListener('change', (nextAppState) => {
        if (nextAppState === 'active') {
          fetchBoard();
        }
      });
    }

    return () => {
      inFlightRef.current?.abort();
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(subscription);
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
      if (subscriptionAppState) {
        subscriptionAppState.remove();
      }
    };
  }, []);

  return { areas, loading, error, refetch: () => fetchBoard(0, true) };
}
