// Gli achievement: obiettivi precisi, divisi per categoria e per difficoltà. Ognuno paga monete ed
// esperienza; i più difficili anche un oggetto che nel negozio non si trova.
//
// Gli id dei primi traguardi (prima-vittoria, prima-scopa, napoletana…) sono quelli delle vecchie
// medaglie: chi le aveva le ritrova completate.

import type { GameId } from '../engine/types.ts';
import { reqMet, type Req, type ReqView } from './reqs.ts';

export type AchievementCategory =
  | 'prime'
  | 'vittorie'
  | 'serie'
  | 'partite'
  | 'arene'
  | 'trofei'
  | 'scopa'
  | 'briscola'
  | 'tressette'
  | 'tavolini'
  | 'panni'
  | 'dorsi'
  | 'set'
  | 'missioni'
  | 'stagioni'
  | 'sfide';

export const ACHIEVEMENT_CATEGORIES: { id: AchievementCategory; name: string }[] = [
  { id: 'prime', name: 'Prime partite' },
  { id: 'vittorie', name: 'Vittorie' },
  { id: 'serie', name: 'Vittorie di fila' },
  { id: 'partite', name: 'Partite e giorni' },
  { id: 'arene', name: 'Arene' },
  { id: 'trofei', name: 'Trofei' },
  { id: 'scopa', name: 'Scopa' },
  { id: 'briscola', name: 'Briscola' },
  { id: 'tressette', name: 'Tressette' },
  { id: 'tavolini', name: 'Tavolini' },
  { id: 'panni', name: 'Panni' },
  { id: 'dorsi', name: 'Dorsi' },
  { id: 'set', name: 'Set e collezione' },
  { id: 'missioni', name: 'Missioni' },
  { id: 'stagioni', name: 'Stagioni' },
  { id: 'sfide', name: 'Sfide' },
];

/** Difficoltà: decide la ricompensa e il colore della medaglia. */
export type Tier = 'bronzo' | 'argento' | 'oro' | 'platino';

const PAY: Record<Tier, { coins: number; xp: number }> = {
  bronzo: { coins: 100, xp: 50 },
  argento: { coins: 250, xp: 120 },
  oro: { coins: 500, xp: 250 },
  platino: { coins: 1000, xp: 500 },
};

export interface Achievement {
  id: string;
  name: string;
  category: AchievementCategory;
  tier: Tier;
  req: Req;
  coins: number;
  xp: number;
  /** Oggetti esclusivi (chiavi del catalogo). */
  items?: string[];
}

const list: Achievement[] = [];
const A = (id: string, name: string, category: AchievementCategory, tier: Tier, req: Req, items?: string[]) => {
  list.push({ id, name, category, tier, req, ...PAY[tier], ...(items ? { items } : {}) });
};

/* ---------------------------------------------------------------- prime partite */
A('prima-partita', 'Prima partita', 'prime', 'bronzo', { k: 'stat', key: 'played', n: 1 });
A('prima-vittoria', 'Prima Vittoria', 'prime', 'bronzo', { k: 'stat', key: 'won', n: 1 });
A('primo-tressette', 'Primo Tressette', 'prime', 'bronzo', { k: 'game', game: 'tressette', what: 'played', n: 1 });
A('prima-briscola', 'Prima Briscola', 'prime', 'bronzo', { k: 'game', game: 'briscola', what: 'played', n: 1 });
A('prima-a-scopa', 'Prima a Scopa', 'prime', 'bronzo', { k: 'game', game: 'scopa', what: 'played', n: 1 });
A('primo-in-quattro', 'In quattro al tavolo', 'prime', 'bronzo', { k: 'stat', key: 'played4', n: 1 });
A('prima-a-perdere', 'Il gusto di perdere', 'prime', 'bronzo', { k: 'stat', key: 'perderePlayed', n: 1 });
A('amici', 'Al tavolo con gli amici', 'prime', 'bronzo', { k: 'stat', key: 'onlinePlayed', n: 1 });
A('tuttofare', 'Tuttofare', 'prime', 'argento', { k: 'allGames', what: 'won', n: 1 });

/* ---------------------------------------------------------------- vittorie totali */
A('dieci-vittorie', 'Dieci vittorie', 'vittorie', 'bronzo', { k: 'stat', key: 'won', n: 10 });
A('venticinque-vittorie', 'Venticinque vittorie', 'vittorie', 'bronzo', { k: 'stat', key: 'won', n: 25 });
A('cinquanta-vittorie', 'Cinquanta vittorie', 'vittorie', 'argento', { k: 'stat', key: 'won', n: 50 });
A('cento-vittorie', 'Mani Esperte', 'vittorie', 'argento', { k: 'stat', key: 'won', n: 100 }, ['back:leone-d-oro']);
A('duecentocinquanta-vittorie', 'Duecentocinquanta vittorie', 'vittorie', 'oro', { k: 'stat', key: 'won', n: 250 });
A('veterano-del-tavolo', 'Veterano del Tavolo', 'vittorie', 'oro', { k: 'stat', key: 'won', n: 500 }, ['table:il-mito']);
A('maestro-delle-carte', 'Maestro delle Carte', 'vittorie', 'platino', { k: 'stat', key: 'won', n: 1000 }, ['back:maestro-eterno']);
A('duemilacinquecento-vittorie', 'Duemilacinquecento vittorie', 'vittorie', 'platino', { k: 'stat', key: 'won', n: 2500 });
A('leggenda-del-circolo', 'Leggenda del Circolo', 'vittorie', 'platino', { k: 'stat', key: 'won', n: 5000 }, ['felt:trionfo-eterno']);
A('dieci-in-quattro', 'Buona coppia', 'vittorie', 'bronzo', { k: 'stat', key: 'won4', n: 10 });
A('cento-in-quattro', 'Coppia affiatata', 'vittorie', 'oro', { k: 'stat', key: 'won4', n: 100 });

/* ---------------------------------------------------------------- vittorie di fila */
A('tris-vittorie', 'Tris di vittorie', 'serie', 'bronzo', { k: 'stat', key: 'bestStreak', n: 3 });
A('cinque-di-fila', 'Cinque di fila', 'serie', 'argento', { k: 'stat', key: 'bestStreak', n: 5 });
A('imbattibile', 'Sempre in Piedi', 'serie', 'oro', { k: 'stat', key: 'bestStreak', n: 10 }, ['back:spada-eterna']);
A('quindici-di-fila', 'Quindici di fila', 'serie', 'oro', { k: 'stat', key: 'bestStreak', n: 15 });
A('venti-di-fila', 'Venti di fila', 'serie', 'platino', { k: 'stat', key: 'bestStreak', n: 20 });
A('imbattibile-25', 'Imbattibile', 'serie', 'platino', { k: 'stat', key: 'bestStreak', n: 25 }, ['table:fiamma-dorata']);
A('tre-esperto-di-fila', 'Tre volte l’Esperto', 'serie', 'argento', { k: 'stat', key: 'bestExpertStreak', n: 3 });
A('cinque-esperto-di-fila', 'Cinque volte l’Esperto', 'serie', 'oro', { k: 'stat', key: 'bestExpertStreak', n: 5 });
A('dieci-esperto-di-fila', 'Dieci volte l’Esperto', 'serie', 'platino', { k: 'stat', key: 'bestExpertStreak', n: 10 });

/* ---------------------------------------------------------------- partite e giorni */
A('dieci-partite', 'Dieci partite', 'partite', 'bronzo', { k: 'stat', key: 'played', n: 10 });
A('cinquanta-partite', 'Cinquanta partite', 'partite', 'bronzo', { k: 'stat', key: 'played', n: 50 });
A('cento-partite', 'Cento partite', 'partite', 'argento', { k: 'stat', key: 'played', n: 100 });
A('duecentocinquanta-partite', 'Duecentocinquanta partite', 'partite', 'argento', { k: 'stat', key: 'played', n: 250 });
A('cinquecento-partite', 'Cinquecento partite', 'partite', 'oro', { k: 'stat', key: 'played', n: 500 });
A('il-veterano', 'Il Veterano', 'partite', 'oro', { k: 'stat', key: 'played', n: 1000 }, ['back:l-ultima-partita']);
A('duemilacinquecento-partite', 'Duemilacinquecento partite', 'partite', 'platino', { k: 'stat', key: 'played', n: 2500 });
A('cinquemila-partite', 'Cinquemila partite', 'partite', 'platino', { k: 'stat', key: 'played', n: 5000 });
A('cento-mani', 'Cento mani', 'partite', 'bronzo', { k: 'stat', key: 'hands', n: 100 });
A('mille-mani', 'Mille mani', 'partite', 'argento', { k: 'stat', key: 'hands', n: 1000 });
A('diecimila-mani', 'Diecimila mani', 'partite', 'platino', { k: 'stat', key: 'hands', n: 10000 });
A('di-casa', 'Di casa', 'partite', 'argento', { k: 'stat', key: 'bonusStreak', n: 7 });
A('fedelissimo', 'Fedelissimo', 'partite', 'oro', { k: 'stat', key: 'bonusStreak', n: 30 });
A('sette-giorni', 'Una settimana al tavolo', 'partite', 'bronzo', { k: 'stat', key: 'days', n: 7 });
A('trenta-giorni', 'Un mese al tavolo', 'partite', 'argento', { k: 'stat', key: 'days', n: 30 });
A('cento-giorni', 'Cento giorni al tavolo', 'partite', 'oro', { k: 'stat', key: 'days', n: 100 });
A('un-anno', 'Un anno al tavolo', 'partite', 'platino', { k: 'stat', key: 'days', n: 365 });

/* ---------------------------------------------------------------- arene */
for (const [n, name, tier] of [
  [3, 'Tra gli amici', 'bronzo'],
  [6, 'Fine delle origini', 'argento'],
  [9, 'Nel Palazzo delle Carte', 'argento'],
  [12, 'Tra i campioni', 'oro'],
  [15, 'A palazzo', 'oro'],
  [18, 'Sul trono delle carte', 'oro'],
  [21, 'Nella fortezza', 'platino'],
  [24, 'Tra gli immortali', 'platino'],
  [27, 'Davanti al trono', 'platino'],
  [30, 'La cima', 'platino'],
] as [number, string, Tier][])
  A(`arena-${n}`, name, 'arene', tier, { k: 'arena', n });
A('leggenda-1', 'Oltre la cima', 'arene', 'oro', { k: 'legend', n: 1 });
A('leggenda-5', 'Leggenda V', 'arene', 'platino', { k: 'legend', n: 5 });
A('leggenda-10', 'Leggenda X', 'arene', 'platino', { k: 'legend', n: 10 });

/* ---------------------------------------------------------------- trofei */
for (const [n, tier] of [
  [250, 'bronzo'],
  [500, 'bronzo'],
  [1000, 'argento'],
  [1500, 'argento'],
  [2000, 'oro'],
  [2500, 'oro'],
  [3000, 'platino'],
  [3500, 'platino'],
  [4000, 'platino'],
  [5000, 'platino'],
] as [number, Tier][])
  A(`trofei-${n}`, `${n.toLocaleString('it-IT')} trofei`, 'trofei', tier, { k: 'best', n });
A('trofei-vinti-1000', 'Mille trofei vinti', 'trofei', 'argento', { k: 'stat', key: 'trophiesWon', n: 1000 });
A('trofei-vinti-10000', 'Diecimila trofei vinti', 'trofei', 'platino', { k: 'stat', key: 'trophiesWon', n: 10000 });

/* ---------------------------------------------------------------- per gioco: vittorie */
const GAME_NAMES: Record<GameId, string> = { tressette: 'Tressette', briscola: 'Briscola', scopa: 'Scopa' };
const BIG: Record<GameId, [string, string]> = {
  scopa: ['Re della Scopa', 'back:il-re-delle-carte'],
  briscola: ['Asso di Briscola', 'table:corona-del-re'],
  tressette: ['Maestro del Tressette', 'felt:il-grande-maestro'],
};
for (const g of ['scopa', 'briscola', 'tressette'] as GameId[]) {
  const name = GAME_NAMES[g];
  A(`${g}-10`, `${name}: dieci vittorie`, g, 'bronzo', { k: 'game', game: g, what: 'won', n: 10 });
  A(`${g}-50`, `${name}: cinquanta vittorie`, g, 'argento', { k: 'game', game: g, what: 'won', n: 50 });
  A(`${g}-100`, `Campione di ${name}`, g, 'oro', { k: 'game', game: g, what: 'won', n: 100 });
  A(`${g}-500`, BIG[g][0], g, 'platino', { k: 'game', game: g, what: 'won', n: 500 }, [BIG[g][1]]);
  A(`${g}-1000`, `${name}: mille vittorie`, g, 'platino', { k: 'game', game: g, what: 'won', n: 1000 });
  A(`${g}-esperto-25`, `${name} contro l’Esperto`, g, 'oro', { k: 'game', game: g, what: 'expert', n: 25 });
}

/* ---------------------------------------------------------------- Scopa */
A('prima-scopa', 'Prima scopa', 'scopa', 'bronzo', { k: 'stat', key: 'scope', n: 1 });
A('dieci-scope', 'Dieci scope', 'scopa', 'bronzo', { k: 'stat', key: 'scope', n: 10 });
A('spazzino', 'Spazzino', 'scopa', 'argento', { k: 'stat', key: 'scope', n: 50 });
A('scope-250', 'Scopa di saggina', 'scopa', 'oro', { k: 'stat', key: 'scope', n: 250 });
A('scope-1000', 'Mille scope', 'scopa', 'platino', { k: 'stat', key: 'scope', n: 1000 });
A('tre-scope-mano', 'Tre scope in una mano', 'scopa', 'argento', { k: 'stat', key: 'maxScopeHand', n: 3 });
A('cinque-scope-mano', 'Cinque scope in una mano', 'scopa', 'platino', { k: 'stat', key: 'maxScopeHand', n: 5 });
A('settebello-primo', 'Il Settebello', 'scopa', 'bronzo', { k: 'stat', key: 'settebelli', n: 1 });
A('settebello', 'Collezionista di Settebelli', 'scopa', 'argento', { k: 'stat', key: 'settebelli', n: 10 });
A('settebello-100', 'Cento Settebelli', 'scopa', 'oro', { k: 'stat', key: 'settebelli', n: 100 });
A('tutti-i-denari', 'Tutti i denari', 'scopa', 'oro', { k: 'stat', key: 'allDenari', n: 1 });
A('mano-perfetta', 'Mano Perfetta', 'scopa', 'oro', { k: 'stat', key: 'perfectScopa', n: 1 }, ['felt:la-mano-perfetta', 'back:la-mano-perfetta']);
A('mano-perfetta-10', 'Dieci mani perfette', 'scopa', 'platino', { k: 'stat', key: 'perfectScopa', n: 10 });

/* ---------------------------------------------------------------- Briscola */
A('briscola-80', 'Ottanta punti', 'briscola', 'bronzo', { k: 'stat', key: 'briscolaBest', n: 80 });
A('briscola-100', 'Cento punti', 'briscola', 'argento', { k: 'stat', key: 'briscola100', n: 1 });
A('briscola-100-x10', 'Dieci volte cento', 'briscola', 'oro', { k: 'stat', key: 'briscola100', n: 10 });
A('briscola-120', 'Tutto il mazzo', 'briscola', 'platino', { k: 'stat', key: 'briscola120', n: 1 });
A('briscola-mani-100', 'Cento mani di Briscola', 'briscola', 'argento', { k: 'stat', key: 'briscolaHandsWon', n: 100 });
A('briscola-mani-500', 'Cinquecento mani di Briscola', 'briscola', 'oro', { k: 'stat', key: 'briscolaHandsWon', n: 500 });

/* ---------------------------------------------------------------- Tressette */
A('napoletana', 'Napoletana', 'tressette', 'bronzo', { k: 'stat', key: 'napoletane', n: 1 });
A('napoletane-10', 'Dieci Napoletane', 'tressette', 'argento', { k: 'stat', key: 'napoletane', n: 10 });
A('napoletane-50', 'Cinquanta Napoletane', 'tressette', 'oro', { k: 'stat', key: 'napoletane', n: 50 });
A('accusi-25', 'Venticinque accusi', 'tressette', 'argento', { k: 'stat', key: 'accusi', n: 25 });
A('accusi-100', 'Cento accusi', 'tressette', 'oro', { k: 'stat', key: 'accusi', n: 100 });
A('ultima-50', 'L’ultima è mia', 'tressette', 'argento', { k: 'stat', key: 'ultime', n: 50 });
A('ultima-250', 'Sempre l’ultima', 'tressette', 'oro', { k: 'stat', key: 'ultime', n: 250 });
A('meno-peggio', 'Il meno peggio', 'tressette', 'bronzo', { k: 'stat', key: 'perdereWins', n: 1 });
A('perdere-10', 'Dieci a perdere', 'tressette', 'argento', { k: 'stat', key: 'perdereWins', n: 10 });
A('perdere-50', 'Cinquanta a perdere', 'tressette', 'oro', { k: 'stat', key: 'perdereWins', n: 50 });
A('cappotto', 'Cappotto!', 'tressette', 'argento', { k: 'stat', key: 'cappotti', n: 1 });
A('cappotto-10', 'Dieci cappotti', 'tressette', 'platino', { k: 'stat', key: 'cappotti', n: 10 });

/* ---------------------------------------------------------------- collezione */
for (const [n, tier] of [
  [3, 'bronzo'],
  [5, 'bronzo'],
  [10, 'argento'],
  [20, 'oro'],
  [30, 'platino'],
  [40, 'platino'],
] as [number, Tier][])
  A(`tavolini-${n}`, n === 20 ? 'Arredatore Reale' : n === 40 ? 'Quaranta tavolini' : `${n} tavolini`, 'tavolini', tier, { k: 'owned', slot: 'table', n }, n === 20 ? ['table:il-multiverso'] : undefined);
for (const [n, tier] of [
  [3, 'bronzo'],
  [10, 'argento'],
  [20, 'oro'],
  [30, 'oro'],
  [45, 'platino'],
  [60, 'platino'],
] as [number, Tier][])
  A(`panni-${n}`, n === 30 ? 'Signore dei Panni' : n === 60 ? 'Sessanta panni' : `${n} panni`, 'panni', tier, { k: 'owned', slot: 'felt', n }, n === 30 ? ['felt:corona-degli-assi'] : undefined);
for (const [n, tier] of [
  [3, 'bronzo'],
  [10, 'argento'],
  [20, 'oro'],
  [30, 'oro'],
  [45, 'platino'],
  [60, 'platino'],
] as [number, Tier][])
  A(`dorsi-${n}`, n === 30 ? 'Custode delle Carte' : n === 60 ? 'Sessanta dorsi' : `${n} dorsi`, 'dorsi', tier, { k: 'owned', slot: 'back', n }, n === 30 ? ['back:l-origine'] : undefined);
A('collezionista-25', 'Il Collezionista', 'set', 'argento', { k: 'owned', n: 25 }, ['back:stemmi-antichi']);
A('collezionista-50', 'Collezionista appassionato', 'set', 'oro', { k: 'owned', n: 50 });
A('gran-collezionista', 'Il Gran Collezionista', 'set', 'platino', { k: 'owned', n: 100 }, ['table:diamante-eterno']);
A('collezionista-150', 'La collezione completa', 'set', 'platino', { k: 'owned', n: 150 });
A('set-1', 'Primo set', 'set', 'argento', { k: 'sets', n: 1 });
A('set-3', 'Tre set', 'set', 'oro', { k: 'sets', n: 3 });
A('set-5', 'Cinque set', 'set', 'oro', { k: 'sets', n: 5 });
A('set-10', 'Dieci set', 'set', 'platino', { k: 'sets', n: 10 });
A('set-15', 'Tutti i set', 'set', 'platino', { k: 'sets', n: 15 });
A('mecenate', 'Mecenate', 'set', 'oro', { k: 'stat', key: 'coinsSpent', n: 100000 });

/* ---------------------------------------------------------------- missioni */
for (const [n, name, tier, items] of [
  [1, 'Prima missione', 'bronzo', undefined],
  [10, 'Dieci missioni', 'bronzo', undefined],
  [50, 'Cinquanta missioni', 'argento', ['back:chiave-del-regno']],
  [100, 'Cento missioni', 'oro', ['back:rosa-dei-nobili']],
  [250, 'Maestro delle Missioni', 'platino', ['table:fenice-eterna']],
  [500, 'Cinquecento missioni', 'platino', undefined],
] as [number, string, Tier, string[] | undefined][])
  A(`missioni-${n}`, name, 'missioni', tier, { k: 'stat', key: 'missionsDone', n }, items);
for (const [n, tier] of [
  [1, 'bronzo'],
  [10, 'argento'],
  [25, 'oro'],
  [50, 'platino'],
] as [number, Tier][])
  A(`settimanali-${n}`, n === 1 ? 'Prima settimana' : `${n} missioni settimanali`, 'missioni', tier, { k: 'stat', key: 'weeklyDone', n });

/* ---------------------------------------------------------------- stagioni */
A('stagione-1', 'Prima stagione', 'stagioni', 'bronzo', { k: 'stat', key: 'seasonsPlayed', n: 1 });
A('stagione-3', 'Tre stagioni', 'stagioni', 'argento', { k: 'stat', key: 'seasonsPlayed', n: 3 });
A('stagione-6', 'Sei stagioni', 'stagioni', 'oro', { k: 'stat', key: 'seasonsPlayed', n: 6 });
A('stagione-top-100', 'Tra i primi cento', 'stagioni', 'oro', { k: 'seasonRank', n: 100 });
A('stagione-top-10', 'Tra i primi dieci', 'stagioni', 'platino', { k: 'seasonRank', n: 10 });
A('stagione-primo', 'Primo della stagione', 'stagioni', 'platino', { k: 'seasonRank', n: 1 });
A('stagione-cosmetico-1', 'Ricordo di stagione', 'stagioni', 'argento', { k: 'seasonItems', n: 1 });
A('stagione-cosmetico-3', 'Collezionista di Stagione', 'stagioni', 'oro', { k: 'seasonItems', n: 3 });
A('stagione-cosmetico-6', 'Tutte le stagioni', 'stagioni', 'platino', { k: 'seasonItems', n: 6 });

/* ---------------------------------------------------------------- sfide */
A('esperto', 'Batti l’Esperto', 'sfide', 'argento', { k: 'stat', key: 'expertWins', n: 1 });
A('esperto-10', 'Dieci volte l’Esperto', 'sfide', 'argento', { k: 'stat', key: 'expertWins', n: 10 });
A('esperto-50', 'Cinquanta volte l’Esperto', 'sfide', 'oro', { k: 'stat', key: 'expertWins', n: 50 });
A('esperto-100', 'Cento volte l’Esperto', 'sfide', 'platino', { k: 'stat', key: 'expertWins', n: 100 });
A('esperto-250', 'Il terrore dell’Esperto', 'sfide', 'platino', { k: 'stat', key: 'expertWins', n: 250 }, ['table:cuore-di-drago']);
A('tripla-corona', 'Tripla Corona', 'sfide', 'platino', { k: 'allGames', what: 'expert', n: 50 }, ['felt:i-tre-semi']);
A('online-10', 'Dieci vittorie online', 'sfide', 'argento', { k: 'stat', key: 'onlineWins', n: 10 });
A('online-50', 'Cinquanta vittorie online', 'sfide', 'oro', { k: 'stat', key: 'onlineWins', n: 50 });
A('online-100', 'Cento vittorie online', 'sfide', 'platino', { k: 'stat', key: 'onlineWins', n: 100 });
A('perfezionista', 'Perfezionista', 'sfide', 'oro', { k: 'achievements', n: 50 }, ['felt:destino']);
A('cacciatore-di-sfide', 'Cacciatore di Sfide', 'sfide', 'platino', { k: 'achievements', n: 100 }, ['table:trono-celeste']);
A('il-senza-pari', 'Il Senza Pari', 'sfide', 'platino', { k: 'achievements', n: 150 });
A('livello-25', 'Livello 25', 'sfide', 'argento', { k: 'level', n: 25 });
A('livello-50', 'Livello 50', 'sfide', 'oro', { k: 'level', n: 50 });
A('livello-100', 'Livello 100', 'sfide', 'platino', { k: 'level', n: 100 });
A('prestigio-1', 'Primo Prestigio', 'sfide', 'platino', { k: 'prestige', n: 1 });

export const ACHIEVEMENTS: Achievement[] = list;

const byId = new Map(ACHIEVEMENTS.map(a => [a.id, a]));
export const achievementById = (id: string) => byId.get(id);

/** Achievement raggiunti con questo stato e non ancora segnati come completati. */
export const newlyUnlocked = (v: ReqView, have: Record<string, number>) => ACHIEVEMENTS.filter(a => !have[a.id] && reqMet(a.req, v));
