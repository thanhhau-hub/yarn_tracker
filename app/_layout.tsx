import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useRef } from 'react';
import { View, ActivityIndicator, Text, Platform, LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import '../assets/fonts/fonts.css';
import * as SplashScreen from 'expo-splash-screen';

// Keep splash visible until fonts are ready
SplashScreen.preventAutoHideAsync().catch(() => {});


/**
 * RootLayoutContent - Handles auth redirects and renders the navigation stack.
 * 
 * CRITICAL: The <Stack> must ALWAYS be rendered immediately (never hidden behind
 * a loading guard or conditional return). Replacing <Stack> with a loading view
 * destroys Expo Router's internal navigation state and breaks all subsequent
 * navigations (tab switches, router.push, etc.).
 */
function RootLayoutContent() {
  const { session, loading, configError, isGuest } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Don't redirect while auth is still loading
    if (loading || configError) return;

    // On web (Vercel), segments can be [] on first render even though the
    // router is already at the root path — so we must NOT skip the redirect
    // just because segments is empty; instead treat empty segments as '/'.
    // On native we keep the original guard to avoid double-navigation.
    const isWeb = Platform.OS === 'web';
    if (!isWeb && (!segments || segments.length === 0)) return;

    const currentScreen = segments?.[0];
    const isAuthScreen = currentScreen === 'login' || currentScreen === 'register';
    const isAtRoot = !currentScreen;
    
    // Prevent redirect loops by checking if we've already done the initial root redirect
    const isInitialRootRedirect = isAtRoot && !hasRedirected.current;

    if (!session && !isGuest) {
      // Not logged in and not guest → go to login
      if (!isAuthScreen) {
        router.replace('/login');
        hasRedirected.current = true;
      }
    } else {
      // Logged in or guest → go to home (only if on auth screen, OR if it's the very first root render)
      if (isAuthScreen || isInitialRootRedirect) {
        router.replace('/(tabs)');
        hasRedirected.current = true;
      }
    }
    // All other cases: session exists (or isGuest) AND we're already on a valid screen → do nothing
  }, [session, segments, loading, configError, isGuest]);

  if (configError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f8fafc' }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#b91c1c', marginBottom: 8 }}>
          App configuration error
        </Text>
        <Text style={{ fontSize: 14, lineHeight: 20, color: '#475569' }}>{configError}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="area/[id]" options={{ title: 'Area Detail' }} />
        <Stack.Screen name="yarn/[id]" options={{ title: 'LOT History', headerStyle: { backgroundColor: '#1b4d3e' }, headerTintColor: '#fff', headerTitleStyle: { fontWeight: '700' } }} />
      </Stack>
      {loading && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', zIndex: 999 }}>
          <ActivityIndicator size="large" color="#0369a1" />
        </View>
      )}
    </View>
  );
}

/**
 * Root layout — wraps application in AuthProvider
 */

if (Platform.OS !== 'web') {
  LogBox.ignoreLogs([
    '"shadow*" style props are deprecated',
    'TouchableWithoutFeedback is deprecated',
    'props.pointerEvents is deprecated',
    'Multiple GoTrueClient',
    'Invalid Refresh Token', // Suppress GoTrueClient internal refresh token errors
    'refresh token not found'
  ]);
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(Ionicons.font);

  // Once fonts are ready, hide the native splash screen.
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  // IMPORTANT: Do NOT return null here.
  // Returning null prevents Expo Router from mounting the Stack, which means
  // the router never initialises and the app stays blank on Vercel after the
  // first load. Instead, always render the full tree and use an overlay while
  // fonts are loading so the router can boot up immediately.
  return (
    <SafeAreaProvider>
      <AuthProvider>
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
            <RootLayoutContent />
          </View>
        </View>
        {/* Font loading overlay — shown only until fonts are ready */}
        {!fontsLoaded && !fontError && (
          <View style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            justifyContent: 'center', alignItems: 'center',
            backgroundColor: '#f8fafc',
            zIndex: 9999,
          }}>
            <ActivityIndicator size="large" color="#0369a1" />
          </View>
        )}
      </AuthProvider>
    </SafeAreaProvider>
  );
}
