import { createClient, processLock } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// These values come from your .env file
// Get them from: Supabase Dashboard → Project Settings → API
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = createClient(
  isSupabaseConfigured ? SUPABASE_URL : 'https://missing-config.supabase.co',
  isSupabaseConfigured ? SUPABASE_ANON_KEY : 'missing-config',
  {
    auth: {
      // Only use AsyncStorage on native platforms (iOS/Android)
      // On Web, use Supabase's default native localStorage which is synchronous and highly reliable
      ...(Platform.OS !== 'web' ? { storage: AsyncStorage, lock: processLock } : {}),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
