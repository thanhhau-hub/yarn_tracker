import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { YarnRoll } from '../types';

/**
 * Fetches all yarn rolls currently in a specific area.
 * Used on the Area Detail screen.
 */
export function useArea(areaId: string) {
  const [yarns, setYarns] = useState<YarnRoll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchYarns() {
    const { data, error } = await supabase
      .from('yarn_rolls')
      .select('id, yarn_code, area_id, status, updated_at')
      .eq('area_id', areaId)
      .eq('status', 'in_stock')
      .order('updated_at', { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setYarns(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!areaId) return;
    fetchYarns();
  }, [areaId]);

  return { yarns, loading, error, refetch: fetchYarns };
}
