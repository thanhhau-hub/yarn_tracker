import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { YarnRoll, MoveLog } from '../types';

/**
 * Fetches a single yarn roll (LOT) and its full movement history.
 * Used on the Yarn History screen.
 */
export function useYarn(yarnId: string) {
  const [yarn, setYarn] = useState<YarnRoll | null>(null);
  const [history, setHistory] = useState<MoveLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchYarn() {
    // Fetch the yarn roll with its current area joined
    const { data: yarnData, error: yarnError } = await supabase
      .from('yarn_rolls')
      .select('id, yarn_code, area_id, status, updated_at, areas(id, code, label)')
      .eq('id', yarnId)
      .single();

    if (yarnError) {
      setError(yarnError.message);
      setLoading(false);
      return;
    }
    setYarn(yarnData as unknown as YarnRoll);

    // Fetch the movement history for this yarn roll
    const { data: logData, error: logError } = await supabase
      .from('move_logs')
      .select(`
        *,
        from_area:from_area_id(id, code),
        to_area:to_area_id(id, code)
      `)
      .eq('yarn_roll_id', yarnId)
      .order('moved_at', { ascending: false });

    if (!logError) {
      setHistory(logData || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!yarnId) return;
    fetchYarn();
  }, [yarnId]);

  return { yarn, history, loading, error, refetch: fetchYarn };
}
