import { supabase, supabaseConfigured } from '@/lib/supabase';
import { celebrateCoins, earn, useProfile } from './profile';
import { payout, winningSeats } from './stakes';

/** Matches already paid into / paid out of, so a reconnection never pays twice. */
const paidIn = new Set<string>();
const paidOut = new Set<string>();

const signedIn = () => supabaseConfigured && !!useProfile.getState().account;

/** At the start of an online match with a stake: your coins go into the pot. */
export function payIn(matchId: string, stake: number): boolean {
  if (!stake || paidIn.has(matchId)) return true;
  const have = useProfile.getState().coins;
  if (have < stake) return false;
  paidIn.add(matchId);
  useProfile.setState({ coins: have - stake });
  if (signedIn())
    supabase()
      .rpc('stake_in', { p_match: matchId, p_stake: stake })
      .then(({ data }) => typeof data === 'number' && useProfile.setState({ coins: data }));
  return true;
}

/**
 * At the end: your share of the pot. With accounts the server pays once most players report the same
 * winners; the device shows the result straight away.
 */
export function payOut(o: {
  matchId: string;
  stake: number;
  mode: '2' | '4' | 'perdere';
  n: number;
  me: number;
  payers: number[];
  winnerTeams: number[];
  peerOf: (seat: number) => string | undefined;
}) {
  if (!o.stake || !paidIn.has(o.matchId) || paidOut.has(o.matchId)) return;
  paidOut.add(o.matchId);
  const winners = winningSeats(o.mode, o.n, o.winnerTeams);
  const mine = payout(o.stake, o.n, o.payers, winners)[o.me];
  if (signedIn()) {
    const ids = winners
      .filter(p => o.payers.includes(p))
      .map(o.peerOf)
      .filter((x): x is string => !!x);
    supabase()
      .rpc('stake_report', { p_match: o.matchId, p_winners: ids })
      .then(({ data }) => typeof data === 'number' && useProfile.setState({ coins: data }));
    if (mine) {
      useProfile.setState(s => ({ coins: s.coins + mine }));
      celebrateCoins(mine, 'Piatto vinto');
    }
  } else if (mine) {
    earn(mine);
    celebrateCoins(mine, 'Piatto vinto');
  }
}
