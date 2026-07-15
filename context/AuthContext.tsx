import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppState, Platform, Alert } from 'react-native';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type UserRole = 'worker' | 'supervisor' | 'admin';

type AuthContextType = {
  session: Session | null | undefined;
  user: User | null;
  role: UserRole | null;
  loading: boolean;
  configError: string | null;
  isGuest: boolean;
  setGuestMode: (guest: boolean) => Promise<void>;
  refetchRole: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  role: null,
  loading: true,
  configError: null,
  isGuest: false,
  setGuestMode: async () => {},
  refetchRole: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [configError] = useState<string | null>(
    isSupabaseConfigured
      ? null
      : 'Supabase configuration is missing. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY before building the APK.'
  );

  async function fetchUserRole(userId: string, retryCount = 0) {
    try {
      // Wrap the query in a Promise.race to prevent infinite hanging during Supabase cold start
      const queryPromise = supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
        
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('ROLE_FETCH_TIMEOUT')), 5000)
      );

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;

      if (error) throw error;
      if (data) {
        setRole(data.role as UserRole);
      }
    } catch (err: any) {
      console.warn(`[fetchUserRole] Error (Retry ${retryCount}/5):`, err.message || err);
      if (retryCount < 5) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        await fetchUserRole(userId, retryCount + 1);
      } else {
        console.error('[fetchUserRole] Max retries reached. Database is unavailable or access denied.');
        // If we absolutely cannot fetch the role, we should not fallback to a fake role.
        // Alert the user and log them out to prevent inconsistent state.
        if (Platform.OS !== 'web') {
          Alert.alert('Database Error', 'Could not fetch user profile. The database might be offline.');
        } else {
          window.alert('Could not fetch user profile. The database might be offline.');
        }
        await supabase.auth.signOut().catch(() => {});
      }
    }
  }

  /**
   * Wrap supabase.auth.getSession() in a race against a timeout.
   * Supabase Free tier pauses after inactivity — the first request can take
   * 20-30s to wake the project up. Without a timeout the app hangs on a blank
   * spinner indefinitely. With this wrapper we unblock the UI after 6s and
   * let the background retry resolve the session once Supabase is awake.
   */
  function getSessionWithTimeout(ms: number) {
    return Promise.race([
      supabase.auth.getSession(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('AUTH_TIMEOUT')), ms)
      ),
    ]);
  }

  useEffect(() => {
    let active = true;

    if (!isSupabaseConfigured) {
      setLoading(false);
      return () => {
        active = false;
      };
    }

    // Initial session load — race against a 6s timeout so Supabase cold-start
    // (Free tier pause) never blocks the UI indefinitely.
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const attemptGetSession = async (attempt = 0) => {
      try {
        const { data: { session }, error } = await getSessionWithTimeout(6000) as any;
        if (!active) return;

        if (error) {
          console.warn('Session error:', error.message);
          if (error.message.includes('Refresh Token') || error.message.includes('refresh token')) {
            await supabase.auth.signOut().catch(() => {});
          }
        }

        if (session?.user) {
          await fetchUserRole(session.user.id);
        } else {
          try {
            const guestMode = await AsyncStorage.getItem('guest_mode');
            if (guestMode === 'true') {
              setIsGuest(true);
              setRole('worker');
            } else {
              setRole(null);
            }
          } catch {
            setRole(null);
          }
        }
        if (active) setLoading(false);

      } catch (err: any) {
        if (!active) return;

        if (err.message === 'AUTH_TIMEOUT') {
          // Supabase is waking up (cold start). Unblock the UI immediately so
          // the user isn't stuck on a blank screen, then retry in background.
          console.warn('[Auth] getSession timed out — Supabase cold start? Unblocking UI and retrying...');
          setSession(null);
          setRole(null);
          setLoading(false); // ← unblock the UI → redirect to /login

          // Retry with exponential backoff: 5s, 10s, 20s, 40s …
          const delay = Math.min(5000 * Math.pow(2, attempt), 40000);
          retryTimer = setTimeout(() => attemptGetSession(attempt + 1), delay);
        } else {
          console.error('Error in initial session load:', err);
          if (active) setLoading(false);
        }
      }
    };

    attemptGetSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, currentSession: Session | null) => {
      if (!active) return;
      
      if (currentSession?.user) {
        setIsGuest(false);
        // Fetch role from database silently, outside of the auth lock
        setTimeout(() => {
          fetchUserRole(currentSession.user.id);
        }, 0);
        setSession(currentSession);
      } else {
        setSession(currentSession);
        if (!isGuest) {
          setRole(null);
        }
      }
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
      if (retryTimer) clearTimeout(retryTimer);
      if (Platform.OS !== 'web') {
        supabase.auth.stopAutoRefresh();
      }
      subscription.unsubscribe();
      subscriptionAppState.remove();
    };
  }, []);

  // Listen for realtime changes to the user's profile (role and status)
  useEffect(() => {
    if (!isSupabaseConfigured || !session?.user?.id) return;

    const profileSubscription = supabase
      .channel(`public:profiles:${session.user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${session.user.id}` },
        (payload: any) => {
          if (payload.new && payload.new.role) {
            setRole(payload.new.role as UserRole);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileSubscription);
    };
  }, [session?.user?.id]);

  const setGuestMode = async (guest: boolean) => {
    setIsGuest(guest);
    if (guest) {
      await AsyncStorage.setItem('guest_mode', 'true');
      setRole('worker');
    } else {
      await AsyncStorage.removeItem('guest_mode');
      if (!session?.user) {
        setRole(null);
      }
    }
  };

  const refetchRole = async () => {
    if (session?.user) {
      await fetchUserRole(session.user.id);
    }
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, role, loading, configError, isGuest, setGuestMode, refetchRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
