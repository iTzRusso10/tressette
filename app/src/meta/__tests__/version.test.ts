// La versione delle regole (LEDGER_VERSION) deve cambiare quando cambiano regole o catalogo: il telefono
// adotta lo stato del server solo se il server ha almeno la sua versione.
import { describe, expect, it } from 'vitest';
import * as ACHIEVEMENTS from '../achievements';
import * as ARENAS from '../arenas';
import * as AVATARS from '../avatars';
import * as BALANCE from '../balance';
import * as CATALOG from '../catalog';
import * as ECONOMY from '../economy';
import * as EVENTS from '../events';
import * as LEDGER from '../ledger';
import * as LEVELS from '../levels';
import * as MISSIONS from '../missions';
import * as PROGRESS from '../progress';
import * as RATING from '../rating';
import * as REQS from '../reqs';
import * as REWARDS from '../rewards';
import * as SEASONS from '../seasons';
import * as SETS from '../sets';
import * as SHOP from '../shop';
import * as TITLES from '../titles';

const { LEDGER_VERSION, ...LEDGER_RULES } = LEDGER;

/** Un'impronta di tutto ciò che decide la progressione: il codice delle regole, il catalogo, i numeri. */
function rulesFingerprint(): string {
  const modules = { ACHIEVEMENTS, ARENAS, AVATARS, BALANCE, CATALOG, ECONOMY, EVENTS, LEDGER_RULES, LEVELS, MISSIONS, PROGRESS, RATING, REQS, REWARDS, SEASONS, SETS, SHOP, TITLES };
  const src = JSON.stringify(
    Object.fromEntries(Object.entries(modules).map(([k, m]) => [k, { ...m }])),
    (_k, v) => (typeof v === 'function' ? String(v).replace(/\s+/g, '') : v),
  );
  let h = 2166136261;
  for (let i = 0; i < src.length; i++) {
    h ^= src.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

/**
 * L'impronta di ogni versione. Se il test fallisce hai cambiato regole o catalogo: aumenta
 * LEDGER_VERSION in ledger.ts, scrivi qui la nuova impronta e ridistribuisci la funzione progress.
 */
const FINGERPRINTS: Record<number, string> = { 1: '9ad1e9af', 2: '3af144bf', 3: '1b1c88fc' };

describe('versione delle regole', () => {
  it('cambia insieme alle regole (così un server vecchio non sovrascrive il telefono)', () => {
    expect(rulesFingerprint(), `regole cambiate: porta LEDGER_VERSION a ${LEDGER_VERSION + 1} e ridistribuisci la funzione progress`).toBe(FINGERPRINTS[LEDGER_VERSION]);
  });
});
