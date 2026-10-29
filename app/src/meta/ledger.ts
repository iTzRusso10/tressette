// Il registro della progressione: lo stato completo del giocatore e tutto ciò che lo cambia (una mano,
// una partita, un acquisto, il bonus, una ricompensa riscossa…). Funzioni pure, eseguite identiche sul
// telefono (subito, per lo schermo) e sul server (che decide davvero, per chi ha fatto l'accesso).
//
// Strade indipendenti che si premiano a vicenda: trofei e arene (permanenti), livello, achievement,
// punteggio di bravura per gioco con le leghe (per stagione), stagioni, eventi. Missioni, eventi e
// premi di fine stagione vanno tra le ricompense da riscuotere: restano lì finché non le prendi, anche
// se l'app si chiude, e si possono riscuotere una volta sola. Niente si perde: i trofei non si
// azzerano, gli oggetti restano, la stagione azzera solo i suoi punti e avvicina il punteggio a 1000.

import type { GameId } from '../engine/types.ts';
import { ACHIEVEMENTS, achievementById, newlyUnlocked } from './achievements.ts';
import { applyTrophies, ARENAS, floorOf, legendOf, reachedArena, type Reward } from './arenas.ts';
import { avatarById, DEFAULT_AVATAR } from './avatars.ts';
import { BALANCE } from './balance.ts';
import { DEFAULT_EQUIPPED, ITEMS, itemByKey, itemOf, migrateCosmetics, STARTER_KEYS, TABLE_SLOTS, type Slot } from './catalog.ts';
import { claimBonusOn, type BonusState } from './economy.ts';
import { eventAt, templateById } from './events.ts';
import { levelInfo } from './levels.ts';
import { distinctProgress, missionsFor, weekOf, type MissionEvent } from './missions.ts';
import { addHand, addMatch, emptyStats, GAME_IDS, normalizeStats, queueOf, type HandRecord, type MatchRecord, type Stats } from './progress.ts';
import { carryOver, LEAGUES, leagueIndex, leagueOf, newRatings, rate, RATING, type GameRating, type WeeklyPerf } from './rating.ts';
import { reqProgress, type ReqView } from './reqs.ts';
import { levelReward, legendReward, prestigeReward } from './rewards.ts';
import { seasonAt, seasonById, type SeasonMission } from './seasons.ts';
import { completedSets, SETS } from './sets.ts';
import { buyable, canEquip, offerOf, priceOf, todayOffer, type OfferState } from './shop.ts';
import { DEFAULT_TITLE, hasTitle, titleById } from './titles.ts';

/**
 * La versione delle regole e del catalogo. Il server la manda con ogni risposta e il telefono adotta lo
 * stato del server solo se il server conosce almeno le stesse regole: una funzione `progress` non
 * ancora ridistribuita non conosce gli oggetti, gli achievement e i campi nuovi, e adottando il suo
 * stato il telefono li perderebbe (e li festeggerebbe di nuovo alla prossima partita). Va aumentata a
 * ogni cambio di regole o di catalogo: il test in __tests__/progression.test.ts lo ricorda.
 */
export const LEDGER_VERSION = 3;

/* ================================================================== stato */

export interface SeasonState {
  id: string | null;
  points: number;
  matches: number;
  /** Le statistiche all'inizio della stagione: le missioni stagionali contano da qui. */
  base: Stats | null;
  streak: number;
  bestStreak: number;
  /** Traguardi di punti già raggiunti (indici) e missioni stagionali completate. */
  tiers: number[];
  missions: string[];
}

/** Una ricompensa da riscuotere. `id` la identifica: la stessa non si riscuote due volte. */
export interface Claim {
  id: string;
  why: string;
  coins?: number;
  xp?: number;
  items?: string[];
}

export interface EventState {
  id: string | null;
  /** Il valore della statistica dell'evento quando è cominciato. */
  base: number;
  /** Traguardi già raggiunti (indici). */
  tiers: number[];
}

export interface LeagueRecord {
  season: string;
  game: GameId;
  r: number;
  peak: number;
  league: string;
  n: number;
  rank?: number;
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
    /** Missioni del giorno cambiate (giorno → id tolti). */
    swaps: Record<string, string[]>;
    /** Per ogni periodo (giorno, settimana) se valevano le missioni online: si decide all'inizio, così la prima partita online non le cambia. */
    online: Record<string, boolean>;
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

  /** Punteggio di bravura per gioco nella stagione `ratingSeason` (rating.ts). */
  ratings: Record<GameId, GameRating>;
  ratingSeason: string | null;
  /** Prestazione della settimana per gioco (classifica settimanale). */
  weekly: Record<GameId, WeeklyPerf>;
  /** Partite online contro ciascuna persona oggi (oltre un limite non contano per il punteggio). */
  pairs: { day: string | null; n: Record<string, number> };
  /** Vittorie online contro ciascuna persona (le più frequenti). */
  rivals: Record<string, number>;
  /** I giochi finiti oggi (per «tre tavoli in un giorno»). */
  dayGames: { day: string | null; games: string[] };
  /** Leghe di fine stagione per gioco. */
  leagueHistory: LeagueRecord[];
  avatar: string;
  /** Fino a tre cose in vetrina nel profilo: «item:<chiave>» o «ach:<id>». */
  showcase: string[];
  /** Ricompense da riscuotere, e le ultime riscosse (contro i doppioni). */
  claims: Claim[];
  claimed: string[];
  event: EventState;
  eventLog: { id: string; progress: number; tiers: number }[];
  /** Premi assegnati dal server (podio settimanale, posizione di stagione) già messi tra le ricompense. */
  grantsSeen: string[];
  /** L'offerta del giorno, decisa all'inizio del giorno: non cambia fino a mezzanotte. */
  offer: OfferState;
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
  | { k: 'seasonTier'; season: string; index: number }
  | { k: 'rating'; game: GameId; delta: number; r: number }
  | { k: 'league'; game: GameId; league: string }
  | { k: 'eventTier'; event: string; index: number }
  | { k: 'claimable'; id: string; why: string };

export const emptySeason = (): SeasonState => ({ id: null, points: 0, matches: 0, base: null, streak: 0, bestStreak: 0, tiers: [], missions: [] });
const emptyWeekly = (): Record<GameId, WeeklyPerf> => ({
  tressette: { week: '', n: 0, opp: 0, w: 0, l: 0 },
  briscola: { week: '', n: 0, opp: 0, w: 0, l: 0 },
  scopa: { week: '', n: 0, opp: 0, w: 0, l: 0 },
});

export function emptyMeta(seed: string): Meta {
  return {
    seed,
    arena: 0,
    paid: { level: 1, prestige: 0, legend: 0, arena: 0 },
    firstWin: null,
    missions: { day: null, week: null, p: {}, seen: {}, done: [], swaps: {}, online: {} },
    season: emptySeason(),
    seasonHistory: [],
    seasonItems: [],
    sets: [],
    recent: [],
    lastMatchAt: 0,
    handsSince: 0,
    lastEquip: null,
    title: DEFAULT_TITLE,
    ratings: newRatings(),
    ratingSeason: null,
    weekly: emptyWeekly(),
    pairs: { day: null, n: {} },
    rivals: {},
    dayGames: { day: null, games: [] },
    leagueHistory: [],
    avatar: DEFAULT_AVATAR,
    showcase: [],
    claims: [],
    claimed: [],
    event: { id: null, base: 0, tiers: [] },
    eventLog: [],
    grantsSeen: [],
    offer: { day: null, key: null },
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
const obj = <T>(v: unknown, d: T): T => (v && typeof v === 'object' && !Array.isArray(v) ? (v as T) : d);

function cleanRatings(v: unknown): Record<GameId, GameRating> {
  const o = obj<Record<string, Partial<GameRating>>>(v, {});
  const out = newRatings();
  for (const g of GAME_IDS) {
    const x = o[g];
    if (!x) continue;
    const r = Math.max(RATING.floor, Math.min(4000, Math.floor(Number(x.r) || RATING.start)));
    out[g] = { r, n: int(x.n), peak: Math.max(r, Math.min(4000, int(x.peak))) };
  }
  return out;
}

function cleanWeekly(v: unknown): Record<GameId, WeeklyPerf> {
  const o = obj<Record<string, Partial<WeeklyPerf>>>(v, {});
  const out = emptyWeekly();
  for (const g of GAME_IDS) {
    const x = o[g];
    if (x && typeof x.week === 'string') out[g] = { week: x.week, n: int(x.n), opp: int(x.opp), w: int(x.w), l: int(x.l) };
  }
  return out;
}

const cleanClaim = (c: unknown): Claim | null => {
  const o = obj<Partial<Claim>>(c, {});
  if (typeof o.id !== 'string' || typeof o.why !== 'string') return null;
  return {
    id: o.id,
    why: o.why,
    ...(o.coins ? { coins: int(o.coins) } : {}),
    ...(o.xp ? { xp: int(o.xp) } : {}),
    ...(o.items ? { items: strArr(o.items).filter(k => !!itemByKey(k)) } : {}),
  };
};

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
  const mm = obj<Partial<Meta['missions']>>(m.missions, {});
  const ev = obj<Partial<EventState>>(m.event, {});
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
      missions: {
        day: typeof mm.day === 'string' ? mm.day : null,
        week: typeof mm.week === 'string' ? mm.week : null,
        p: obj(mm.p, {}),
        seen: obj(mm.seen, {}),
        done: strArr(mm.done),
        swaps: obj(mm.swaps, {}),
        online: obj(mm.online, {}),
      },
      season: { ...season, base: season.base ? normalizeStats(season.base) : null },
      seasonHistory: Array.isArray(m.seasonHistory) ? m.seasonHistory : [],
      seasonItems: strArr(m.seasonItems),
      sets: strArr(m.sets).filter(id => SETS.some(s => s.id === id)),
      recent: strArr(m.recent).slice(-BALANCE.antiAbuse.recentMatches),
      lastMatchAt: int(m.lastMatchAt),
      handsSince: int(m.handsSince),
      lastEquip: typeof m.lastEquip === 'string' ? m.lastEquip : null,
      title: typeof m.title === 'string' && titleById(m.title) ? m.title : DEFAULT_TITLE,
      ratings: cleanRatings(m.ratings),
      ratingSeason: typeof m.ratingSeason === 'string' ? m.ratingSeason : null,
      weekly: cleanWeekly(m.weekly),
      pairs: { day: typeof m.pairs?.day === 'string' ? m.pairs.day : null, n: obj(m.pairs?.n, {}) },
      rivals: obj(m.rivals, {}),
      dayGames: { day: typeof m.dayGames?.day === 'string' ? m.dayGames.day : null, games: strArr(m.dayGames?.games) },
      leagueHistory: Array.isArray(m.leagueHistory) ? m.leagueHistory.slice(-60) : [],
      avatar: avatarById(m.avatar).id,
      showcase: strArr(m.showcase).slice(0, 3),
      claims: (Array.isArray(m.claims) ? m.claims : []).map(cleanClaim).filter((c): c is Claim => !!c),
      claimed: strArr(m.claimed).slice(-300),
      event: { id: typeof ev.id === 'string' ? ev.id : null, base: int(ev.base), tiers: Array.isArray(ev.tiers) ? ev.tiers.map(int) : [] },
      eventLog: Array.isArray(m.eventLog) ? m.eventLog.slice(-30) : [],
      grantsSeen: strArr(m.grantsSeen).slice(-300),
      offer: {
        day: typeof m.offer?.day === 'string' ? m.offer.day : null,
        key: typeof m.offer?.key === 'string' && itemByKey(m.offer.key) ? m.offer.key : null,
      },
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

/** Una ricompensa da riscuotere: una volta sola per id, anche se arriva di nuovo. */
function addClaim(tx: Tx, c: Claim) {
  const m = tx.p.meta;
  if (m.claims.some(x => x.id === c.id) || m.claimed.includes(c.id)) return;
  m.claims.push(c);
  tx.gains.push({ k: 'claimable', id: c.id, why: c.why });
}

/** Monete date al posto di un oggetto che si ha già (eventi che si ripetono, cornici delle leghe). */
const DUPLICATE_COINS = 300;

/* ================================================================== missioni, stagioni, eventi */

const GAME_NAMES: Record<GameId, string> = { tressette: 'Tressette', briscola: 'Briscola', scopa: 'Scopa' };

/** Porta missioni, stagione, settimana ed evento al giorno `day`. */
function roll(tx: Tx, day: string) {
  const q = tx.p;
  const m = q.meta.missions;
  const week = weekOf(day);
  if (m.day !== day || m.week !== week) {
    // Si tengono solo le chiavi del giorno e della settimana correnti.
    const keep = (k: string) => k.startsWith(`${day}:`) || k.startsWith(`${week}:`);
    m.p = Object.fromEntries(Object.entries(m.p).filter(([k]) => keep(k)));
    m.seen = Object.fromEntries(Object.entries(m.seen).filter(([k]) => keep(k)));
    m.done = m.done.filter(keep);
    m.swaps = Object.fromEntries(Object.entries(m.swaps).filter(([k]) => k === day));
    m.online = Object.fromEntries(Object.entries(m.online ?? {}).filter(([k]) => k === day || k === week));
    m.day = day;
    m.week = week;
  }
  m.online ??= {};
  for (const k of [day, week]) if (!(k in m.online)) m.online[k] = playsOnline(q);
  // L'offerta del giorno si decide una volta, con gli oggetti che hai a inizio giornata.
  if (q.meta.offer.day !== day) {
    const o = offerOf(day, q.owned, ITEMS);
    q.meta.offer = { day, key: o ? `${o.slot}:${o.id}` : null };
  }
  for (const g of GAME_IDS) if (q.meta.weekly[g].week !== week) q.meta.weekly[g] = { week, n: 0, opp: 0, w: 0, l: 0 };

  // Stagione: i punti della stagione e, per le classifiche, il punteggio per gioco.
  const now = seasonAt(day);
  const s = q.meta.season;
  if ((now?.season.id ?? null) !== s.id) {
    if (s.id && s.matches > 0) q.meta.seasonHistory.push({ id: s.id, points: s.points, matches: s.matches });
    q.meta.season = { ...emptySeason(), id: now?.season.id ?? null, base: now ? JSON.parse(JSON.stringify(q.stats)) : null };
  }
  // Prima della prima stagione si gioca la «prestagione»: anche lei si chiude, con le sue leghe.
  const curRating = q.meta.ratingSeason ?? 'preseason';
  const nextRatingSeason = now?.season.id ?? curRating;
  if (nextRatingSeason !== curRating) {
    closeRatingSeason(tx, curRating);
    q.meta.ratingSeason = nextRatingSeason;
  }

  // Evento: uno nuovo comincia a contare da qui.
  const ev = eventAt(day);
  if ((ev?.id ?? null) !== q.meta.event.id) {
    const o = q.meta.event;
    if (o.id) q.meta.eventLog = [...q.meta.eventLog, { id: o.id, progress: eventProgressOf(q, o), tiers: o.tiers.length }].slice(-30);
    q.meta.event = { id: ev?.id ?? null, base: ev ? ev.template.metric(q.stats) : 0, tiers: [] };
  }
}

/** Fine di una stagione per il punteggio: premio della lega più alta raggiunta in ogni gioco, poi si riparte. */
function closeRatingSeason(tx: Tx, season: string) {
  const q = tx.p;
  for (const g of GAME_IDS) {
    const r = q.meta.ratings[g];
    if (r.n >= RATING.placement) {
      const top = leagueIndex(r.peak);
      const league = LEAGUES[top];
      q.meta.leagueHistory = [...q.meta.leagueHistory, { season, game: g, r: r.r, peak: r.peak, league: league.id, n: r.n }].slice(-60);
      addClaim(tx, {
        id: `lega:${season}:${g}`,
        why: `${league.name} a ${GAME_NAMES[g]}`,
        coins: league.coins,
        items: LEAGUES.slice(0, top + 1).map(l => `frame:${l.frame}`),
      });
    }
    q.meta.ratings[g] = carryOver(r);
  }
}

/** Ha già giocato con altre persone o vinto trofei: le missioni online e dei trofei sono alla sua portata. */
const playsOnline = (p: Progress) => p.stats.onlinePlayed > 0 || p.stats.trophiesWon > 0;

/** Le missioni attive oggi e questa settimana, con la loro chiave. */
export function activeMissions(p: Progress, day: string) {
  const now = playsOnline(p);
  const week = weekOf(day);
  const online = p.meta.missions.online ?? {};
  const skip = p.meta.missions.swaps[day] ?? [];
  return [
    ...missionsFor('daily', day, p.meta.seed, online[day] ?? now, skip).map(def => ({ def, key: `${day}:${def.id}` })),
    ...missionsFor('weekly', week, p.meta.seed, online[week] ?? now).map(def => ({ def, key: `${week}:${def.id}` })),
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
      if (!v) continue;
      m.seen[key] = [...(m.seen[key] ?? []), v];
      m.p[key] = distinctProgress(def, m.seen[key]);
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
      addClaim(tx, { id: `m:${key}`, why: def.text, coins: def.coins, xp: def.xp });
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
    GAME_IDS.map(g => [
      g,
      {
        played: s.byGame[g].played - b.byGame[g].played,
        won: s.byGame[g].won - b.byGame[g].won,
        expert: s.byGame[g].expert - b.byGame[g].expert,
        streak: s.byGame[g].streak,
        best: s.byGame[g].best,
      },
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
      addClaim(tx, { id: `stagione:${season.id}:${i}`, why: `${season.name}: ${t.points} punti`, ...t.reward });
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
      addClaim(tx, { id: `stagione:${season.id}:${m.id}`, why: m.text, coins: m.coins, xp: m.xp });
    }
  }
}

/** A che punto è l'evento in corso. */
export const eventProgressOf = (p: Progress, e: EventState = p.meta.event) => {
  const t = e.id ? templateById(e.id) : undefined;
  return t ? Math.max(0, t.metric(p.stats) - e.base) : 0;
};

function settleEvent(tx: Tx) {
  const e = tx.p.meta.event;
  const t = e.id ? templateById(e.id) : undefined;
  if (!t || !e.id) return;
  const have = eventProgressOf(tx.p);
  t.tiers.forEach((goal, i) => {
    if (have >= goal && !e.tiers.includes(i)) {
      e.tiers.push(i);
      tx.gains.push({ k: 'eventTier', event: e.id!, index: i });
      addClaim(tx, { id: `evento:${e.id}:${i}`, why: `${t.name}: ${goal} ${t.unit}`, ...t.rewards[i] });
      if (i === t.tiers.length - 1) tx.p.stats.eventsDone++;
    }
  });
}

/* ================================================================== assestamento */

/**
 * Dopo ogni cambiamento: achievement, livelli, prestigio, arene, leggenda, set, stagione, evento. Si
 * ripete finché niente cambia più (un achievement può portare un oggetto che completa un set che
 * sblocca un altro achievement…).
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
    settleEvent(tx);
    if (tx.newItems) {
      const n = tx.newItems;
      tx.newItems = 0;
      for (let i = 0; i < n; i++) advanceMissions(tx, day, { newItem: true });
      changed = true;
    }
    if (!changed) break;
  }
}

/**
 * Il giorno non torna mai indietro: un orologio rimesso indietro (o un fuso diverso) non riapre il
 * bonus, la prima vittoria o le missioni di un giorno già passato.
 */
export const dayFor = (p: Progress, day: string) => (p.meta.missions.day && day < p.meta.missions.day ? p.meta.missions.day : day);

function run(p: Progress, day: string, f: (tx: Tx) => void): { p: Progress; gains: Gain[] } {
  const tx: Tx = { p: clone(p), gains: [], newItems: 0 };
  roll(tx, dayFor(p, day));
  f(tx);
  settle(tx, day);
  return { p: tx.p, gains: tx.gains };
}

/* ================================================================== azioni */

export function applyHand(p: Progress, hand: HandRecord, day: string) {
  day = dayFor(p, day);
  if (p.meta.handsSince >= BALANCE.antiAbuse.maxHandsPerMatch) return { p, gains: [] as Gain[] };
  return run(p, day, tx => {
    tx.p.meta.handsSince++;
    tx.p.stats = addHand(tx.p.stats, hand);
    tx.p.xp += BALANCE.xp.hand + hand.scope * BALANCE.xp.scopa;
    advanceMissions(tx, day, { hand });
  });
}

export type MatchRefusal = 'duplicate' | 'tooSoon';

export interface MatchOutcome {
  p: Progress;
  gains: Gain[];
  /** Trofei vinti o persi (0 se rifiutata). */
  delta: number;
  /** Punteggio di bravura vinto o perso nel gioco della partita. */
  ratingDelta: number;
  refused?: MatchRefusal;
}

/** La forza degli avversari in classificata: la media dei loro punteggi (il server la ricalcola). */
export const opponentStrength = (r: MatchRecord) =>
  Number.isFinite(r.oppRating) ? Math.max(RATING.floor, Math.min(4000, Math.round(r.oppRating!))) : RATING.unknownOpponent;

/**
 * Una partita finita. Non conta se lo stesso id è già arrivato, e (sul server) se arriva troppo presto
 * dopo la precedente contro il computer. Le partite abbandonate non arrivano mai qui.
 *
 * Ogni strada dà la sua cosa: la partita veloce i trofei (e quindi le arene), la classificata il
 * punteggio di bravura (e quindi la lega e le classifiche); contro il computer e tra amici restano
 * monete, esperienza, missioni e achievement, che danno anche le altre due.
 */
export function applyMatch(p: Progress, r: MatchRecord, day: string, now: number, opts: { server?: boolean } = {}): MatchOutcome {
  day = dayFor(p, day);
  if (r.id && p.meta.recent.includes(r.id)) return { p, gains: [], delta: 0, ratingDelta: 0, refused: 'duplicate' };
  if (opts.server && !r.online && now - p.meta.lastMatchAt < BALANCE.antiAbuse.minSecondsBetweenMatches * 1000)
    return { p, gains: [], delta: 0, ratingDelta: 0, refused: 'tooSoon' };
  const queue = queueOf(r);
  let delta = 0;
  let ratingDelta = 0;
  const out = run(p, day, tx => {
    const q = tx.p;
    q.stats = addMatch(q.stats, r, day);
    // Monete: la prima vittoria del giorno vale di più; una sconfitta in una partita finita qualcosa.
    if (r.won && (!q.meta.firstWin || day > q.meta.firstWin)) {
      q.meta.firstWin = day;
      credit(tx, { coins: BALANCE.coins.firstWinOfDay }, 'Prima vittoria del giorno');
    } else credit(tx, { coins: r.won ? BALANCE.coins.win : BALANCE.coins.loss }, r.won ? 'Vittoria' : 'Partita completata');
    q.xp += r.won ? BALANCE.xp.win : BALANCE.xp.loss;
    // Trofei (solo la partita veloce), con il pavimento dell'arena raggiunta.
    const t = applyTrophies(q.cups, q.meta.arena, r);
    delta = t.delta;
    q.cups = t.trophies;
    q.bestCups = Math.max(q.bestCups, q.cups);
    q.stats.trophiesWon += Math.max(0, delta);

    // Persone al tavolo: oltre tre partite al giorno contro la stessa non contano per il punteggio.
    const opp = r.online ? (r.opp ?? []).filter(x => typeof x === 'string').slice(0, 3) : [];
    if (q.meta.pairs.day !== day) q.meta.pairs = { day, n: {} };
    if (queue === 'ranked') for (const o of opp) q.meta.pairs.n[o] = (q.meta.pairs.n[o] ?? 0) + 1;
    // Il punteggio di bravura (solo la classificata).
    if (queue === 'ranked' && opp.every(o => q.meta.pairs.n[o] <= RATING.samePairPerDay)) {
      const strength = opponentStrength(r);
      const before = q.meta.ratings[r.game];
      const lBefore = leagueIndex(before.r);
      const after = rate(before, strength, r.won);
      q.meta.ratings[r.game] = after.g;
      ratingDelta = after.delta;
      tx.gains.push({ k: 'rating', game: r.game, delta: after.delta, r: after.g.r });
      // Si festeggia solo una lega mai raggiunta in questa stagione: chi scende e risale non la rivede.
      if (leagueIndex(after.g.r) > Math.max(lBefore, leagueIndex(before.peak))) tx.gains.push({ k: 'league', game: r.game, league: leagueOf(after.g.r).id });
      const w = q.meta.weekly[r.game];
      q.meta.weekly[r.game] = { ...w, n: w.n + 1, opp: w.opp + strength, w: w.w + (r.won ? 1 : 0), l: w.l + (r.won ? 0 : 1) };
    }
    // Stagione: le partite veloci e classificate; i punti seguono trofei e punteggio, mai sotto zero.
    const s = q.meta.season;
    if (s.id && (queue === 'quick' || queue === 'ranked')) {
      if (s.matches === 0) q.stats.seasonsPlayed++;
      s.matches++;
      s.points = Math.max(0, s.points + (queue === 'quick' ? delta : ratingDelta));
      s.streak = r.won ? s.streak + 1 : 0;
      s.bestStreak = Math.max(s.bestStreak, s.streak);
    }
    // Rivali: vittorie contro la stessa persona.
    if (r.won && opp.length) {
      for (const o of opp) q.meta.rivals[o] = (q.meta.rivals[o] ?? 0) + 1;
      const top = Object.entries(q.meta.rivals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 100);
      q.meta.rivals = Object.fromEntries(top);
      q.stats.maxRivalWins = Math.max(q.stats.maxRivalWins, top[0]?.[1] ?? 0);
    }
    // Tre tavoli in un giorno.
    if (q.meta.dayGames.day !== day) q.meta.dayGames = { day, games: [] };
    if (!q.meta.dayGames.games.includes(r.game)) {
      q.meta.dayGames.games.push(r.game);
      if (q.meta.dayGames.games.length === 3) q.stats.allGamesDays++;
    }
    // Vincere con il tavolo di partenza dopo l'arena 10.
    if (r.won && q.meta.arena >= 9 && TABLE_SLOTS.every(sl => q.equipped[sl] === DEFAULT_EQUIPPED[sl])) q.stats.humbleWins++;

    const equippedKey = TABLE_SLOTS.map(k => q.equipped[k]).join('|');
    advanceMissions(tx, day, { match: { ...r, trophyDelta: delta, streak: q.stats.streak, equippedKey, lastEquippedKey: q.meta.lastEquip } });
    q.meta.lastEquip = equippedKey;
    q.meta.recent = [...q.meta.recent, r.id].slice(-BALANCE.antiAbuse.recentMatches);
    q.meta.lastMatchAt = now;
    q.meta.handsSince = 0;
  });
  return { ...out, delta, ratingDelta };
}

export type BuyRefusal = 'unknown' | 'notForSale' | 'owned' | 'coins';

export function buyItem(p: Progress, slot: Slot, id: string, day: string): { ok: true; p: Progress; gains: Gain[]; price: number } | { ok: false; why: BuyRefusal } {
  day = dayFor(p, day);
  const item = itemOf(slot, id);
  if (!item) return { ok: false, why: 'unknown' };
  const key = `${slot}:${id}`;
  if (p.owned.includes(key)) return { ok: false, why: 'owned' };
  if (!buyable(item)) return { ok: false, why: 'notForSale' };
  const price = priceOf(item, todayOffer(p.meta.offer, day, p.owned, ITEMS))!;
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

export function selectAvatar(p: Progress, id: string): Progress | null {
  if (avatarById(id).id !== id) return null;
  return { ...p, meta: { ...p.meta, avatar: id } };
}

/** La vetrina: fino a tre oggetti posseduti o achievement completati. */
export function selectShowcase(p: Progress, keys: string[]): Progress | null {
  const clean = [...new Set(keys)].slice(0, 3);
  const ok = clean.every(k =>
    k.startsWith('item:') ? p.owned.includes(k.slice(5)) && !!itemByKey(k.slice(5)) : k.startsWith('ach:') ? !!p.achievements[k.slice(4)] && !!achievementById(k.slice(4)) : false,
  );
  if (!ok) return null;
  return { ...p, meta: { ...p.meta, showcase: clean } };
}

/** La vetrina che si vede: quella scelta, o le tre cose più rare che hai. */
export function showcaseOf(p: Progress): string[] {
  if (p.meta.showcase.length) return p.meta.showcase;
  const rank = ['comune', 'noncomune', 'raro', 'epico', 'leggendario', 'mitico'];
  return p.owned
    .map(k => itemByKey(k))
    .filter(i => !!i && i.price > 0)
    .sort((a, b) => rank.indexOf(b!.rarity) - rank.indexOf(a!.rarity) || b!.price - a!.price)
    .slice(0, 3)
    .map(i => `item:${i!.slot}:${i!.id}`);
}

/** Riscuote una ricompensa (o tutte con id «*»). Una seconda richiesta uguale non trova più niente. */
export function claimReward(p: Progress, id: string, day: string): { p: Progress; gains: Gain[]; claimed: string[] } {
  day = dayFor(p, day);
  const ids = id === '*' ? p.meta.claims.map(c => c.id) : p.meta.claims.some(c => c.id === id) ? [id] : [];
  if (!ids.length) return { p, gains: [], claimed: [] };
  const out = run(p, day, tx => {
    const m = tx.p.meta;
    for (const cid of ids) {
      const c = m.claims.find(x => x.id === cid);
      if (!c) continue;
      m.claims = m.claims.filter(x => x.id !== cid);
      m.claimed = [...m.claimed, cid].slice(-300);
      const items = (c.items ?? []).filter(k => itemByKey(k));
      const dup = items.filter(k => tx.p.owned.includes(k)).length;
      credit(tx, { coins: (c.coins ?? 0) + dup * DUPLICATE_COINS, xp: c.xp, items }, c.why);
    }
  });
  return { ...out, claimed: ids };
}

/** Cambia una missione del giorno non ancora completata (una volta al giorno). */
export function swapMission(p: Progress, key: string, day: string): Progress | null {
  day = dayFor(p, day);
  const swaps = p.meta.missions.swaps[day] ?? [];
  if (swaps.length >= 1 || !key.startsWith(`${day}:`) || p.meta.missions.done.includes(key)) return null;
  const id = key.slice(day.length + 1);
  if (!activeMissions(p, day).some(m => m.key === key)) return null;
  const q = clone(p);
  q.meta.missions.swaps[day] = [...swaps, id];
  delete q.meta.missions.p[key];
  delete q.meta.missions.seen[key];
  return q;
}

/** Premi assegnati dal server (podio settimanale, posizione di stagione): diventano ricompense da riscuotere. */
export function addGrants(p: Progress, grants: Claim[], day: string) {
  day = dayFor(p, day);
  return run(p, day, tx => {
    for (const g of grants) {
      const c = cleanClaim(g);
      if (!c || tx.p.meta.grantsSeen.includes(c.id)) continue;
      tx.p.meta.grantsSeen = [...tx.p.meta.grantsSeen, c.id].slice(-300);
      addClaim(tx, c);
    }
  });
}

export function claimDaily(p: Progress, day: string, doubled: boolean): { p: Progress; gains: Gain[]; amount: number } | null {
  day = dayFor(p, day);
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

/** Solo per portare il giorno avanti (nuove missioni, stagione, evento) senza fare altro. */
export const touch = (p: Progress, day: string) => run(p, dayFor(p, day), () => {});

/** I titoli non si perdono (tutti i requisiti crescono). */
export const titleOf = (p: Progress) => titleById(p.meta.title) ?? titleById(DEFAULT_TITLE)!;

/* ================================================================== profilo pubblico */

/** Quello che gli altri vedono di te (profiles.public sul server): niente monete, niente dati privati. */
export interface PublicProfile {
  v: 1;
  avatar: string;
  frame: string;
  title: string;
  showcase: string[];
  arena: number;
  level: number;
  prestige: number;
  played: number;
  won: number;
  bestStreak: number;
  games: Record<GameId, { played: number; won: number; best: number; r: number; n: number }>;
  achievements: number;
  secrets: number;
  sets: number;
  leagues: { season: string; game: GameId; league: string }[];
}

export function publicOf(p: Progress): PublicProfile {
  const li = levelInfo(p.xp);
  return {
    v: 1,
    avatar: p.meta.avatar,
    frame: p.equipped.frame,
    title: p.meta.title,
    showcase: showcaseOf(p),
    arena: p.meta.arena,
    level: li.level,
    prestige: li.prestige,
    played: p.stats.played,
    won: p.stats.won,
    bestStreak: p.stats.bestStreak,
    games: Object.fromEntries(
      GAME_IDS.map(g => [g, { played: p.stats.byGame[g].played, won: p.stats.byGame[g].won, best: p.stats.byGame[g].best, r: p.meta.ratings[g].r, n: p.meta.ratings[g].n }]),
    ) as PublicProfile['games'],
    achievements: Object.keys(p.achievements).length,
    secrets: ACHIEVEMENTS.filter(a => a.hint && p.achievements[a.id]).length,
    sets: p.meta.sets.length,
    leagues: p.meta.leagueHistory.slice(-9).map(l => ({ season: l.season, game: l.game, league: l.league })),
  };
}
