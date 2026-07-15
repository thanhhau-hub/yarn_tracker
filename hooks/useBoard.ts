import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { AreaWithCount } from '../types';
import { Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNetwork } from './useNetwork';

/**
 * Fetches all active areas with a live count of yarn rolls (LOTs) inside each one.
 * This powers the Board View (home screen).
 * Real-time: re-fetches whenever any yarn_roll is updated.
 *
 * IMPORTANT: Pass the current session so this hook waits until auth is ready
 * before fetching. This prevents the "no data on first load" bug.
 */
// In-memory cache to prevent spinner flash on tab remounts
let globalAreasCache: AreaWithCount[] = [];

export function useBoard(session: Session | null | undefined) {
  const [areas, setAreas] = useState<AreaWithCount[]>(globalAreasCache);
  const [loading, setLoading] = useState(globalAreasCache.length === 0);
  const [error, setError] = useState<string | null>(null);

  // Track the currently running AbortController
  const inFlightRef = useRef<AbortController | null>(null);

  // Debounce timer: coalesces rapid-fire calls (e.g. useFocusEffect + useEffect firing together)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sessionRef = useRef(session);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const userId = session?.user?.id;
  // sessionStatus: track trạng thái auth rõ ràng hơn userId (undefined→null không trigger lại)
  const sessionStatus = session === undefined ? 'loading' : session === null ? 'guest' : `user:${userId}`;

  /**
   * Core fetch function.
   * - Always aborts the previous in-flight request before starting a new one.
   * - Callers should go through `scheduleFetch` to benefit from debouncing.
   */
  const fetchBoard = useCallback(async (retryCount = 0) => {
    const currentSession = sessionRef.current;
    // session === undefined means auth is still loading — wait
    if (currentSession === undefined) return;

    // Abort any previous in-flight request first
    if (inFlightRef.current) {
      inFlightRef.current.abort();
      inFlightRef.current = null;
    }

    const controller = new AbortController();
    inFlightRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    console.log('[useBoard] Fetching board data... session user:', currentSession?.user?.email ?? 'guest');

    // Stale-While-Revalidate: Load cache first if we don't have data yet
    if (areas.length === 0) {
      try {
        const cached = await AsyncStorage.getItem('cached_board');
        if (cached) {
          setAreas(JSON.parse(cached));
          setLoading(false);
        }
      } catch (e) {
        console.warn('Failed to read board cache', e);
      }
    }

    try {
      const { data, error } = await supabase
        .from('areas')
        .select(`
          *,
          yarn_rolls (
            id,
            yarn_code,
            area_id,
            color,
            description,
            is_checked,
            is_deleted,
            updated_at
          )
        `)
        .eq('is_active', true)
        .order('code')
        .abortSignal(controller.signal);

      clearTimeout(timeoutId);

      if (error) {
        // Supabase wraps AbortError into a response error — silently ignore it
        const msg = error.message || '';
        if (msg.includes('AbortError') || msg.includes('aborted')) {
          if (inFlightRef.current === controller) inFlightRef.current = null;
          return;
        }
        throw error;
      }

      // If this controller was already aborted/replaced, discard stale results
      if (inFlightRef.current !== controller) return;

      console.log('[useBoard] Got', data?.length, 'areas');
      const formatted: AreaWithCount[] = (data || []).map((area: any) => {
        const activeYarns = (area.yarn_rolls || []).filter(
          (y: any) => y.is_deleted !== true
        );
        return {
          ...area,
          yarns: activeYarns,
          yarn_count: activeYarns.length,
        };
      });
      globalAreasCache = formatted;
      setAreas(formatted);

      // Update cache
      AsyncStorage.setItem('cached_board', JSON.stringify(formatted)).catch(err =>
        console.warn('Failed to write board cache', err)
      );

      setError(null);
    } catch (err: any) {
      clearTimeout(timeoutId);

      // AbortError = request cancelled intentionally — silently ignore
      if (
        err.name === 'AbortError' ||
        err.message?.includes('AbortError') ||
        err.message?.includes('aborted')
      ) {
        if (inFlightRef.current === controller) inFlightRef.current = null;
        return;
      }

      console.error('Board fetch error:', err);
      // Hiển thị lỗi thực tế để debug
      // @ts-ignore
      if (typeof window !== 'undefined' && window.alert) window.alert('Debug useBoard Error: ' + (err.message || JSON.stringify(err)));
      setError(err.message || 'Lỗi kết nối mạng');
    } finally {
      if (inFlightRef.current === controller) {
        inFlightRef.current = null;
      }
      setLoading(false);
    }
  }, [userId]);

  /**
   * Debounced scheduler: any number of calls within 150ms collapses into ONE fetch.
   * This prevents triple-fetching from useFocusEffect + useEffect firing simultaneously.
   */
  const scheduleFetch = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      fetchBoard(0);
    }, 150);
  }, [fetchBoard]);

  // Auto-refetch when network reconnects (offline → online)
  const { isOnline } = useNetwork();
  const prevIsOnlineRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (prevIsOnlineRef.current === false && isOnline === true) {
      console.log('[useBoard] Network reconnected — refetching...');
      scheduleFetch();
    }
    prevIsOnlineRef.current = isOnline;
  }, [isOnline, scheduleFetch]);

  useEffect(() => {
    const currentSession = sessionRef.current;

    // Safety timeout: if session stays undefined for >10s (auth hung), stop loading
    let safetyTimer: ReturnType<typeof setTimeout> | null = null;
    if (currentSession === undefined) {
      safetyTimer = setTimeout(() => {
        if (sessionRef.current === undefined) {
          console.warn('[useBoard] Auth loading timeout — forcing loading=false');
          setLoading(false);
        }
      }, 10000);
      return () => {
        if (safetyTimer) clearTimeout(safetyTimer);
      };
    }

    if (areas.length === 0) {
      setLoading(true);
    }
    scheduleFetch();

    // Realtime debounce timer (separate from scheduleFetch's debounce)
    let realtimeDebounce: ReturnType<typeof setTimeout> | null = null;
    const debouncedFetchBoard = () => {
      if (realtimeDebounce) clearTimeout(realtimeDebounce);
      realtimeDebounce = setTimeout(() => {
        if (
          Platform.OS === 'web' &&
          typeof document !== 'undefined' &&
          document.visibilityState === 'hidden'
        ) {
          return;
        }
        fetchBoard(0);
      }, 3000); // 3-second debounce for realtime events
    };

    const channelId = `board-realtime-${Date.now()}-${Math.random()}`;
    const subscription = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'yarn_rolls' },
        () => debouncedFetchBoard()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'areas' },
        () => debouncedFetchBoard()
      )
      .subscribe();

    return () => {
      // Abort any in-flight request on cleanup
      inFlightRef.current?.abort();
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (realtimeDebounce) clearTimeout(realtimeDebounce);
      if (safetyTimer) clearTimeout(safetyTimer);
      supabase.removeChannel(subscription);
    };
  }, [sessionStatus, scheduleFetch]);

  // refetch: exposed to screens — goes through scheduleFetch to prevent duplication
  const refetch = useCallback(() => scheduleFetch(), [scheduleFetch]);
  return { areas, loading, error, refetch };
}
