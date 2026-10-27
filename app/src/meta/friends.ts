import { supabase, supabaseConfigured } from '@/lib/supabase';
import { facebookToken } from './auth';
import { useProfile } from './profile';

export interface Friend {
  id: string;
  name: string;
  avatar: string | null;
  xp: number;
  /** Where the friendship comes from. */
  via: 'facebook' | 'codice';
}

/** Asks Facebook which friends also use the app (only those who signed in with Facebook and agreed to share). */
async function facebookFriendIds(): Promise<string[]> {
  const token = await facebookToken();
  if (!token) return [];
  const ids: string[] = [];
  let url: string | null = `https://graph.facebook.com/v21.0/me/friends?limit=200&access_token=${encodeURIComponent(token)}`;
  for (let i = 0; url && i < 10; i++) {
    const r: Response = await fetch(url);
    if (!r.ok) break;
    const j: { data?: { id: string }[]; paging?: { next?: string } } = await r.json();
    (j.data ?? []).forEach(f => ids.push(f.id));
    url = j.paging?.next ?? null;
  }
  return ids;
}

export async function loadFriends(): Promise<Friend[]> {
  if (!supabaseConfigured || !useProfile.getState().account) return [];
  const sb = supabase();
  const fb = await facebookFriendIds().catch(() => []);
  if (fb.length) await sb.rpc('link_facebook_friends', { fb_ids: fb });
  const { data, error } = await sb.rpc('my_friends');
  if (error) throw error;
  return (data ?? []) as Friend[];
}

export async function addFriendByCode(code: string): Promise<'ok' | 'notfound' | 'self' | 'error'> {
  if (!supabaseConfigured) return 'error';
  const { data, error } = await supabase().rpc('add_friend', { code: code.trim().toUpperCase() });
  if (error) return 'error';
  return (data as 'ok' | 'notfound' | 'self') ?? 'error';
}
