import { ALL, bp, bpw, pw, rankOf, SETTEBELLO, suitOf, sval, tz, type Card } from './cards';
import { defaultRng, minBy, shuffle, type Rng } from './rng';
import { isPerdere, legal, scopaOptions, winBriscola, winEntry } from './rules';
import type { Match, Mode, Move, Signal, TrickEntry } from './types';

/* ------------------------------------------------------------------------------------------
 * Tressette
 * The base policy plays sensibly from what it sees; Medio and Esperto simulate many possible
 * deals of the unseen cards (Perfect Information Monte Carlo) and pick the card that scores best.
 * ---------------------------------------------------------------------------------------- */

interface SimState {
  hands: Card[][];
  deck: Card[];
  trick: TrickEntry[];
  turn: number;
  terzi: number[];
  n: number;
  mode: Mode;
  perdere: boolean;
}

function policy(st: Pick<SimState, 'hands' | 'trick' | 'n' | 'mode' | 'perdere'>, p: number): Card {
  const L = legal(st.hands[p], st.trick);
  if (L.length === 1) return L[0];
  return st.perdere ? polLose(st, L) : polWin(st, p, L);
}

function polWin(st: Pick<SimState, 'hands' | 'trick' | 'n' | 'mode' | 'perdere'>, p: number, L: Card[]): Card {
  const hand = st.hands[p];
  const trick = st.trick;
  const t = (c: Card) => tz(c, st.perdere);
  if (!trick.length) {
    // A 3 together with the 2 of the same suit: cash it.
    for (const c of L) if (rankOf(c) === 3 && hand.includes(c - 1)) return c;
    const cnt = [0, 0, 0, 0];
    hand.forEach(x => cnt[suitOf(x)]++);
    return minBy(L, c => t(c) * 100 - cnt[suitOf(c)] * 10 + pw(c));
  }
  const lead = suitOf(trick[0].c);
  const win = winEntry(trick);
  const last = trick.length === st.n - 1;
  const partnerWin = st.mode === '4' && win.p % 2 === p % 2;
  const tp = trick.reduce((a, e) => a + t(e.c), 0);
  if (partnerWin && (last || pw(win.c) >= 9)) return minBy(L, c => -t(c) * 20 + pw(c));
  if (suitOf(L[0]) === lead) {
    const beat = L.filter(c => pw(c) > pw(win.c));
    if (beat.length && !partnerWin) {
      if (last) return minBy(beat, c => -t(c) * 20 + pw(c));
      const top = beat.filter(c => pw(c) === 10);
      if (top.length && tp >= 1) return top[0];
      if (tp >= 3) return minBy(beat, c => -pw(c));
    }
    return minBy(L, c => t(c) * 20 + pw(c));
  }
  return minBy(L, c => t(c) * 20 + pw(c));
}

function polLose(st: Pick<SimState, 'trick' | 'n' | 'perdere'>, L: Card[]): Card {
  const trick = st.trick;
  const t = (c: Card) => tz(c, st.perdere);
  if (!trick.length) return minBy(L, c => pw(c) * 3 + t(c));
  const lead = suitOf(trick[0].c);
  const win = winEntry(trick);
  const last = trick.length === st.n - 1;
  if (suitOf(L[0]) === lead) {
    const under = L.filter(c => pw(c) < pw(win.c));
    if (under.length) return minBy(under, c => -(t(c) * 20 + pw(c)));
    if (last) return minBy(L, c => t(c) * 20 - pw(c));
    return minBy(L, c => pw(c));
  }
  return minBy(L, c => -(t(c) * 20 + pw(c)));
}

function simulate(st: SimState, first: Card) {
  let c: Card | undefined = first;
  for (;;) {
    const p = st.turn;
    if (c === undefined) c = policy(st, p);
    const hh = st.hands[p];
    hh.splice(hh.indexOf(c), 1);
    st.trick.push({ p, c });
    c = undefined;
    if (st.trick.length === st.n) {
      const w = winEntry(st.trick).p;
      let pts = 0;
      for (const e of st.trick) pts += tz(e.c, st.perdere);
      st.terzi[w] += pts;
      st.trick = [];
      if (!st.deck.length && st.hands.every(x => !x.length)) {
        st.terzi[w] += 3;
        return;
      }
      if (st.n === 2 && st.deck.length) {
        st.hands[w].push(st.deck.pop()!);
        st.hands[1 - w].push(st.deck.pop()!);
      }
      st.turn = w;
    } else st.turn = (p + 1) % st.n;
  }
}

function evalSt(st: SimState, p: number): number {
  if (st.perdere) return -st.terzi[p];
  let v = 0;
  for (let q = 0; q < st.n; q++) {
    const same = st.mode === '4' ? q % 2 === p % 2 : q === p;
    v += same ? st.terzi[q] : -st.terzi[q];
  }
  return v;
}

/** Deals the unseen cards to the other players (respecting the suits they showed they lack) and to the deck. */
function dealPool(pool: Card[], need: number[], deckNeed: number, voids: boolean[][], p: number, rng: Rng) {
  const cards = shuffle(pool.slice(), rng);
  const cap = need.slice();
  let dcap = deckNeed;
  const out: Card[][] = need.map(() => []);
  const deck: Card[] = [];
  for (const c of cards) {
    const s = suitOf(c);
    const cands: number[] = [];
    let tot = 0;
    for (let q = 0; q < cap.length; q++)
      if (q !== p && cap[q] > 0 && !voids[q][s]) {
        cands.push(q);
        tot += cap[q];
      }
    if (dcap > 0) {
      cands.push(-1);
      tot += dcap;
    }
    let pick: number;
    if (!cands.length) {
      pick = -1;
      for (let q = 0; q < cap.length; q++)
        if (cap[q] > 0) {
          pick = q;
          break;
        }
    } else {
      let r = rng() * tot;
      pick = cands[cands.length - 1];
      for (const q of cands) {
        const w = q < 0 ? dcap : cap[q];
        if (r < w) {
          pick = q;
          break;
        }
        r -= w;
      }
    }
    if (pick < 0) {
      deck.push(c);
      dcap--;
    } else {
      out[pick].push(c);
      cap[pick]--;
    }
  }
  return { out, deck };
}

function pimc(m: Match, p: number, L: Card[], D: number, rng: Rng): Card {
  const h = m.h!;
  const n = m.n;
  const perdere = isPerdere(m);
  const seen = new Set(h.played);
  h.hands[p].forEach(c => seen.add(c));
  const known = h.known.map((k, q) => (q === p ? [] : k.filter(c => h.hands[q].includes(c))));
  known.forEach(k => k.forEach(c => seen.add(c)));
  const pool = ALL.filter(c => !seen.has(c));
  const need = h.hands.map((hh, q) => (q === p ? 0 : hh.length - known[q].length));
  const score = new Float64Array(L.length);
  for (let d = 0; d < D; d++) {
    const deal = dealPool(pool, need, h.deck.length, h.voids, p, rng);
    const base = h.hands.map((hh, q) => (q === p ? hh.slice() : known[q].concat(deal.out[q])));
    for (let i = 0; i < L.length; i++) {
      const st: SimState = {
        hands: base.map(a => a.slice()),
        deck: deal.deck.slice(),
        trick: h.trick.map(e => ({ p: e.p, c: e.c })),
        turn: p,
        terzi: new Array(n).fill(0),
        n,
        mode: m.mode,
        perdere,
      };
      simulate(st, L[i]);
      score[i] += evalSt(st, p);
    }
  }
  let bi = 0;
  for (let i = 1; i < L.length; i++) if (score[i] > score[bi]) bi = i;
  return L[bi];
}

/** No higher card of this suit is still around, other than in p's own hand. */
function isMaster(m: Match, c: Card, p: number): boolean {
  const s = suitOf(c);
  const h = m.h!;
  for (let r = 1; r <= 10; r++) {
    const x = s * 10 + r - 1;
    if (pw(x) > pw(c) && !h.played.includes(x) && !h.hands[p].includes(x)) return false;
  }
  return true;
}

function chooseTressette(m: Match, p: number, rng: Rng): Card {
  const h = m.h!;
  const L = legal(h.hands[p], h.trick);
  if (L.length === 1) return L[0];
  // The partner knocked (Busso): play your best card of the suit if it is the master.
  if (m.mode === '4' && h.signal && h.signal.type === 'Busso' && h.signal.p !== p && h.signal.p % 2 === p % 2 && h.trick.length) {
    const s = suitOf(h.trick[0].c);
    const mine = L.filter(c => suitOf(c) === s);
    if (mine.length) {
      const top = minBy(mine, c => -pw(c));
      if (isMaster(m, top, p)) return top;
    }
  }
  const perdere = isPerdere(m);
  if (m.level === 'facile') {
    if (rng() < 0.35) return L[(rng() * L.length) | 0];
    return policy({ hands: h.hands, trick: h.trick, n: m.n, mode: m.mode, perdere }, p);
  }
  return pimc(m, p, L, m.level === 'medio' ? 16 : 80, rng);
}

/** Tressette in four: the signal the computer gives with its opening card. */
export function cpuSignal(m: Match, p: number, c: Card): Signal | null {
  const h = m.h!;
  const s = suitOf(c);
  const ofSuit = h.hands[p].filter(x => suitOf(x) === s);
  if (ofSuit.length === 1) return 'Volo';
  const three = s * 10 + 2;
  if (c !== three && !h.hands[p].includes(three) && !h.played.includes(three) && (h.hands[p].includes(s * 10 + 1) || h.hands[p].includes(s * 10)))
    return 'Busso';
  if (ofSuit.length >= 4) return 'Striscio';
  return null;
}

/* ------------------------------------------------------------------------------------------
 * Briscola
 * ---------------------------------------------------------------------------------------- */

interface BriscolaSim {
  hands: Card[][];
  deck: Card[];
  trick: TrickEntry[];
  turn: number;
  trump: number;
  n: number;
  mode: Mode;
  pts: number[];
}

function briscolaPolicy(st: Pick<BriscolaSim, 'hands' | 'trick' | 'trump' | 'n' | 'mode'>, p: number): Card {
  const hand = st.hands[p];
  const trick = st.trick;
  const trump = st.trump;
  const n = st.n;
  const isT = (c: Card) => suitOf(c) === trump;
  const cost = (c: Card) => bp(c) * 3 + (isT(c) ? 14 + bpw(c) : 0) + bpw(c) * 0.3;
  if (!trick.length) return minBy(hand, cost);
  const cur = winBriscola(trick, trump);
  const last = trick.length === n - 1;
  const tp = trick.reduce((a, e) => a + bp(e.c), 0);
  const mate = st.mode === '4' && cur.p % 2 === p % 2;
  if (mate) {
    const strong = last || (isT(cur.c) ? bpw(cur.c) >= 8 : bpw(cur.c) >= 9 && trick.length >= 2);
    if (strong) {
      const loads = hand.filter(c => !isT(c));
      if (loads.length) return minBy(loads, c => -bp(c));
    }
    return minBy(hand, cost);
  }
  const beats = hand.filter(c => winBriscola(trick.concat([{ p, c }]), trump).p === p);
  if (beats.length) {
    const same = beats.filter(c => !isT(c));
    if (same.length && (last || n === 2)) return minBy(same, c => -bp(c));
    if (same.length && tp + Math.max(...same.map(bp)) >= 10) return minBy(same, c => -bp(c));
    if (tp >= 10 || (last && tp >= 4)) return minBy(beats, c => (isT(c) ? 5 + bpw(c) + bp(c) * 2 : bp(c)));
  }
  return minBy(hand, cost);
}

function simBriscola(st: BriscolaSim, first: Card) {
  let c: Card | undefined = first;
  for (;;) {
    const p = st.turn;
    if (c === undefined) c = briscolaPolicy(st, p);
    const hh = st.hands[p];
    hh.splice(hh.indexOf(c), 1);
    st.trick.push({ p, c });
    c = undefined;
    if (st.trick.length === st.n) {
      const w = winBriscola(st.trick, st.trump).p;
      for (const e of st.trick) st.pts[w] += bp(e.c);
      st.trick = [];
      for (let k = 0; k < st.n; k++) {
        if (!st.deck.length) break;
        st.hands[(w + k) % st.n].push(st.deck.pop()!);
      }
      if (st.hands.every(x => !x.length)) return;
      st.turn = w;
    } else st.turn = (p + 1) % st.n;
  }
}

function chooseBriscola(m: Match, p: number, rng: Rng): Card {
  const h = m.h!;
  const hand = h.hands[p];
  if (hand.length === 1) return hand[0];
  const base = { hands: h.hands, trick: h.trick, trump: h.trump, n: m.n, mode: m.mode };
  if (m.level === 'facile') {
    if (rng() < 0.4) return hand[(rng() * hand.length) | 0];
    return briscolaPolicy(base, p);
  }
  const D = m.level === 'medio' ? 24 : 90;
  const n = m.n;
  const seen = new Set(h.played);
  hand.forEach(c => seen.add(c));
  h.trick.forEach(e => seen.add(e.c));
  // The face-up briscola is still at the bottom of the deck.
  const briscIn = h.deck.length > 0 && h.deck[0] === h.brisc;
  if (briscIn && h.brisc !== null) seen.add(h.brisc);
  const pool = ALL.filter(c => !seen.has(c));
  const need = h.hands.map((hh, q) => (q === p ? 0 : hh.length));
  const voids = h.hands.map(() => [false, false, false, false]);
  const score = new Float64Array(hand.length);
  for (let d = 0; d < D; d++) {
    const deal = dealPool(pool, need, h.deck.length - (briscIn ? 1 : 0), voids, p, rng);
    for (let i = 0; i < hand.length; i++) {
      const st: BriscolaSim = {
        hands: h.hands.map((hh, q) => (q === p ? hh.slice() : deal.out[q].slice())),
        deck: (briscIn && h.brisc !== null ? [h.brisc] : []).concat(deal.deck),
        trick: h.trick.map(e => ({ p: e.p, c: e.c })),
        turn: p,
        trump: h.trump,
        n,
        mode: m.mode,
        pts: new Array(n).fill(0),
      };
      simBriscola(st, hand[i]);
      let v = 0;
      for (let q = 0; q < n; q++) v += (m.mode === '4' ? q % 2 === p % 2 : q === p) ? st.pts[q] : -st.pts[q];
      score[i] += v;
    }
  }
  let bi = 0;
  for (let i = 1; i < hand.length; i++) if (score[i] > score[bi]) bi = i;
  return hand[bi];
}

/* ------------------------------------------------------------------------------------------
 * Scopa
 * ---------------------------------------------------------------------------------------- */

export function scopaMoves(hand: Card[], table: Card[]): Move[] {
  const mv: Move[] = [];
  for (const c of hand) {
    const o = scopaOptions(c, table);
    if (o.length) o.forEach(t => mv.push({ c, take: t }));
    else mv.push({ c, take: [] });
  }
  return mv;
}

function chooseScopa(m: Match, p: number, rng: Rng): Move {
  const h = m.h!;
  const hand = h.hands[p];
  const moves = scopaMoves(hand, h.table);
  if (m.level === 'facile' && rng() < 0.35) return moves[(rng() * moves.length) | 0];
  const lastPlay = !h.deck.length && h.hands.reduce((a, x) => a + x.length, 0) === 1;
  const visible = new Set(h.played.concat(h.table, hand));
  h.capt.forEach(cc => cc.forEach(c => visible.add(c)));
  const unseen = (v: number) => ALL.filter(c => sval(c) === v && !visible.has(c)).length;
  const expert = m.level === 'difficile';
  // How likely the opponent is to sweep, or to take the Settebello, from what is left on the table.
  const danger = (rest: Card[]) => {
    if (!rest.length) return 0;
    const sum = rest.reduce((a, x) => a + sval(x), 0);
    let d = 0;
    if (sum <= 10) {
      const u = expert ? unseen(sum) : 2;
      d += u ? 45 * Math.min(1, u / 2.5) : 0;
    }
    if (rest.includes(SETTEBELLO)) {
      const u = expert ? unseen(7) : 2;
      d += 12 * Math.min(1, u / 2);
    }
    rest.forEach(x => {
      if (rankOf(x) === 7) d += 2;
    });
    return d;
  };
  const val = (cs: Card[]) =>
    cs.length * 1.6 +
    cs.filter(x => suitOf(x) === 1).length * 3.5 +
    (cs.includes(SETTEBELLO) ? 30 : 0) +
    cs.filter(x => rankOf(x) === 7).length * 6 +
    cs.filter(x => rankOf(x) === 6).length * 2.5 +
    cs.filter(x => rankOf(x) === 1).length * 1.5;
  let best = moves[0];
  let bs = -1e9;
  for (const mv of moves) {
    let sc: number;
    const take = mv.take || [];
    if (take.length) {
      const rest = h.table.filter(x => !take.includes(x));
      sc = 10 + val(take.concat([mv.c]));
      if (!rest.length && !lastPlay) sc += 120;
      else sc -= danger(rest);
    } else {
      const rest = h.table.concat([mv.c]);
      sc = -danger(rest) - val([mv.c]) * 1.2 + (rankOf(mv.c) >= 8 ? 1.5 : 0);
    }
    sc += rng() * 0.5;
    if (sc > bs) {
      bs = sc;
      best = mv;
    }
  }
  return best;
}

/* ------------------------------------------------------------------------------------------ */

/** The computer's move for seat p, with its signal when it opens a trick in Tressette in four. */
export function chooseMove(m: Match, p: number, rng: Rng = defaultRng): Move {
  if (m.game === 'scopa') return chooseScopa(m, p, rng);
  if (m.game === 'briscola') return { c: chooseBriscola(m, p, rng) };
  const c = chooseTressette(m, p, rng);
  const sig = m.mode === '4' && !m.h!.trick.length ? cpuSignal(m, p, c) : null;
  return { c, sig };
}
