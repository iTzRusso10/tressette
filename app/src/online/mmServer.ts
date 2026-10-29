// La coda del matchmaking sul server (supabase/migrations/…_matchmaking.sql).
import { supabase } from '@/lib/supabase';
import { parse, seatsOf, type Matchmaker, type MmRequest } from './matchmaking';

/** La coda vera, sul server. */
export class SupabaseMatchmaker implements Matchmaker {
  async join(r: MmRequest, _me: string, name: string) {
    const { data, error } = await supabase().rpc('mm_join', { p_kind: r.kind, p_game: r.game, p_mode: r.mode, p_seats: seatsOf(r), p_name: name });
    if (error) throw error;
    return parse(data);
  }
  async poll() {
    const { data, error } = await supabase().rpc('mm_poll');
    if (error) throw error;
    return parse(data);
  }
  async cancel() {
    await supabase().rpc('mm_cancel');
  }
}
