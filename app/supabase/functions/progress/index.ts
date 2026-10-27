// The only place where coins, experience and trophies change for a signed-in player.
// Qui cambiano anche i trofei delle arene (cups) e gli oggetti del negozio (owned, equipped).
// Same rules as the app (src/meta), checked here so they can't be made up on the device.
//
// Deploy: supabase functions deploy progress
import { createClient } from 'npm:@supabase/supabase-js@2';
import { claimBonus, levelOf, REFILL, REFILL_BELOW, XP, type BonusState } from '../../../src/meta/economy.ts';
import { addHand, addMatch, emptyStats, matchReward, newlyUnlocked, type HandRecord, type MatchRecord, type Stats } from '../../../src/meta/progress.ts';
import { applyTrophies, arenaFloor, arenaItems, arenaOf, itemsUpTo, LAST_ARENA, type TrophyMatch } from '../../../src/meta/arenas.ts';
import { buy, canEquip, DEFAULT_EQUIPPED, itemById, STARTER_ITEMS, type Slot } from '../../../src/meta/shop.ts';

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
  cups: number;
  best_cups: number;
  owned: unknown;
  equipped: unknown;
}

const SLOTS: Slot[] = ['felt', 'pattern', 'back'];
const LEVELS: TrophyMatch['level'][] = ['facile', 'medio', 'difficile'];
const DAY_MS = 3600 * 1000;

/** Il giorno del telefono (AAAA-MM-GG), accettato solo se entro 36 ore da adesso, come per il bonus. */
function deviceDay(v: unknown): string | null {
  const day = String(v ?? '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const t = new Date(`${day}T12:00:00`).getTime();
  return Number.isFinite(t) && Math.abs(t - Date.now()) <= 36 * DAY_MS ? day : null;
}

/** Oggetti posseduti ripuliti: solo id esistenti, sempre quelli di partenza e tutto ciò che si vince nelle arene raggiunte. */
function cleanOwned(v: unknown, bestCups: number): string[] {
  const list = Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && !!itemById(x)) : [];
  return [...new Set([...STARTER_ITEMS, ...itemsUpTo(arenaOf(bestCups).index), ...list])];
}

/** Oggetti in uso, ognuno controllato con canEquip; se non va bene resta quello di `fallback` (o quello di partenza). */
function cleanEquipped(v: unknown, owned: string[], fallback: Record<Slot, string>): Record<Slot, string> {
  const e = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const out = { ...fallback };
  for (const slot of SLOTS) {
    const id = e[slot];
    if (typeof id === 'string' && canEquip(id, slot, owned)) out[slot] = id;
    else if (!canEquip(out[slot], slot, owned)) out[slot] = DEFAULT_EQUIPPED[slot];
  }
  return out;
}

const toInt = (v: unknown) => Math.max(0, Math.floor(Number(v) || 0));

/** Limits on what a device can bring along at its first sign-in (trofei: al massimo 40 oltre l'ultima arena). */
const IMPORT_MAX = { coins: 20000, xp: 50000, cups: arenaFloor(LAST_ARENA) + 40 };

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
    .select('id, coins, xp, stats, trophies, bonus, friend_code, imported, cups, best_cups, owned, equipped')
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
  let cups = row.cups ?? 0;
  let bestCups = Math.max(row.best_cups ?? 0, cups);
  let owned = cleanOwned(row.owned, bestCups);
  let equipped = cleanEquipped(row.equipped, owned, DEFAULT_EQUIPPED);
  /** Perché un acquisto o un cambio di oggetto è stato rifiutato: la risposta porta comunque il profilo vero, e il telefono si riallinea. */
  let refused: string | null = null;

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
        // Trofei delle arene: mai meno di quelli che ci sono, mai oltre il limite; il massimo è almeno i trofei attuali.
        cups = Math.max(cups, Math.min(IMPORT_MAX.cups, toInt(body.cups)));
        bestCups = Math.max(bestCups, cups, Math.min(IMPORT_MAX.cups, toInt(body.bestCups)));
        // Oggetti: solo quelli che esistono e si comprano, o quelli delle arene fino a quella raggiunta.
        const won = itemsUpTo(arenaOf(bestCups).index);
        const brought = Array.isArray(body.owned)
          ? body.owned.filter((id: unknown) => typeof id === 'string' && (itemById(id)?.price != null || won.includes(id)))
          : [];
        owned = cleanOwned([...owned, ...brought], bestCups);
        equipped = cleanEquipped(body.equipped, owned, equipped);
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
      // Trofei, come sul telefono (recordMatch in profile.ts): ogni arena nuova dà le sue monete, i suoi oggetti
      // e mette subito in uso il suo panno (e il dorso, se c'è).
      const level = LEVELS.includes(m.level) ? m.level : 'facile';
      const t = applyTrophies(cups, bestCups, { won: !!m.won, level, online: !!m.online });
      cups = t.trophies;
      bestCups = t.best;
      for (const a of t.arenas) {
        coins += a.coins;
        owned = [...new Set([...owned, ...arenaItems(a)])];
        equipped = { ...equipped, felt: a.felt, ...(a.back ? { back: a.back } : {}) };
      }
      break;
    }
    case 'buy': {
      // Il giorno serve per l'offerta del giorno (offerOf): deve essere quello del telefono, non uno inventato.
      const day = deviceDay(body.day);
      if (!day) {
        refused = 'day';
        break;
      }
      const r = buy(String(body.item ?? ''), coins, owned, day);
      if (r.ok) {
        coins = r.coins;
        owned = r.owned;
      } else refused = r.why;
      break;
    }
    case 'equip': {
      const slot = body.slot as Slot;
      const id = String(body.item ?? '');
      if (SLOTS.includes(slot) && canEquip(id, slot, owned)) equipped = { ...equipped, [slot]: id };
      else refused = 'equip';
      break;
    }
    case 'bonus': {
      // The day is the device's local day: one claim per calendar day, at most one day ahead of UTC.
      const day = String(body.day ?? '');
      const now = /^\d{4}-\d{2}-\d{2}$/.test(day) ? new Date(`${day}T12:00:00`) : new Date();
      if (Math.abs(now.getTime() - Date.now()) > 36 * DAY_MS) return json({ error: 'Data non valida' }, 400);
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
    .update({ coins, xp, stats, trophies, bonus, imported, cups, best_cups: bestCups, owned, equipped, updated_at: new Date().toISOString() })
    .eq('id', row.id)
    .select('coins, xp, stats, trophies, bonus, friend_code, cups, best_cups, owned, equipped')
    .single();
  if (e2) return json({ error: e2.message }, 500);
  return json({ profile: saved, level: levelOf(xp), ...(refused ? { refused } : {}) });
});
