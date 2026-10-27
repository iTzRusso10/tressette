/**
 * Quando suonano le carte: funzioni pure, senza React, usate dal regista (`state/table.ts`).
 *
 * Una carta vola con `withTiming(…, { duration, easing: ease.in })`, cioè Easing.out(cubic): parte veloce e
 * rallenta. Al 62% del volo ha già fatto il 95% della strada e da lì scivola appena: è il momento in cui
 * "tocca il panno", e il suono deve partire lì, non quando la carta comincia a muoversi.
 */

/** Frazione del volo di una carta in cui atterra (1 − (1 − 0,62)³ ≈ 95% della strada). */
export const LAND = 0.62;

/** Millisecondi tra l'inizio di un file di carta e il suo colpo (HIT_MS in scripts/make-sounds.py). */
export const HIT = 5;

/**
 * Quanto ritarda un'animazione rispetto al passo del regista: il passo cambia lo stato, React ridisegna il
 * tavolo e solo allora Reanimated fa partire le carte (misurato sul web: 35-50 ms). Il suono aspetta
 * altrettanto: un suono che arriva prima della carta si nota molto più di uno che arriva un attimo dopo.
 */
export const LAG = 35;

/**
 * Distanza minima tra due suoni di distribuzione. Sotto i 45 ms l'orecchio non separa più i colpi:
 * in partita veloce (una carta ogni 29 ms) suona una carta sì e una no, e il ritmo resta quello del volo.
 */
export const DEAL_GAP = 45;

/** Dopo quanti millisecondi far partire il suono di una carta che parte tra `delayMs` e vola per `flightMs`. */
export function landAt(flightMs: number, delayMs = 0): number {
  return Math.max(0, Math.round(LAG + delayMs + flightMs * LAND - HIT));
}

/** Un suono che accompagna un movimento dall'inizio (mescolata, presa): parte con le carte. */
export const moveAt = (delayMs = 0) => Math.round(LAG + delayMs);

export interface DealTiming {
  /** Quando parte la prima carta (dopo la mescolata, a inizio mano). */
  startMs: number;
  /** Tra una carta e la successiva (T.dealCard, già moltiplicato per la velocità). */
  stepMs: number;
  /** Quanto dura il volo di una carta (dur.card, già moltiplicato per la velocità). */
  flightMs: number;
}

/** I momenti in cui suonano le carte distribuite: uno per carta che atterra, mai più fitti di DEAL_GAP. */
export function dealTimes(count: number, { startMs, stepMs, flightMs }: DealTiming): number[] {
  const out: number[] = [];
  let last = -Infinity;
  for (let i = 0; i < count; i++) {
    const at = landAt(flightMs, startMs + i * stepMs);
    if (at - last < DEAL_GAP) continue;
    out.push(at);
    last = at;
  }
  return out;
}
