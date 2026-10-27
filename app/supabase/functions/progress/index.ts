// The only place where coins, experience and trophies change for a signed-in player.
// Same rules as the app (src/meta), checked here so they can't be made up on the device.
//
// Deploy: supabase functions deploy progress
import { createClient } from 'npm:@supabase/supabase-js@2';
import { claimBonus, levelOf, REFILL, REFILL_BELOW, XP, type BonusState } from '../../../src/meta/economy.ts';
import { addHand, addMatch, emptyStats, matchReward, newlyUnlocked, type HandRecord, type MatchRecord, type Stats } from '../../../src/meta/progress.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

interface Row {
  id: string;
  coins: number;
  xp: number;
  stats: Partial<Stats>;
  trophies: Record<string, number>;
  bonus: BonusState;
  friend_code: string;
  imported: boolean;
}

/** Limits on what a device can bring along at its first sign-in. */
const IMPORT_MAX = { coins: 20000, xp: 50000 };

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const auth = req.headers.get('Authorization') ?? '';
  const url = Deno.env.get('SUPABASE_URL')!;
  const user = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
  const { data: who } = await user.auth.getUser();
  if (!who?.user) return json({ error: 'Accesso richiesto' }, 401);
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const { data: row, error } = await admin
    .from('profiles')
    .select('id, coins, xp, stats, trophies, bonus, friend_code, imported')
    .eq('id', who.user.id)
    .single<Row>();
  if (error || !row) return json({ error: 'Profilo non trovato' }, 404);

  const body = await req.json().catch(() => ({}));
  let stats: Stats = { ...emptyStats(), ...(row.stats ?? {}) };
  let coins = row.coins;
  let xp = row.xp;
  let bonus = row.bonus ?? { lastDay: null, streak: 0 };
  let imported = row.imported;
  const trophies = { ...(row.trophies ?? {}) };

  switch (body.action) {
    case 'import': {
      // The first time: bring along what was played on this device before signing in.
      if (!imported) {
        const s = body.stats as Partial<Stats> | undefined;
        if (s && typeof s.played === 'number') stats = { ...emptyStats(), ...s };
        coins = Math.max(coins, Math.min(IMPORT_MAX.coins, Number(body.coins) || 0));
        xp = Math.min(IMPORT_MAX.xp, Math.max(xp, Number(body.xp) || 0));
        Object.assign(trophies, body.trophies ?? {});
        if (body.bonus?.lastDay) bonus = body.bonus;
        imported = true;
      }
      break;
    }
    case 'hand': {
      const h = body.hand as HandRecord;
      const scope = Math.max(0, Math.min(20, Number(h?.scope) || 0));
      stats = addHand(stats, { scope, settebello: !!h?.settebello, napoletana: !!h?.napoletana, cappotto: !!h?.cappotto });
      xp += XP.hand + scope * XP.scopa;
      break;
    }
    case 'match': {
      const m = body.match as MatchRecord;
      if (!m?.game) return json({ error: 'Partita non valida' }, 400);
      stats = addMatch(stats, m);
      const r = matchReward(m);
      coins += r.coins;
      xp += r.xp;
      break;
    }
    case 'bonus': {
      // The day is the device's local day: one claim per calendar day, at most one day ahead of UTC.
      const day = String(body.day ?? '');
      const now = /^\d{4}-\d{2}-\d{2}$/.test(day) ? new Date(`${day}T12:00:00`) : new Date();
      if (Math.abs(now.getTime() - Date.now()) > 36 * 3600 * 1000) return json({ error: 'Data non valida' }, 400);
      try {
        const r = claimBonus(bonus, now);
        bonus = r.state;
        coins += body.doubled ? r.amount * 2 : r.amount;
        stats = { ...stats, bonusStreak: Math.max(stats.bonusStreak, r.state.streak) };
      } catch {
        // Already claimed today: nothing changes.
      }
      break;
    }
    case 'refill': {
      if (coins < REFILL_BELOW) coins += REFILL;
      break;
    }
    case 'get':
      break;
    default:
      return json({ error: 'Azione sconosciuta' }, 400);
  }

  for (const t of newlyUnlocked(stats, trophies)) {
    trophies[t.id] = Date.now();
    coins += t.coins;
    xp += t.xp;
  }

  const { data: saved, error: e2 } = await admin
    .from('profiles')
    .update({ coins, xp, stats, trophies, bonus, imported, updated_at: new Date().toISOString() })
    .eq('id', row.id)
    .select('coins, xp, stats, trophies, bonus, friend_code')
    .single();
  if (e2) return json({ error: e2.message }, 500);
  return json({ profile: saved, level: levelOf(xp) });
});
