import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';

export type UserRole = 'worker' | 'supervisor';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  role: UserRole | null;
  loading: boolean;
  configError: string | null;
  refetchRole: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  role: null,
  loading: true,
  configError: null,
  refetchRole: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [configError] = useState<string | null>(
    isSupabaseConfigured
      ? null
      : 'Supabase configuration is missing. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY before building the APK.'
  );

  // Helper to fetch user role from Profiles table with fallback to user metadata
  async function fetchUserRole(userId: string, userMetadataRole?: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (!error && data) {
        setRole(data.role as UserRole);
      } else {
        // Fallback to user metadata role or default worker
        setRole((userMetadataRole || 'worker') as UserRole);
      }
    } catch (err) {
      console.error('Error fetching role in context:', err);
      setRole((userMetadataRole || 'worker') as UserRole);
    }
  }

  useEffect(() => {
    let active = true;

    if (!isSupabaseConfigured) {
      setLoading(false);
      return () => {
        active = false;
      };
    }

    // Initial session load
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (!active) return;
        setSession(session);
        if (session?.user) {
          const metaRole = (session.user.user_metadata?.role || 'worker') as UserRole;
          setRole(metaRole);
          fetchUserRole(session.user.id, metaRole);
        } else {
          setRole(null);
        }
      })
      .catch((err) => {
        console.error('Error in initial session load:', err);
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (!active) return;
      setSession(currentSession);
      if (currentSession?.user) {
        const metaRole = (currentSession.user.user_metadata?.role || 'worker') as UserRole;
        setRole(metaRole);
        fetchUserRole(currentSession.user.id, metaRole);
      } else {
        setRole(null);
      }
      setLoading(false);
    });

    if (Platform.OS !== 'web' && AppState.currentState === 'active') {
      supabase.auth.startAutoRefresh();
    }

    // Keep Supabase Auth refresh active only while the app is foregrounded.
    const subscriptionAppState = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        if (Platform.OS !== 'web') {
          supabase.auth.startAutoRefresh();
        }
      } else {
        if (Platform.OS !== 'web') {
          supabase.auth.stopAutoRefresh();
        }
      }
    });

    return () => {
      active = false;
      if (Platform.OS !== 'web') {
        supabase.auth.stopAutoRefresh();
      }
      subscription.unsubscribe();
      subscriptionAppState.remove();
    };
  }, []);

  const refetchRole = async () => {
    if (session?.user) {
      const metaRole = session.user.user_metadata?.role || 'worker';
      await fetchUserRole(session.user.id, metaRole);
    }
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, role, loading, configError, refetchRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
