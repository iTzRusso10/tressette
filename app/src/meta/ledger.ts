// Il registro della progressione: lo stato completo del giocatore e tutto ciò che lo cambia (una mano,
// una partita, un acquisto, il bonus…). Funzioni pure, eseguite identiche sul telefono (subito, per lo
// schermo) e sul server (che decide davvero, per chi ha fatto l'accesso).
//
// Le quattro strade sono indipendenti ma si premiano a vicenda: trofei e arene, livello giocatore,
// achievement, stagioni. Missioni e set aggiungono ricompense. Niente si perde: i trofei non si
// azzerano, gli oggetti restano, la stagione azzera solo i suoi punti.

import { ACHIEVEMENTS, newlyUnlocked } from './achievements.ts';
import { applyTrophies, ARENAS, floorOf, legendOf, reachedArena, type Reward } from './arenas.ts';
import { BALANCE } from './balance.ts';
import { DEFAULT_EQUIPPED, ITEMS, itemByKey, itemOf, migrateCosmetics, SLOTS, STARTER_KEYS, type Slot } from './catalog.ts';
import { claimBonusOn, type BonusState } from './economy.ts';
import { levelInfo } from './levels.ts';
import { distinctProgress, missionById, missionsFor, weekOf, type MissionEvent } from './missions.ts';
import { addHand, addMatch, emptyStats, normalizeStats, type HandRecord, type MatchRecord, type Stats } from './progress.ts';
import { reqProgress, type ReqView } from './reqs.ts';
import { levelReward, legendReward, prestigeReward } from './rewards.ts';
import { seasonAt, seasonById, type SeasonMission } from './seasons.ts';
import { completedSets, SETS } from './sets.ts';
import { buyable, canEquip, priceOf } from './shop.ts';
import { DEFAULT_TITLE, hasTitle, titleById } from './titles.ts';

/* ================================================================== stato */

export interface SeasonState {
  id: string | null;
  points: number;
  matches: number;
  /** Le statistiche all'inizio della stagione: le missioni stagionali contano da qui. */
  base: Stats | null;
  streak: number;
  bestStreak: number;
  /** Traguardi di punti già pagati (indici) e missioni stagionali completate. */
  tiers: number[];
  missions: string[];
}

export interface Meta {
  /** Seme per scegliere le missioni (uguale su telefono e server). */
  seed: string;
  /** Arena raggiunta (0…29). */
  arena: number;
  /** Fin dove sono già state pagate le ricompense: livello, prestigio, leggenda, arena. */
  paid: { level: number; prestige: number; legend: number; arena: number };
  /** Il giorno dell'ultima «prima vittoria del giorno». */
  firstWin: string | null;
  missions: {
    day: string | null;
    week: string | null;
    /** Progresso per chiave «periodo:id» (es. «2026-10-28:vinci-1», «2026-W44:vinci-25»). */
    p: Record<string, number>;
    seen: Record<string, string[]>;
    done: string[];
  };
  season: SeasonState;
  seasonHistory: { id: string; points: number; matches: number; rank?: number }[];
  /** Cosmetici speciali di stagione ottenuti (chiavi). */
  seasonItems: string[];
  /** Set completati (e già premiati). */
  sets: string[];
  /** Ultimi id di partita: la stessa partita non conta due volte. */
  recent: string[];
  lastMatchAt: number;
  /** Mani contate dall'ultima partita finita (più di tante sono dati inventati). */
  handsSince: number;
  /** Tavolino, panno e dorso della partita prima (per la missione «cambia cosmetico»). */
  lastEquip: string | null;
  title: string;
}

export interface Progress {
  coins: number;
  xp: number;
  stats: Stats;
  /** Achievement completati: id → quando (ms). Sul server è la colonna `trophies` (nome storico). */
  achievements: Record<string, number>;
  /** Trofei (colonna `cups`) e il record. */
  cups: number;
  bestCups: number;
  /** Oggetti posseduti, come chiavi del catalogo («felt:verde-smeraldo»). */
  owned: string[];
  equipped: Record<Slot, string>;
  bonus: BonusState;
  meta: Meta;
}

/** Qualcosa da festeggiare sullo schermo. */
export type Gain =
  | { k: 'achievement'; id: string }
  | { k: 'level'; level: number }
  | { k: 'prestige'; n: number }
  | { k: 'arena'; index: number }
  | { k: 'chapter'; n: number }
  | { k: 'legend'; n: number }
  | { k: 'coins'; amount: number; why: string }
  | { k: 'item'; key: string }
  | { k: 'set'; id: string }
  | { k: 'mission'; key: string; text: string }
  | { k: 'seasonTier'; season: string; index: number };

export const emptySeason = (): SeasonState => ({ id: null, points: 0, matches: 0, base: null, streak: 0, bestStreak: 0, tiers: [], missions: [] });

export function emptyMeta(seed: string): Meta {
  return {
    seed,
    arena: 0,
    paid: { level: 1, prestige: 0, legend: 0, arena: 0 },
    firstWin: null,
    missions: { day: null, week: null, p: {}, seen: {}, done: [] },
    season: emptySeason(),
    seasonHistory: [],
    seasonItems: [],
    sets: [],
    recent: [],
    lastMatchAt: 0,
    handsSince: 0,
    lastEquip: null,
    title: DEFAULT_TITLE,
  };
}

export function newProgress(seed: string): Progress {
  return {
    coins: BALANCE.coins.start,
    xp: 0,
    stats: emptyStats(),
    achievements: {},
    cups: 0,
    bestCups: 0,
    owned: [...STARTER_KEYS],
    equipped: { ...DEFAULT_EQUIPPED },
    bonus: { lastDay: null, streak: 0 },
    meta: emptyMeta(seed),
  };
}

export const viewOf = (p: Progress): ReqView => p;

const int = (v: unknown) => Math.max(0, Math.floor(Number(v) || 0));
const strArr = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

/**
 * Ripulisce uno stato che arriva da fuori (salvato da una versione vecchia, mandato dal telefono al
 * server). Converte gli oggetti del vecchio negozio e le vecchie medaglie, e scarta ciò che non esiste.
 */
export function normalize(raw: Partial<Progress> & { trophies?: Record<string, number>; meta?: Partial<Meta> } & Record<string, unknown>, seed: string): Progress {
  const base = newProgress(seed);
  const m = (raw.meta ?? {}) as Partial<Meta>;
  const cos = migrateCosmetics(strArr(raw.owned), (raw.equipped ?? {}) as Record<string, string>);
  const ach: Record<string, number> = {};
  for (const [id, t] of Object.entries(raw.achievements ?? raw.trophies ?? {})) if (ACHIEVEMENTS.some(a => a.id === id)) ach[id] = int(t) || 1;
  const season = { ...emptySeason(), ...(m.season ?? {}) } as SeasonState;
  const out: Progress = {
    coins: raw.coins === undefined ? base.coins : int(raw.coins),
    xp: int(raw.xp),
    stats: normalizeStats(raw.stats),
    achievements: ach,
    cups: int(raw.cups),
    bestCups: Math.max(int(raw.bestCups), int(raw.cups)),
    owned: cos.owned,
    equipped: cos.equipped,
    bonus: raw.bonus && typeof raw.bonus === 'object' ? { lastDay: (raw.bonus as BonusState).lastDay ?? null, streak: int((raw.bonus as BonusState).streak) } : base.bonus,
    meta: {
      ...base.meta,
      seed: typeof m.seed === 'string' && m.seed ? m.seed : seed,
      arena: Math.min(ARENAS.length - 1, int(m.arena)),
      paid: { ...base.meta.paid, ...(m.paid ?? {}) },
      firstWin: typeof m.firstWin === 'string' ? m.firstWin : null,
      missions: { ...base.meta.missions, ...(m.missions ?? {}) },
      season: { ...season, base: season.base ? normalizeStats(season.base) : null },
      seasonHistory: Array.isArray(m.seasonHistory) ? m.seasonHistory : [],
      seasonItems: strArr(m.seasonItems),
      sets: strArr(m.sets).filter(id => SETS.some(s => s.id === id)),
      recent: strArr(m.recent).slice(-BALANCE.antiAbuse.recentMatches),
      lastMatchAt: int(m.lastMatchAt),
      handsSince: int(m.handsSince),
      lastEquip: typeof m.lastEquip === 'string' ? m.lastEquip : null,
      title: typeof m.title === 'string' && titleById(m.title) ? m.title : DEFAULT_TITLE,
    },
  };
  // Un profilo di prima di questo registro: le arene sono già sue, le ricompense dei livelli già pagate.
  if (!raw.meta) {
    out.meta.arena = reachedArena(out);
    const li = levelInfo(out.xp);
    out.meta.paid = { level: li.level, prestige: li.prestige, legend: legendOf(out.bestCups), arena: out.meta.arena };
    out.cups = Math.max(out.cups, floorOf(out.meta.arena));
  }
  return out;
}

/* ================================================================== ricompense */

type Tx = { p: Progress; gains: Gain[]; newItems: number };

const clone = (p: Progress): Progress => JSON.parse(JSON.stringify(p));

function credit(tx: Tx, r: Reward & { xp?: number }, why: string) {
  if (r.coins) {
    tx.p.coins += r.coins;
    tx.p.stats.coinsEarned += r.coins;
    tx.gains.push({ k: 'coins', amount: r.coins, why });
  }
  if (r.xp) tx.p.xp += r.xp;
  for (const key of r.items ?? []) grant(tx, key);
}

function grant(tx: Tx, key: string) {
  if (!itemByKey(key) || tx.p.owned.includes(key)) return;
  tx.p.owned.push(key);
  tx.newItems++;
  tx.gains.push({ k: 'item', key });
}

/* ================================================================== missioni e stagioni */

/** Porta missioni e stagione al giorno `day`: nuovi periodi, chiusura della stagione finita. */
function roll(tx: Tx, day: string) {
  const m = tx.p.meta.missions;
  const week = weekOf(day);
  if (m.day !== day || m.week !== week) {
    // Si tengono solo le chiavi del giorno e della settimana correnti.
    const keep = (k: string) => k.startsWith(`${day}:`) || k.startsWith(`${week}:`);
    m.p = Object.fromEntries(Object.entries(m.p).filter(([k]) => keep(k)));
    m.seen = Object.fromEntries(Object.entries(m.seen).filter(([k]) => keep(k)));
    m.done = m.done.filter(keep);
    m.day = day;
    m.week = week;
  }
  const now = seasonAt(day);
  const s = tx.p.meta.season;
  if ((now?.season.id ?? null) !== s.id) {
    if (s.id && s.matches > 0) tx.p.meta.seasonHistory.push({ id: s.id, points: s.points, matches: s.matches });
    tx.p.meta.season = { ...emptySeason(), id: now?.season.id ?? null, base: now ? JSON.parse(JSON.stringify(tx.p.stats)) : null };
  }
}

/** Le missioni attive oggi e questa settimana, con la loro chiave. */
export function activeMissions(p: Progress, day: string) {
  const canOnline = p.stats.onlinePlayed > 0;
  const week = weekOf(day);
  return [
    ...missionsFor('daily', day, p.meta.seed, canOnline).map(def => ({ def, key: `${day}:${def.id}` })),
    ...missionsFor('weekly', week, p.meta.seed, canOnline).map(def => ({ def, key: `${week}:${def.id}` })),
  ];
}

export function missionProgress(p: Progress, key: string): number {
  return p.meta.missions.p[key] ?? 0;
}

function advanceMissions(tx: Tx, day: string, e: MissionEvent) {
  const m = tx.p.meta.missions;
  let dailyDone = 0;
  for (const { def, key } of activeMissions(tx.p, day)) {
    if (m.done.includes(key)) continue;
    if (def.distinct) {
      const v = def.distinct(e);
      if (v) m.seen[key] = [...(m.seen[key] ?? []), v];
      m.p[key] = distinctProgress(def, m.seen[key] ?? []);
    } else {
      const s = def.step(e, m.seen[key] ?? []);
      if (!s) continue;
      m.p[key] = def.max ? Math.max(m.p[key] ?? 0, s) : (m.p[key] ?? 0) + s;
    }
    if ((m.p[key] ?? 0) >= def.goal) {
      m.done.push(key);
      tx.p.stats.missionsDone++;
      if (def.period === 'weekly') tx.p.stats.weeklyDone++;
      else dailyDone++;
      tx.gains.push({ k: 'mission', key, text: def.text });
      credit(tx, { coins: def.coins, xp: def.xp }, 'Missione');
    }
  }
  for (let i = 0; i < dailyDone; i++) advanceMissions(tx, day, { dailyDone: true });
}

/** Statistiche fatte durante la stagione (adesso meno l'inizio). */
function seasonStats(p: Progress): Stats {
  const b = p.meta.season.base ?? emptyStats();
  const s = p.stats;
  const out = { ...s } as Record<string, unknown>;
  for (const k of Object.keys(s) as (keyof Stats)[]) {
    const v = s[k];
    if (typeof v === 'number') out[k] = Math.max(0, v - ((b[k] as number) ?? 0));
  }
  out.byGame = Object.fromEntries(
    (['tressette', 'briscola', 'scopa'] as const).map(g => [
      g,
      { played: s.byGame[g].played - b.byGame[g].played, won: s.byGame[g].won - b.byGame[g].won, expert: s.byGame[g].expert - b.byGame[g].expert },
    ]),
  );
  // Le serie non si sommano: conta la migliore fatta in stagione.
  out.bestStreak = p.meta.season.bestStreak;
  return out as unknown as Stats;
}

export function seasonMissionProgress(p: Progress, m: SeasonMission): [number, number] {
  return reqProgress(m.req, { ...p, stats: seasonStats(p) });
}

function settleSeason(tx: Tx) {
  const s = tx.p.meta.season;
  const season = s.id ? seasonById(s.id) : undefined;
  if (!season) return;
  season.tiers.forEach((t, i) => {
    if (s.points >= t.points && !s.tiers.includes(i)) {
      s.tiers.push(i);
      tx.gains.push({ k: 'seasonTier', season: season.id, index: i });
      credit(tx, t.reward, `Stagione: ${t.points} punti`);
      for (const k of t.reward.items ?? []) if (!tx.p.meta.seasonItems.includes(k)) tx.p.meta.seasonItems.push(k);
    }
  });
  for (const m of season.missions) {
    if (s.missions.includes(m.id)) continue;
    const [a, b] = seasonMissionProgress(tx.p, m);
    if (a >= b) {
      s.missions.push(m.id);
      tx.p.stats.missionsDone++;
      tx.gains.push({ k: 'mission', key: `${season.id}:${m.id}`, text: m.text });
      credit(tx, { coins: m.coins, xp: m.xp }, 'Missione di stagione');
    }
  }
}

/* ================================================================== assestamento */

/**
 * Dopo ogni cambiamento: achievement, livelli, prestigio, arene, leggenda, set. Si ripete finché
 * niente cambia più (un achievement può portare un oggetto che completa un set che sblocca un altro
 * achievement…).
 */
function settle(tx: Tx, day: string) {
  for (let guard = 0; guard < 20; guard++) {
    let changed = false;
    const p = tx.p;

    for (const a of newlyUnlocked(p, p.achievements)) {
      p.achievements[a.id] = Date.now();
      tx.gains.push({ k: 'achievement', id: a.id });
      credit(tx, { coins: a.coins, xp: a.xp, items: a.items }, a.name);
      changed = true;
    }

    const li = levelInfo(p.xp);
    while (p.meta.paid.level < li.level) {
      p.meta.paid.level++;
      tx.gains.push({ k: 'level', level: p.meta.paid.level });
      credit(tx, levelReward(p.meta.paid.level), `Livello ${p.meta.paid.level}`);
      changed = true;
    }
    while (p.meta.paid.prestige < li.prestige) {
      p.meta.paid.prestige++;
      tx.gains.push({ k: 'prestige', n: p.meta.paid.prestige });
      credit(tx, prestigeReward(p.meta.paid.prestige), `Prestigio ${p.meta.paid.prestige}`);
      changed = true;
    }

    const reached = reachedArena(p);
    if (reached > p.meta.arena) p.meta.arena = reached;
    while (p.meta.paid.arena < p.meta.arena) {
      const a = ARENAS[++p.meta.paid.arena];
      tx.gains.push({ k: 'arena', index: a.index });
      credit(tx, a.reward, a.name);
      if (a.chapterEnd) {
        tx.gains.push({ k: 'chapter', n: a.chapter.n });
        credit(tx, { coins: BALANCE.coins.chapter }, `Capitolo ${a.chapter.n} completato`);
      }
      changed = true;
    }
    p.cups = Math.max(p.cups, floorOf(p.meta.arena));

    const lg = legendOf(p.bestCups);
    while (p.meta.arena === ARENAS.length - 1 && p.meta.paid.legend < lg) {
      p.meta.paid.legend++;
      tx.gains.push({ k: 'legend', n: p.meta.paid.legend });
      credit(tx, legendReward(p.meta.paid.legend), `Leggenda ${p.meta.paid.legend}`);
      changed = true;
    }

    for (const s of completedSets(p.owned)) {
      if (p.meta.sets.includes(s.id)) continue;
      p.meta.sets.push(s.id);
      tx.gains.push({ k: 'set', id: s.id });
      credit(tx, { coins: s.coins }, s.name);
      changed = true;
    }

    settleSeason(tx);
    if (tx.newItems) {
      const n = tx.newItems;
      tx.newItems = 0;
      for (let i = 0; i < n; i++) advanceMissions(tx, day, { newItem: true });
      changed = true;
    }
    if (!changed) break;
  }
}

function run(p: Progress, day: string, f: (tx: Tx) => void): { p: Progress; gains: Gain[] } {
  const tx: Tx = { p: clone(p), gains: [], newItems: 0 };
  roll(tx, day);
  f(tx);
  settle(tx, day);
  return { p: tx.p, gains: tx.gains };
}

/* ================================================================== azioni */

export function applyHand(p: Progress, hand: HandRecord, day: string) {
  if (p.meta.handsSince >= BALANCE.antiAbuse.maxHandsPerMatch) return { p, gains: [] as Gain[] };
  return run(p, day, tx => {
    tx.p.meta.handsSince++;
    tx.p.stats = addHand(tx.p.stats, hand);
    tx.p.xp += BALANCE.xp.hand + hand.scope * BALANCE.xp.scopa;
  });
}

export type MatchRefusal = 'duplicate' | 'tooSoon';

export interface MatchOutcome {
  p: Progress;
  gains: Gain[];
  /** Trofei vinti o persi (0 se rifiutata). */
  delta: number;
  refused?: MatchRefusal;
}

/**
 * Una partita finita. Non conta se lo stesso id è già arrivato, e (sul server) se arriva troppo presto
 * dopo la precedente contro il computer. Le partite abbandonate non arrivano mai qui.
 */
export function applyMatch(p: Progress, r: MatchRecord, day: string, now: number, opts: { server?: boolean } = {}): MatchOutcome {
  if (r.id && p.meta.recent.includes(r.id)) return { p, gains: [], delta: 0, refused: 'duplicate' };
  if (opts.server && !r.online && now - p.meta.lastMatchAt < BALANCE.antiAbuse.minSecondsBetweenMatches * 1000)
    return { p, gains: [], delta: 0, refused: 'tooSoon' };
  let delta = 0;
  const out = run(p, day, tx => {
    const q = tx.p;
    q.stats = addMatch(q.stats, r, day);
    // Monete: la prima vittoria del giorno vale di più; una sconfitta in una partita finita qualcosa.
    if (r.won && q.meta.firstWin !== day) {
      q.meta.firstWin = day;
      credit(tx, { coins: BALANCE.coins.firstWinOfDay }, 'Prima vittoria del giorno');
    } else credit(tx, { coins: r.won ? BALANCE.coins.win : BALANCE.coins.loss }, r.won ? 'Vittoria' : 'Partita completata');
    q.xp += r.won ? BALANCE.xp.win : BALANCE.xp.loss;
    // Trofei, con il pavimento dell'arena raggiunta.
    const t = applyTrophies(q.cups, q.meta.arena, r);
    delta = t.delta;
    q.cups = t.trophies;
    q.bestCups = Math.max(q.bestCups, q.cups);
    q.stats.trophiesWon += Math.max(0, delta);
    // Stagione: i punti seguono i trofei, mai sotto zero.
    const s = q.meta.season;
    if (s.id) {
      if (s.matches === 0) q.stats.seasonsPlayed++;
      s.matches++;
      s.points = Math.max(0, s.points + delta);
      s.streak = r.won ? s.streak + 1 : 0;
      s.bestStreak = Math.max(s.bestStreak, s.streak);
    }
    const equippedKey = SLOTS.map(k => q.equipped[k]).join('|');
    advanceMissions(tx, day, { match: { ...r, trophyDelta: delta, streak: q.stats.streak, equippedKey, lastEquippedKey: q.meta.lastEquip } });
    q.meta.lastEquip = equippedKey;
    q.meta.recent = [...q.meta.recent, r.id].slice(-BALANCE.antiAbuse.recentMatches);
    q.meta.lastMatchAt = now;
    q.meta.handsSince = 0;
  });
  return { ...out, delta };
}

export type BuyRefusal = 'unknown' | 'notForSale' | 'owned' | 'coins';

export function buyItem(p: Progress, slot: Slot, id: string, day: string): { ok: true; p: Progress; gains: Gain[]; price: number } | { ok: false; why: BuyRefusal } {
  const item = itemOf(slot, id);
  if (!item) return { ok: false, why: 'unknown' };
  const key = `${slot}:${id}`;
  if (p.owned.includes(key)) return { ok: false, why: 'owned' };
  if (!buyable(item)) return { ok: false, why: 'notForSale' };
  const price = priceOf(item, day, p.owned, ITEMS)!;
  if (p.coins < price) return { ok: false, why: 'coins' };
  const out = run(p, day, tx => {
    tx.p.coins -= price;
    tx.p.stats.coinsSpent += price;
    grant(tx, key);
  });
  return { ok: true, ...out, price };
}

export function equipItem(p: Progress, slot: Slot, id: string): Progress | null {
  if (!canEquip(slot, id, p.owned)) return null;
  return { ...p, equipped: { ...p.equipped, [slot]: id } };
}

export function selectTitle(p: Progress, id: string): Progress | null {
  if (!hasTitle(id, p)) return null;
  return { ...p, meta: { ...p.meta, title: id } };
}

export function claimDaily(p: Progress, day: string, doubled: boolean): { p: Progress; gains: Gain[]; amount: number } | null {
  let r: { state: BonusState; amount: number };
  try {
    r = claimBonusOn(p.bonus, day);
  } catch {
    return null;
  }
  const amount = doubled ? r.amount * 2 : r.amount;
  const out = run(p, day, tx => {
    tx.p.bonus = r.state;
    tx.p.stats.bonusStreak = Math.max(tx.p.stats.bonusStreak, r.state.streak);
    tx.p.coins += amount;
    tx.p.stats.coinsEarned += amount;
  });
  return { ...out, amount };
}

/** Monete regalate quando il portafoglio è quasi vuoto (dopo un video). */
export function refill(p: Progress): Progress | null {
  if (p.coins >= BALANCE.coins.refillBelow) return null;
  return { ...p, coins: p.coins + BALANCE.coins.refill };
}

/** Solo per portare il giorno avanti (nuove missioni, stagione chiusa) senza fare altro. */
export const touch = (p: Progress, day: string) => run(p, day, () => {});

/** Il giocatore deve togliere i titoli che non ha più? No: i titoli non si perdono (tutti i requisiti crescono). */
export const titleOf = (p: Progress) => titleById(p.meta.title) ?? titleById(DEFAULT_TITLE)!;
