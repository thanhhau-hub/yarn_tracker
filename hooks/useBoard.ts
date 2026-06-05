import { useState, useEffect } from 'react';
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

  async function fetchBoard() {
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
      .order('code');

    if (error) {
      setError(error.message);
    } else {
      // Flatten the count from Supabase's nested format, filtering to only 'in_stock' yarn rolls
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
    setLoading(false);
  }

  useEffect(() => {
    fetchBoard();

    // Real-time: listen for any change in yarn_rolls table
    // When a worker moves a yarn on another device, this screen auto-updates
    const subscription = supabase
      .channel('board-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'yarn_rolls' },
        () => {
          fetchBoard(); // re-fetch on any change
        }
      )
      .subscribe();

    // Clean up the subscription when the component unmounts
    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  return { areas, loading, error, refetch: fetchBoard };
}
