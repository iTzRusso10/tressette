// L'unico posto dove cambiano monete, esperienza, trofei, oggetti, achievement, missioni e stagione di
// chi ha fatto l'accesso. Applica le stesse regole del telefono (src/meta/ledger.ts), così niente si
// può inventare sul telefono.
//
// Protezioni: una partita conta una volta sola (id), non prima di qualche secondo dalla precedente
// contro il computer, i dati delle mani sono riportati nei limiti (cleanHand), le partite abbandonate
// non arrivano mai. Due richieste insieme non si sovrascrivono: si scrive solo se la riga non è
// cambiata nel frattempo (updated_at), altrimenti si rilegge e si riapplica.
//
// Deploy: supabase functions deploy progress (dopo ogni modifica a src/meta).
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { ARENAS, reachedArena } from '../../../src/meta/arenas.ts';
import { itemByKey, STARTER_KEYS, type Slot } from '../../../src/meta/catalog.ts';
import {
  addGrants,
  applyHand,
  applyMatch,
  buyItem,
  claimDaily,
  claimReward,
  equipItem,
  normalize,
  publicOf,
  refill,
  selectAvatar,
  selectShowcase,
  selectTitle,
  swapMission,
  touch,
  type Claim,
  type Meta,
  type Progress,
} from '../../../src/meta/ledger.ts';
import { levelInfo } from '../../../src/meta/levels.ts';
import { cleanHand, normalizeStats, type MatchRecord } from '../../../src/meta/progress.ts';
import { legendOf, reqMet } from '../../../src/meta/reqs.ts';
import { ACHIEVEMENTS } from '../../../src/meta/achievements.ts';
import { completedSets } from '../../../src/meta/sets.ts';
import { buyable } from '../../../src/meta/shop.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

interface Row {
  id: string;
  coins: number;
  xp: number;
  stats: unknown;
  trophies: Record<string, number> | null;
  bonus: Progress['bonus'] | null;
  friend_code: string;
  imported: boolean;
  cups: number;
  best_cups: number;
  owned: unknown;
  equipped: unknown;
  meta: Partial<Meta> | null;
  updated_at: string;
}

const COLUMNS = 'id, coins, xp, stats, trophies, bonus, friend_code, imported, cups, best_cups, owned, equipped, meta, updated_at';
const SLOTS: Slot[] = ['table', 'felt', 'back', 'frame'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HOUR = 3600 * 1000;

/** Il giorno di Roma adesso, AAAA-MM-GG. */
const romeDay = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date());

/** Il giorno del telefono, accettato solo se entro 36 ore da adesso; altrimenti quello di Roma. */
function deviceDay(v: unknown): string {
  const day = String(v ?? '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return romeDay();
  const t = new Date(`${day}T12:00:00Z`).getTime();
  return Number.isFinite(t) && Math.abs(t - Date.now()) <= 36 * HOUR ? day : romeDay();
}

function fromRow(r: Row): Progress {
  // Una riga di prima della migrazione: niente `meta`, vecchi id degli oggetti; normalize li converte.
  const hasMeta = r.meta && Object.keys(r.meta).length > 0;
  return normalize(
    {
      coins: r.coins,
      xp: r.xp,
      stats: r.stats as Progress['stats'],
      achievements: r.trophies ?? {},
      cups: r.cups,
      bestCups: r.best_cups,
      owned: Array.isArray(r.owned) ? (r.owned as string[]) : [],
      equipped: (r.equipped ?? {}) as Progress['equipped'],
      bonus: r.bonus ?? { lastDay: null, streak: 0 },
      ...(hasMeta ? { meta: r.meta as Meta } : {}),
    },
    crypto.randomUUID().slice(0, 12),
  );
}

const toRow = (p: Progress) => ({
  public: publicOf(p),
  coins: p.coins,
  xp: p.xp,
  stats: p.stats,
  trophies: p.achievements,
  bonus: p.bonus,
  cups: p.cups,
  best_cups: p.bestCups,
  owned: p.owned,
  equipped: p.equipped,
  meta: p.meta,
});

/** Limiti a ciò che un telefono può portare al primo accesso (quello che si gioca senza account non è verificabile). */
const IMPORT_MAX = { coins: 20000, xp: 50000, cups: 1000, stat: 2000 };

/**
 * Il primo accesso: i progressi fatti sul telefono, nei limiti. Le ricompense già prese sul telefono
 * (livelli, arene, achievement) si segnano come pagate, così non si pagano due volte.
 */
function importDevice(server: Progress, raw: unknown): Progress {
  const dev = normalize((raw ?? {}) as never, server.meta.seed);
  const stats = normalizeStats(Object.fromEntries(Object.entries(dev.stats).map(([k, v]) => [k, typeof v === 'number' ? Math.min(IMPORT_MAX.stat, v) : v])));
  stats.byGame = Object.fromEntries(
    Object.entries(dev.stats.byGame).map(([g, s]) => [g, { played: Math.min(IMPORT_MAX.stat, s.played), won: Math.min(IMPORT_MAX.stat, s.won), expert: Math.min(IMPORT_MAX.stat, s.expert) }]),
  ) as Progress['stats']['byGame'];
  const p: Progress = {
    ...server,
    coins: Math.max(server.coins, Math.min(IMPORT_MAX.coins, dev.coins)),
    xp: Math.max(server.xp, Math.min(IMPORT_MAX.xp, dev.xp)),
    stats,
    cups: Math.max(server.cups, Math.min(IMPORT_MAX.cups, dev.cups)),
    bestCups: Math.max(server.bestCups, Math.min(IMPORT_MAX.cups, dev.bestCups)),
    bonus: dev.bonus.lastDay ? dev.bonus : server.bonus,
    meta: { ...server.meta, title: dev.meta.title, avatar: dev.meta.avatar, missions: dev.meta.missions, lastEquip: dev.meta.lastEquip },
  };
  p.bestCups = Math.max(p.bestCups, p.cups);
  // Achievement: solo quelli che le statistiche portate confermano.
  p.achievements = Object.fromEntries(Object.entries({ ...dev.achievements, ...server.achievements }).filter(([id]) => ACHIEVEMENTS.some(a => a.id === id && reqMet(a.req, p))));
  // Oggetti: quelli che si comprano, più quelli già vinti con ricompense confermate (arene, achievement: li riassegna settle).
  p.owned = [...new Set([...STARTER_KEYS, ...server.owned, ...dev.owned.filter(k => itemByKey(k) && buyable(itemByKey(k)!))])];
  p.meta.arena = reachedArena(p);
  const li = levelInfo(p.xp);
  p.meta.paid = { level: li.level, prestige: li.prestige, legend: legendOf(p.bestCups), arena: p.meta.arena };
  p.meta.sets = completedSets(p.owned).map(s => s.id);
  // Gli oggetti delle arene e degli achievement già raggiunti si danno senza ripagare le monete.
  for (const a of ARENAS.slice(0, p.meta.arena + 1)) for (const k of a.reward.items ?? []) if (!p.owned.includes(k)) p.owned.push(k);
  for (const a of ACHIEVEMENTS) if (p.achievements[a.id]) for (const k of a.items ?? []) if (!p.owned.includes(k)) p.owned.push(k);
  for (const s of SLOTS) {
    const id = dev.equipped[s];
    const e = equipItem(p, s, id);
    if (e) p.equipped = e.equipped;
  }
  return p;
}

/** Le posizioni finali delle stagioni chiuse entrano nella storia (servono ai titoli di stagione). */
async function withSeasonRanks(admin: SupabaseClient, uid: string, p: Progress): Promise<Progress> {
  const { data } = await admin.from('season_results').select('season_id, rank, points, matches').eq('user_id', uid);
  if (!data?.length) return p;
  const history = [...p.meta.seasonHistory];
  for (const r of data as { season_id: string; rank: number; points: number; matches: number }[]) {
    const i = history.findIndex(h => h.id === r.season_id);
    if (i >= 0) history[i] = { ...history[i], rank: r.rank };
    else history.push({ id: r.season_id, points: r.points, matches: r.matches, rank: r.rank });
  }
  return { ...p, meta: { ...p.meta, seasonHistory: history } };
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const url = Deno.env.get('SUPABASE_URL')!;
  const user = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
  const { data: who } = await user.auth.getUser();
  if (!who?.user) return json({ error: 'Accesso richiesto' }, 401);
  const uid = who.user.id;
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const body = await req.json().catch(() => ({}));
  const day = deviceDay(body.day);

  for (let attempt = 0; attempt < 4; attempt++) {
    const { data: row, error } = await admin.from('profiles').select(COLUMNS).eq('id', uid).single<Row>();
    if (error || !row) return json({ error: 'Profilo non trovato' }, 404);
    let p = await withSeasonRanks(admin, uid, fromRow(row));
    // Premi assegnati dal server (podio della settimana, posizione di stagione) non ancora visti.
    const { data: grants } = await admin.from('reward_grants').select('id, why, coins, items').eq('user_id', uid).order('created_at', { ascending: false }).limit(50);
    const fresh = (grants ?? []).filter(g => !p.meta.grantsSeen.includes(g.id as string));
    if (fresh.length) p = addGrants(p, fresh.map(g => ({ id: g.id, why: g.why, coins: g.coins, items: g.items }) as Claim), day).p;
    let imported = row.imported;
    let refused: string | null = null;
    let delta = 0;

    switch (body.action) {
      case 'import':
        if (!imported) {
          p = importDevice(p, body.progress);
          imported = true;
        }
        p = touch(p, day).p;
        break;
      case 'hand': {
        // Al massimo BALANCE.antiAbuse.maxHandsPerMatch mani tra due partite finite (applyHand le scarta).
        p = applyHand(p, cleanHand(body.hand), day).p;
        break;
      }
      case 'match': {
        const m = body.match as Partial<MatchRecord> | undefined;
        if (!m?.game || !['tressette', 'briscola', 'scopa'].includes(m.game) || !m.id || typeof m.id !== 'string') return json({ error: 'Partita non valida' }, 400);
        const rec: MatchRecord = {
          id: m.id.slice(0, 40),
          game: m.game,
          mode: (['2', '4', 'perdere'] as const).includes(m.mode as '2') ? (m.mode as MatchRecord['mode']) : '2',
          level: (['facile', 'medio', 'difficile'] as const).includes(m.level as 'facile') ? (m.level as MatchRecord['level']) : 'facile',
          online: !!m.online,
          won: !!m.won,
          comeback: !!m.comeback,
          shutout: !!m.shutout,
          // Gli avversari online sono id di account (uuid); al massimo tre.
          opp: m.online && Array.isArray(m.opp) ? m.opp.filter(x => typeof x === 'string' && UUID.test(x) && x !== uid).slice(0, 3) : [],
        };
        const r = applyMatch(p, rec, day, Date.now(), { server: true });
        if (r.refused) refused = r.refused;
        p = r.p;
        delta = r.delta;
        break;
      }
      case 'buy': {
        const r = buyItem(p, body.slot as Slot, String(body.item ?? ''), day);
        if (r.ok) p = r.p;
        else refused = r.why;
        break;
      }
      case 'equip': {
        const e = SLOTS.includes(body.slot) ? equipItem(p, body.slot as Slot, String(body.item ?? '')) : null;
        if (e) p = e;
        else refused = 'equip';
        break;
      }
      case 'title': {
        const t = selectTitle(p, String(body.title ?? ''));
        if (t) p = t;
        else refused = 'title';
        break;
      }
      case 'bonus': {
        const r = claimDaily(p, day, !!body.doubled);
        if (r) p = r.p;
        break;
      }
      case 'refill': {
        const r = refill(p);
        if (r) p = r;
        break;
      }
      case 'claim': {
        const r = claimReward(p, String(body.id ?? ''), day);
        if (!r.claimed.length) refused = 'claim';
        p = r.p;
        break;
      }
      case 'swap': {
        const q = swapMission(touch(p, day).p, String(body.key ?? ''), day);
        if (q) p = q;
        else refused = 'swap';
        break;
      }
      case 'avatar': {
        const q = selectAvatar(p, String(body.avatar ?? ''));
        if (q) p = q;
        else refused = 'avatar';
        break;
      }
      case 'showcase': {
        const q = Array.isArray(body.showcase) ? selectShowcase(p, body.showcase.filter((x: unknown) => typeof x === 'string')) : null;
        if (q) p = q;
        else refused = 'showcase';
        break;
      }
      case 'get':
        p = touch(p, day).p;
        break;
      default:
        return json({ error: 'Azione sconosciuta' }, 400);
    }

    // Scrive solo se nessuno ha cambiato la riga nel frattempo.
    const { data: saved, error: e2 } = await admin
      .from('profiles')
      .update({ ...toRow(p), imported, updated_at: new Date().toISOString() })
      .eq('id', uid)
      .eq('updated_at', row.updated_at)
      .select('coins, xp, stats, trophies, bonus, friend_code, cups, best_cups, owned, equipped, meta')
      .maybeSingle();
    if (e2) return json({ error: e2.message }, 500);
    if (!saved) continue; // cambiata da un'altra richiesta: si riprova da capo

    // Punti della stagione in corso, e dopo una partita i punteggi per gioco e la settimana, per le classifiche.
    const s = p.meta.season;
    const now = new Date().toISOString();
    if (s.id && s.matches > 0) {
      await admin.from('season_scores').upsert({ season_id: s.id, user_id: uid, points: s.points, matches: s.matches, updated_at: now });
    }
    if (body.action === 'match' && !refused) {
      const game = (body.match as MatchRecord).game;
      const g = p.meta.ratings[game];
      const w = p.meta.weekly[game];
      await admin.from('game_ratings').upsert({ user_id: uid, game, season_id: p.meta.ratingSeason ?? 'preseason', rating: g.r, games: g.n, peak: g.peak, updated_at: now });
      if (w.n > 0) {
        const perf = Math.round(w.opp / w.n + (400 * (w.w - w.l)) / w.n);
        await admin.from('weekly_scores').upsert({ user_id: uid, game, week: w.week, perf, games: w.n, wins: w.w, updated_at: now });
      }
    }
    return json({ profile: saved, level: levelInfo(p.xp), delta, ...(refused ? { refused } : {}) });
  }
  return json({ error: 'Troppe richieste insieme, riprova' }, 409);
});

