import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

// 1. Tạo bộ nhớ ảo tạm thời (In-Memory) dành riêng cho Admin Client.
// Bộ nhớ này chỉ lưu trong RAM, ngăn không cho Admin Client truy cập vào LocalStorage/AsyncStorage vật lý.
const dummyStorage = {
  getItem: (key: string) => null,
  setItem: (key: string, value: string) => {},
  removeItem: (key: string) => {},
};

const globalForSupabase = globalThis as any;

// 2. Khởi tạo Client chính (Singleton)
if (!globalForSupabase.supabase) {
  globalForSupabase.supabase = createClient(
    isSupabaseConfigured ? SUPABASE_URL : 'https://missing-config.supabase.co',
    isSupabaseConfigured ? SUPABASE_ANON_KEY : 'missing-config',
    {
      auth: {
        ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
        storageKey: 'yarn-tracker-auth-v2', // Bypass any corrupted navigator.locks
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    }
  );
}
export const supabase = globalForSupabase.supabase;

// 3. Khởi tạo Admin Client (Singleton + sử dụng Dummy Storage ảo)
// Việc dùng dummyStorage giúp ngăn chặn hoàn toàn cảnh báo "Multiple GoTrueClient" và lỗi treo đơ Web/App.
if (!globalForSupabase.adminAuthClient) {
  globalForSupabase.adminAuthClient = createClient(
    isSupabaseConfigured ? SUPABASE_URL : 'https://missing-config.supabase.co',
    isSupabaseConfigured ? SUPABASE_ANON_KEY : 'missing-config',
    {
      auth: {
        storage: dummyStorage, // Bắt buộc cách ly bộ nhớ để không tranh chấp dữ liệu với Client chính
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );
}
export const adminAuthClient = globalForSupabase.adminAuthClient;