import { useState, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type HistoryItem = {
  id: string;
  yarn_roll_id: string | null;
  action: string | null;
  yarn_code: string | null;
  from_area_code: string | null;
  to_area_code: string | null;
  moved_at: string;
  note: string | null;
  moved_by: string | null;
  color?: string; 
  description?: string;
};

const PAGE_SIZE = 50;

// In-memory cache to prevent spinner flash on tab remounts
let globalHistoryCache: HistoryItem[] = [];

export function useHistory(fromDate: string, toDate: string) {
  const [logs, setLogs] = useState<HistoryItem[]>(globalHistoryCache);
  const [loading, setLoading] = useState(globalHistoryCache.length === 0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track current page offset to support load-more
  const offsetRef = useRef(0);

  // AbortController for the in-flight request
  const inFlightRef = useRef<AbortController | null>(null);

  const fetchHistory = useCallback(async (isSilent = false, retryCount = 0) => {
    // Cancel any previous in-flight request
    if (inFlightRef.current) {
      inFlightRef.current.abort();
      inFlightRef.current = null;
    }

    // Reset pagination when doing a fresh fetch
    offsetRef.current = 0;

    if (!isSilent) setLoading(true);

    // Stale-While-Revalidate: show cache immediately on first load (no date filters)
    if (logs.length === 0 && !fromDate && !toDate) {
      try {
        const cached = await AsyncStorage.getItem('cached_history');
        if (cached) {
          setLogs(JSON.parse(cached));
          if (!isSilent) setLoading(false);
        }
      } catch (e) {
        console.warn('Failed to read history cache', e);
      }
    }

    const controller = new AbortController();
    inFlightRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    let query = supabase
      .from('move_logs')
      .select(`
        id,
        yarn_roll_id,
        action,
        yarn_code,
        from_area_code,
        to_area_code,
        moved_at,
        note,
        moved_by
      `)
      .order('moved_at', { ascending: false })
      .range(0, PAGE_SIZE - 1)
      .abortSignal(controller.signal);

    if (fromDate && fromDate.length === 10) {
      query = query.gte('moved_at', fromDate + 'T00:00:00.000Z');
    }
    if (toDate && toDate.length === 10) {
      query = query.lte('moved_at', toDate + 'T23:59:59.999Z');
    }

    try {
      const { data, error } = await query;
      clearTimeout(timeoutId);
      if (inFlightRef.current !== controller) return; // stale response

      if (!error && data) {
        if (!fromDate && !toDate) {
          globalHistoryCache = data as unknown as HistoryItem[];
        }
        setLogs(data as unknown as HistoryItem[]);
        setHasMore(data.length === PAGE_SIZE);
        offsetRef.current = data.length;
        setError(null);

        // Only cache the default unbounded query
        if (!fromDate && !toDate) {
          AsyncStorage.setItem('cached_history', JSON.stringify(data)).catch(err =>
            console.warn('Failed to write history cache', err)
          );
        }
      } else if (error) {
        throw error;
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (inFlightRef.current !== controller) return;
      if (err.name === 'AbortError' && retryCount < 1) {
        console.warn('fetchHistory timed out, retrying...');
        return fetchHistory(isSilent, retryCount + 1);
      }
      console.warn('fetchHistory error:', err.message);
      setError('The network connection is unstable');
    } finally {
      if (inFlightRef.current === controller) {
        inFlightRef.current = null;
      }
      if (retryCount === 0) setLoading(false);
    }
  }, [fromDate, toDate]);

  /**
   * Load the next page of history items (infinite scroll).
   * Does nothing if already loading more or no more pages.
   */
  const fetchMoreHistory = useCallback(async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const from = offsetRef.current;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from('move_logs')
      .select(`
        id,
        yarn_roll_id,
        action,
        yarn_code,
        from_area_code,
        to_area_code,
        moved_at,
        note,
        moved_by
      `)
      .order('moved_at', { ascending: false })
      .range(from, to)
      .abortSignal(controller.signal);

    if (fromDate && fromDate.length === 10) {
      query = query.gte('moved_at', fromDate + 'T00:00:00.000Z');
    }
    if (toDate && toDate.length === 10) {
      query = query.lte('moved_at', toDate + 'T23:59:59.999Z');
    }

    try {
      const { data, error } = await query;
      clearTimeout(timeoutId);

      if (!error && data) {
        setLogs(prev => [...prev, ...(data as unknown as HistoryItem[])]);
        setHasMore(data.length === PAGE_SIZE);
        offsetRef.current = from + data.length;
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.warn('fetchMoreHistory error:', err.message);
    } finally {
      setLoadingMore(false);
    }
  }, [fromDate, toDate, loadingMore, hasMore]);

  return { logs, loading, loadingMore, hasMore, error, fetchHistory, fetchMoreHistory };
}
