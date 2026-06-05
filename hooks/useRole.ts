import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type UserRole = 'worker' | 'supervisor';

export function useRole() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function fetchRole(userId: string) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single();

        if (!error && data && active) {
          setRole(data.role as UserRole);
        } else if (active) {
          // Fallback to user metadata if profile not populated yet
          const { data: { session } } = await supabase.auth.getSession();
          const metaRole = session?.user?.user_metadata?.role || 'worker';
          setRole(metaRole as UserRole);
        }
      } catch (err) {
        if (active) setRole('worker');
      } finally {
        if (active) setLoading(false);
      }
    }

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchRole(session.user.id);
      } else {
        if (active) {
          setRole(null);
          setLoading(false);
        }
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        if (active) setLoading(true);
        await fetchRole(session.user.id);
      } else {
        if (active) {
          setRole(null);
          setLoading(false);
        }
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return { role, loading };
}
