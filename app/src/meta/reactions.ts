// Le reazioni veloci al tavolo online: frasi già pronte, niente chat libera. Un limite per chi le
// manda e uno per chi le riceve, così nessuno può riempire il tavolo di messaggi.

export interface Reaction {
  id: string;
  text: string;
}

export const REACTIONS: Reaction[] = [
  { id: 'ciao', text: 'Ciao a tutti!' },
  { id: 'bravo', text: 'Bella giocata!' },
  { id: 'fortuna', text: 'Che fortuna!' },
  { id: 'pensa', text: 'Fammi pensare…' },
  { id: 'ops', text: 'Ops!' },
  { id: 'dai', text: 'Forza!' },
  { id: 'grazie', text: 'Grazie!' },
  { id: 'gg', text: 'Bella partita!' },
];

export const reactionById = (id: string) => REACTIONS.find(r => r.id === id);

export const REACT_LIMIT = {
  /** Tra due reazioni mandate. */
  cooldownMs: 2500,
  /** Al massimo tante in una finestra. */
  burst: 5,
  windowMs: 30000,
  /** Da uno stesso posto se ne mostra al massimo una ogni tanto (contro chi aggira il limite). */
  perSeatMs: 1500,
};

/** Si può mandare una reazione adesso? `sent` sono gli istanti delle ultime mandate. */
export function canSend(sent: number[], now: number): boolean {
  const recent = sent.filter(t => now - t < REACT_LIMIT.windowMs);
  if (recent.length >= REACT_LIMIT.burst) return false;
  const last = recent[recent.length - 1];
  return last === undefined || now - last >= REACT_LIMIT.cooldownMs;
}

/** Si mostra una reazione arrivata da un posto? Solo se è una delle frasi e non arriva troppo presto. */
export function canShow(id: string, lastAt: number | undefined, now: number): boolean {
  return !!reactionById(id) && (lastAt === undefined || now - lastAt >= REACT_LIMIT.perSeatMs);
}
