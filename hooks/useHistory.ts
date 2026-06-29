import { useState, useCallback, useRef, useEffect } from 'react';
import { AppState, Platform } from 'react-native';
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

export function useHistory(fromDate: string, toDate: string) {
  const [logs, setLogs] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async (isSilent = false, retryCount = 0) => {
    if (!isSilent && retryCount === 0) setLoading(true);

    // Stale-While-Revalidate: Load cache first if we don't have data yet and no date filters
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
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

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
      .limit(200)
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
        setLogs(data as unknown as HistoryItem[]);
        setError(null);
        
        // Only cache the default unbounded query
        if (!fromDate && !toDate) {
          AsyncStorage.setItem('cached_history', JSON.stringify(data)).catch(err => console.warn('Failed to write history cache', err));
        }
      } else if (error) {
        throw error;
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError' && retryCount < 1) {
        console.warn('fetchHistory timed out, retrying...');
        return fetchHistory(isSilent, retryCount + 1);
      }
      console.warn('fetchHistory error:', err.message);
      setError('The network connection is unstable');
    } finally {
      if (retryCount === 0) setLoading(false);
    }
  }, [fromDate, toDate, logs.length]);

  return { logs, loading, error, fetchHistory };
}
