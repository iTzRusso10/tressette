import { ALL, bp, PRIM, rankOf, SETTEBELLO, suitOf, fmtThirds, tz, type Card } from './cards';
import { defaultRng, shuffle, type Rng } from './rng';
import {
  findAccusi,
  isPerdere,
  legalFor,
  nTeams,
  playersFor,
  scopaOptions,
  sameSet,
  targetsFor,
  teamOf,
  teamSeats,
  winBriscola,
  winEntry,
} from './rules';
import type {
  BriscolaRow,
  GameEvent,
  Hand,
  HandResult,
  HandRow,
  Match,
  MatchConfig,
  Move,
  Outcome,
  ScopaRow,
  Step,
  TressetteRow,
} from './types';

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

export const CPU_NAMES = ['Gennaro', 'Carmela', 'Salvatore'];

export function createMatch(cfg: MatchConfig, rng: Rng = defaultRng): Match {
  const n = playersFor(cfg.mode, cfg.perdN);
  const targets = targetsFor(cfg.game, cfg.mode);
  const perdere = cfg.game === 'tressette' && cfg.mode === 'perdere';
  return {
    game: cfg.game,
    mode: cfg.mode,
    n,
    seats: cfg.seats.slice(0, n).map((s, i) => ({
      name: (s.name || '').trim().slice(0, 16) || (i === 0 ? 'Tu' : s.type === 'cpu' ? CPU_NAMES[i - 1] : 'Giocatore ' + (i + 1)),
      type: s.type,
    })),
    level: cfg.level,
    target: targets.includes(cfg.target) ? cfg.target : targets[0],
    accusi: cfg.game === 'tressette' && cfg.accusi !== false && !perdere,
    cappotto: perdere && cfg.cappotto !== false,
    match: new Array(cfg.mode === '4' ? 2 : n).fill(0),
    handNo: 0,
    dealer: (rng() * n) | 0,
    finished: false,
    h: null,
  };
}

/** Deals a new hand. The dealer moves on one seat from the previous hand. */
export function startHand(prev: Match, rng: Rng = defaultRng): Step[] {
  const m = clone(prev);
  if (m.handNo > 0) m.dealer = (m.dealer + 1) % m.n;
  m.handNo++;
  const n = m.n;
  const deck = shuffle(ALL.slice(), rng);
  const hands: Card[][] = Array.from({ length: n }, () => []);
  const order: Card[] = [];
  const per = m.game === 'tressette' ? 10 : 3;
  for (let r = 0; r < per; r++)
    for (let j = 1; j <= n; j++) {
      const p = (m.dealer + j) % n;
      const c = deck.pop()!;
      hands[p].push(c);
      order.push(c);
    }
  let table: Card[] = [];
  let brisc: Card | null = null;
  if (m.game === 'scopa') {
    table = deck.splice(-4);
    // Three or four Re on the table: deal the table again.
    while (table.filter(c => rankOf(c) === 10).length >= 3) {
      deck.push(...table);
      shuffle(deck, rng);
      table = deck.splice(-4);
    }
    order.push(...table);
  }
  if (m.game === 'briscola') {
    brisc = deck.pop()!;
    deck.unshift(brisc);
    order.push(brisc);
  }
  const h: Hand = {
    hands,
    deck,
    trick: [],
    turn: (m.dealer + 1) % n,
    terzi: new Array(n).fill(0),
    tricks: new Array(n).fill(0),
    capt: hands.map(() => []),
    played: [],
    voids: hands.map(() => [false, false, false, false]),
    known: hands.map(() => []),
    accusi: [],
    signal: null,
    ultima: -1,
    last: null,
    table,
    brisc,
    trump: brisc === null ? -1 : suitOf(brisc),
    pts: new Array(n).fill(0),
    scope: new Array(n).fill(0),
    lastCap: -1,
    over: false,
    result: null,
    glow: null,
    inPlay: null,
    reveal: null,
  };
  if (m.accusi)
    hands.forEach((hh, p) =>
      findAccusi(hh).forEach(a => {
        h.accusi.push({ p, ...a });
        a.cards.forEach(c => h.known[p].push(c));
      }),
    );
  m.h = h;
  const steps: Step[] = [{ event: { k: 'deal', order }, state: clone(m) }];
  for (const a of h.accusi) steps.push({ event: { k: 'accuso', p: a.p, label: a.label, pts: a.pts }, state: clone(m) });
  return steps;
}

export const handOver = (h: Hand) => !h.trick.length && !h.deck.length && h.hands.every(x => !x.length);

/** The cards seat p may play now. */
export function legalCards(m: Match, p: number): Card[] {
  const h = m.h!;
  return legalFor(m.game, h.hands[p], h.trick);
}

/** Checks a move from a person (or a remote player) before applying it. */
export function isValidMove(m: Match, p: number, mv: Move): boolean {
  const h = m.h;
  if (!h || h.over || h.turn !== p) return false;
  if (!legalCards(m, p).includes(mv.c)) return false;
  if (m.game === 'scopa') {
    const opts = scopaOptions(mv.c, h.table);
    const take = mv.take || [];
    return opts.length ? opts.some(o => sameSet(o, take)) : take.length === 0;
  }
  if (mv.sig && !(m.game === 'tressette' && m.mode === '4' && !h.trick.length)) return false;
  return true;
}

/**
 * Plays a move for seat p and runs everything that follows automatically: the trick being taken,
 * the cards drawn from the deck, a new Scopa round, the end of the hand.
 * Returns each intermediate state, so the table can show them one by one.
 */
export function play(prev: Match, p: number, mv: Move): Step[] {
  if (!isValidMove(prev, p, mv)) throw new Error(`Mossa non valida: ${JSON.stringify(mv)} per ${p}`);
  const m = clone(prev);
  const steps: Step[] = [];
  const push = (event: GameEvent) => steps.push({ event, state: clone(m) });
  if (m.game === 'scopa') playScopa(m, p, mv, push);
  else playTrick(m, p, mv, push);
  const h = m.h!;
  if (m.game === 'scopa' && !handOver(h) && h.hands.every(x => !x.length) && h.deck.length) dealScopaRound(m, push);
  if (handOver(h)) endHand(m, push);
  return steps;
}

function dealScopaRound(m: Match, push: (e: GameEvent) => void) {
  const h = m.h!;
  const order: Card[] = [];
  for (let r = 0; r < 3; r++)
    for (let j = 1; j <= m.n; j++) {
      if (!h.deck.length) break;
      const p = (m.dealer + j) % m.n;
      const c = h.deck.pop()!;
      h.hands[p].push(c);
      order.push(c);
    }
  push({ k: 'dealRound', order });
  if (!h.deck.length) push({ k: 'deckEmpty' });
}

function playScopa(m: Match, p: number, mv: Move, push: (e: GameEvent) => void) {
  const h = m.h!;
  const c = mv.c;
  const take = mv.take || [];
  h.hands[p] = h.hands[p].filter(x => x !== c);
  h.played.push(c);
  if (take.length) {
    h.inPlay = { p, c, on: take[0] };
    push({ k: 'play', p, c, sig: null });
    h.glow = take.concat([c]);
    push({ k: 'capture', p, c, take });
    h.glow = null;
    h.inPlay = null;
    h.table = h.table.filter(x => !take.includes(x));
    h.capt[p].push(c, ...take);
    h.lastCap = p;
    h.last = { trick: [{ p, c }].concat(take.map(x => ({ p: -1, c: x }))), w: p };
    const lastPlay = !h.deck.length && h.hands.every(x => !x.length);
    const scopa = !h.table.length && !lastPlay;
    if (scopa) h.scope[p]++;
    h.turn = (p + 1) % m.n;
    push({
      k: 'collect',
      w: p,
      pts: '',
      ultima: false,
      scopa,
      settebello: !scopa && (take.includes(SETTEBELLO) || c === SETTEBELLO),
    });
  } else {
    h.table.push(c);
    h.turn = (p + 1) % m.n;
    push({ k: 'play', p, c, sig: null });
  }
}

function playTrick(m: Match, p: number, mv: Move, push: (e: GameEvent) => void) {
  const h = m.h!;
  const c = mv.c;
  const perdere = isPerdere(m);
  if (m.game === 'tressette' && h.trick.length && suitOf(c) !== suitOf(h.trick[0].c)) h.voids[p][suitOf(h.trick[0].c)] = true;
  h.hands[p] = h.hands[p].filter(x => x !== c);
  h.known[p] = h.known[p].filter(x => x !== c);
  h.trick.push({ p, c });
  h.played.push(c);
  const sig = mv.sig && m.game === 'tressette' && m.mode === '4' && h.trick.length === 1 ? mv.sig : null;
  if (sig) h.signal = { p, type: sig };
  if (h.trick.length < m.n) {
    h.turn = (p + 1) % m.n;
    push({ k: 'play', p, c, sig });
    return;
  }
  push({ k: 'play', p, c, sig });
  const w = m.game === 'briscola' ? winBriscola(h.trick, h.trump) : winEntry(h.trick);
  h.glow = [w.c];
  push({ k: 'trickWon', w: w.p, cards: h.trick.map(e => e.c) });
  h.glow = null;
  let pts = 0;
  for (const e of h.trick) pts += m.game === 'briscola' ? bp(e.c) : tz(e.c, perdere);
  if (m.game === 'briscola') h.pts[w.p] += pts;
  else h.terzi[w.p] += pts;
  h.tricks[w.p]++;
  h.capt[w.p].push(...h.trick.map(e => e.c));
  h.last = { trick: h.trick.slice(), w: w.p };
  h.trick = [];
  h.turn = w.p;
  h.signal = null;
  const last = m.game === 'tressette' && !h.deck.length && h.hands.every(x => !x.length);
  if (last) {
    h.terzi[w.p] += 3;
    h.ultima = w.p;
  }
  push({
    k: 'collect',
    w: w.p,
    pts: m.game === 'briscola' ? (pts ? String(pts) : '') : pts || last ? fmtThirds(pts + (last ? 3 : 0)) : '',
    ultima: last,
  });
  if (m.game === 'briscola' && h.deck.length) {
    // Each player draws one card, starting with the winner; the briscola is the last card drawn.
    for (let k = 0; k < m.n; k++) {
      if (!h.deck.length) break;
      const q = (w.p + k) % m.n;
      const d = h.deck.pop()!;
      h.hands[q].push(d);
      push({ k: 'draw', p: q, c: d });
    }
    if (!h.deck.length) push({ k: 'deckEmpty' });
  } else if (m.game === 'tressette' && m.n === 2 && h.deck.length) {
    // Tressette in two: the winner draws first, both cards are shown to everyone.
    const o = 1 - w.p;
    const a = h.deck.pop()!;
    const b = h.deck.pop()!;
    h.reveal = [
      { c: a, p: w.p },
      { c: b, p: o },
    ];
    push({ k: 'reveal', cards: h.reveal });
    h.hands[w.p].push(a);
    h.hands[o].push(b);
    h.known[w.p].push(a);
    h.known[o].push(b);
    h.reveal = null;
    push({ k: 'draw', p: w.p, c: a });
    if (!h.deck.length) push({ k: 'deckEmpty' });
  }
}

function endHand(m: Match, push: (e: GameEvent) => void) {
  const h = m.h!;
  if (m.game === 'scopa' && h.table.length) {
    // The cards left on the table go to whoever took last.
    const q = h.lastCap >= 0 ? h.lastCap : m.dealer;
    h.capt[q].push(...h.table);
    h.table = [];
    push({ k: 'tableToLast', p: q });
  }
  const rows = m.game === 'scopa' ? scopaResult(m) : m.game === 'briscola' ? briscolaResult(m) : tressetteResult(m);
  rows.forEach(r => (m.match[r.t] += r.total));
  let out = matchOutcome(m);
  let capp = -1;
  if (m.cappotto) {
    // House rule, only a perdere: whoever takes every point of the hand, last trick included, wins at once.
    const tr = rows as TressetteRow[];
    const c = tr.find(r => r.ult && tr.every(o => o === r || (o.cardsT === 0 && !o.ult)));
    if (c) {
      capp = c.t;
      out = { winners: [c.t], losers: [], cappotto: true };
    }
  }
  h.over = true;
  h.result = { rows, out } satisfies HandResult;
  if (out) m.finished = true;
  push({ k: 'handEnd', cappotto: capp });
}

export function tressetteResult(m: Match): TressetteRow[] {
  const h = m.h!;
  const rows: TressetteRow[] = [];
  for (let t = 0; t < nTeams(m); t++) {
    const seats = teamSeats(m, t);
    const terzi = seats.reduce((a, p) => a + h.terzi[p], 0);
    const ult = seats.includes(h.ultima);
    const acc = h.accusi.filter(a => teamOf(m, a.p) === t).reduce((a, x) => a + x.pts, 0);
    const pts = Math.floor(terzi / 3);
    rows.push({ t, cardsT: terzi - (ult ? 3 : 0), ult, acc, pts, total: pts + acc, tricks: seats.reduce((a, p) => a + h.tricks[p], 0) });
  }
  return rows;
}

export function briscolaResult(m: Match): BriscolaRow[] {
  const h = m.h!;
  const rows: BriscolaRow[] = [];
  for (let t = 0; t < nTeams(m); t++) {
    const seats = teamSeats(m, t);
    const pts = seats.reduce((a, p) => a + h.pts[p], 0);
    rows.push({ t, pts, tricks: seats.reduce((a, p) => a + h.tricks[p], 0), total: pts > 60 ? 1 : 0 });
  }
  return rows;
}

export function primiera(cards: Card[]): number {
  let prim = 0;
  for (let su = 0; su < 4; su++) {
    const v = cards.filter(c => suitOf(c) === su).map(c => PRIM[rankOf(c)]);
    prim += v.length ? Math.max(...v) : 0;
  }
  return prim;
}

export function scopaResult(m: Match): ScopaRow[] {
  const h = m.h!;
  const rows: ScopaRow[] = [];
  for (let t = 0; t < nTeams(m); t++) {
    const seats = teamSeats(m, t);
    const cards = ([] as Card[]).concat(...seats.map(p => h.capt[p]));
    rows.push({
      t,
      scope: seats.reduce((a, p) => a + h.scope[p], 0),
      cards: cards.length,
      den: cards.filter(c => suitOf(c) === 1).length,
      sb: cards.includes(SETTEBELLO),
      prim: primiera(cards),
      pCards: 0,
      pDen: 0,
      pPrim: 0,
      pSb: 0,
      total: 0,
    });
  }
  // A point goes to whoever has strictly the most; a tie gives it to nobody.
  const award = (key: 'cards' | 'den' | 'prim') => {
    const mx = Math.max(...rows.map(r => r[key]));
    const w = rows.filter(r => r[key] === mx);
    return w.length === 1 ? w[0].t : -1;
  };
  const wc = award('cards');
  const wd = award('den');
  const wp = award('prim');
  rows.forEach(r => {
    r.pCards = r.t === wc ? 1 : 0;
    r.pDen = r.t === wd ? 1 : 0;
    r.pPrim = r.t === wp ? 1 : 0;
    r.pSb = r.sb ? 1 : 0;
    r.total = r.scope + r.pCards + r.pDen + r.pPrim + r.pSb;
  });
  return rows;
}

export function matchOutcome(m: Match): Outcome | null {
  const sc = m.match;
  const tg = m.target;
  const mx = Math.max(...sc);
  if (mx < tg) return null;
  const idx = (f: (v: number) => boolean) => sc.map((v, i) => (f(v) ? i : -1)).filter(i => i >= 0);
  if (m.game === 'briscola') return { winners: idx(v => v >= tg), losers: [] };
  if (isPerdere(m)) {
    // A perdere one loses at 31; whoever has the fewest points wins.
    const mn = Math.min(...sc);
    return { winners: idx(v => v === mn), losers: idx(v => v >= tg) };
  }
  const tops = idx(v => v === mx);
  // A tie at the top: play on.
  return tops.length > 1 ? null : { winners: tops, losers: [] };
}

export const isTressetteRow = (r: HandRow): r is TressetteRow => 'cardsT' in r;
export const isScopaRow = (r: HandRow): r is ScopaRow => 'prim' in r;
