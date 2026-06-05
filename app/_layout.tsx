import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { View, ActivityIndicator } from 'react-native';

/**
 * Root layout — handles auth routing.
 * If user is logged in → show the main app (tabs).
 * If user is not logged in → redirect to login screen.
 */
export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Check if there's an existing session on app start
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for login / logout events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(tabs)' || segments[0] === 'area' || segments[0] === 'yarn' || segments[0] === 'move';
    const isLoginScreen = segments[0] === 'login';

    if (!session && !isLoginScreen) {
      // Redirect to the login screen
      router.replace('/login');
    } else if (session && (isLoginScreen || !segments[0])) {
      // Redirect to the home screen
      router.replace('/(tabs)');
    }
  }, [session, segments, loading]);

  // Show a spinner while checking the session
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' }}>
        <ActivityIndicator size="large" color="#0369a1" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#e2e8f0', alignItems: 'center' }}>
      <View style={{ 
        flex: 1, 
        width: '100%', 
        maxWidth: 500, 
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 5,
        overflow: 'hidden'
      }}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="area/[id]" options={{ title: 'Area Detail' }} />
          <Stack.Screen name="yarn/[id]" options={{ title: 'LOT History', headerStyle: { backgroundColor: '#1b4d3e' }, headerTintColor: '#fff', headerTitleStyle: { fontWeight: '700' } }} />
          <Stack.Screen name="move/[id]" options={{ title: 'Move LOT', headerStyle: { backgroundColor: '#1b4d3e' }, headerTintColor: '#fff', headerTitleStyle: { fontWeight: '700' } }} />
        </Stack>
      </View>
    </View>
  );
}

