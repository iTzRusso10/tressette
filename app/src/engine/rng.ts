export type Rng = () => number;

/** Small seedable generator (mulberry32): tests and replays get the same deal every time. */
export function seeded(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const defaultRng: Rng = Math.random;

export function shuffle<T>(a: T[], rng: Rng): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = (rng() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function minBy<T>(list: readonly T[], f: (x: T) => number): T {
  let best = list[0];
  let k = f(best);
  for (let i = 1; i < list.length; i++) {
    const v = f(list[i]);
    if (v < k) {
      k = v;
      best = list[i];
    }
  }
  return best;
}
