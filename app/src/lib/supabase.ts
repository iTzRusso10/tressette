import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** Accounts, friends and online need the Supabase project URL and public (anon) key, in app/.env. */
export const supabaseConfigured = !!URL && !!KEY;

let client: SupabaseClient | null = null;

/** The one Supabase client of the app: the session is kept on the device and refreshed by itself. */
export function supabase(): SupabaseClient {
  if (!client)
    client = createClient(URL, KEY, {
      auth: {
        storage: AsyncStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: Platform.OS === 'web',
        flowType: 'pkce',
      },
    });
  return client;
}
