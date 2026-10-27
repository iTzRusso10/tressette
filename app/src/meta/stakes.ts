/**
 * Online stakes. Every person at the table puts the stake into the pot when the match starts
 * (computer seats neither pay nor win); at the end the pot is split among the people who won.
 * If only computer seats won, everyone gets their stake back.
 */

/** Seats that share the win: in four a coppie, the two partners; otherwise the single winners. */
export function winningSeats(mode: '2' | '4' | 'perdere', n: number, winnerTeams: number[]): number[] {
  const seats = Array.from({ length: n }, (_, i) => i);
  return seats.filter(p => winnerTeams.includes(mode === '4' ? p % 2 : p));
}

/** What each seat gets back from the pot. `payers` are the seats of the people who paid in. */
export function payout(stake: number, n: number, payers: number[], winners: number[]): number[] {
  const pot = stake * payers.length;
  const paid = winners.filter(p => payers.includes(p));
  if (!paid.length) return Array.from({ length: n }, (_, p) => (payers.includes(p) ? stake : 0));
  const share = Math.floor(pot / paid.length);
  return Array.from({ length: n }, (_, p) => (paid.includes(p) ? share : 0));
}

/** A pot is paid out once more than half of the people who paid in report the same winners. */
export function agreed(paidIn: number, reports: string[][]): string[] | null {
  const counts = new Map<string, { n: number; w: string[] }>();
  for (const r of reports) {
    const key = r.slice().sort().join(',');
    const c = counts.get(key) ?? { n: 0, w: r };
    c.n++;
    counts.set(key, c);
  }
  for (const c of counts.values()) if (c.n * 2 > paidIn) return c.w;
  return null;
}
