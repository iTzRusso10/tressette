import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { profileReady, setAccount, type Account } from './profile';
import { pullProgress } from './sync';

export type Provider = Account['provider'];

/** The Facebook token, needed to ask Facebook which friends also play. */
const FB_TOKEN = 'napoletane.fbtoken';

const redirectTo = () => makeRedirectUri({ scheme: 'napoletane', path: 'auth' });

function accountOf(session: Session | null): Account | null {
  const u = session?.user;
  if (!u) return null;
  const md = u.user_metadata ?? {};
  const provider = (u.app_metadata?.provider as Provider) ?? 'google';
  return {
    id: u.id,
    name: (md.full_name || md.name || md.given_name || (u.email ? u.email.split('@')[0] : '') || 'Giocatore').toString().slice(0, 24),
    avatar: md.avatar_url || md.picture || undefined,
    provider,
  };
}

async function onSession(session: Session | null) {
  setAccount(accountOf(session));
  if (session?.provider_token && session.user.app_metadata?.provider === 'facebook')
    await AsyncStorage.setItem(FB_TOKEN, session.provider_token).catch(() => {});
  if (session) await pullProgress().catch(() => {});
}

/**
 * Keeps the account in step with the saved session. Called once at start.
 * Waits for the profile saved on the phone: otherwise reading it back would overwrite the account
 * (and the guest set aside at sign-in) with what was saved before.
 */
export function initAuth() {
  if (!supabaseConfigured) return;
  const sb = supabase();
  profileReady().then(() => {
    sb.auth.getSession().then(({ data }) => onSession(data.session));
    sb.auth.onAuthStateChange((_e, session) => {
      onSession(session);
    });
  });
}

export const facebookToken = () => AsyncStorage.getItem(FB_TOKEN).catch(() => null);

/** Google and Facebook (and Apple off iPhone): the provider's page in the system browser, back to the app with a code. */
async function oauth(provider: Provider): Promise<boolean> {
  const sb = supabase();
  const { data, error } = await sb.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: redirectTo(),
      skipBrowserRedirect: true,
      scopes: provider === 'facebook' ? 'public_profile email user_friends' : undefined,
    },
  });
  if (error || !data?.url) throw error ?? new Error('Accesso non disponibile');
  const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo());
  if (res.type !== 'success') return false;
  const url = new URL(res.url);
  const code = url.searchParams.get('code');
  const err = url.searchParams.get('error_description') || url.searchParams.get('error');
  if (err) throw new Error(err);
  if (!code) return false;
  const { error: e2 } = await sb.auth.exchangeCodeForSession(code);
  if (e2) throw e2;
  return true;
}

/** On iPhone, the native Sign in with Apple sheet. */
async function apple(): Promise<boolean> {
  const cred = await AppleAuthentication.signInAsync({
    requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
  });
  if (!cred.identityToken) return false;
  const sb = supabase();
  const { error } = await sb.auth.signInWithIdToken({ provider: 'apple', token: cred.identityToken });
  if (error) throw error;
  // Apple gives the name only the first time: keep it.
  const name = [cred.fullName?.givenName, cred.fullName?.familyName].filter(Boolean).join(' ');
  if (name) await sb.auth.updateUser({ data: { full_name: name } });
  return true;
}

export type SignInResult = 'ok' | 'cancelled' | 'unavailable' | { error: string };

export async function signIn(provider: Provider): Promise<SignInResult> {
  if (!supabaseConfigured) return 'unavailable';
  try {
    const ok = provider === 'apple' && Platform.OS === 'ios' ? await apple() : await oauth(provider);
    return ok ? 'ok' : 'cancelled';
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code === 'ERR_REQUEST_CANCELED') return 'cancelled';
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function signOut() {
  if (!supabaseConfigured) return;
  await AsyncStorage.removeItem(FB_TOKEN).catch(() => {});
  await supabase().auth.signOut();
  setAccount(null);
}

export const appleAvailable = () => (Platform.OS === 'ios' ? AppleAuthentication.isAvailableAsync() : Promise.resolve(Platform.OS === 'web'));
