// Trofei e arene: la strada del gioco. Funzioni pure, condivise con il server.
//
// 30 arene in cinque capitoli, una ogni 100 trofei (da 0 a 2900). I trofei non si azzerano mai: la
// soglia di un'arena è cumulativa e, una volta raggiunta, non si scende sotto il suo primo trofeo.
// Alcune arene avanzate chiedono anche un requisito (un livello, vittorie contro l'Esperto…): finché
// manca, i trofei continuano a contare ma l'arena resta chiusa. Dopo la trentesima si sale di grado
// nella Leggenda, ogni 200 trofei, senza fine.

import type { Level } from '../engine/types.ts';
import { BALANCE } from './balance.ts';
import { legendOf, reqMet, type Req, type ReqView } from './reqs.ts';

export interface Reward {
  coins?: number;
  /** Oggetti, come chiavi del catalogo («table:legno-di-casa»). */
  items?: string[];
  /** Id di un titolo (titles.ts). */
  title?: string;
}

export interface Chapter {
  /** 1…5. */
  n: number;
  name: string;
  /** Il mondo visivo del capitolo (ArenaScene.tsx). */
  world: 'borgo' | 'circolo' | 'reggia' | 'santuario' | 'olimpo';
}

export const CHAPTERS: Chapter[] = [
  { n: 1, name: 'Le origini', world: 'borgo' },
  { n: 2, name: 'I giocatori esperti', world: 'circolo' },
  { n: 3, name: 'Il prestigio', world: 'reggia' },
  { n: 4, name: 'I maestri', world: 'santuario' },
  { n: 5, name: 'Le leggende', world: 'olimpo' },
];

export interface Arena {
  /** 0…29. */
  index: number;
  /** 1…30, il numero che si vede. */
  n: number;
  id: string;
  name: string;
  desc: string;
  chapter: Chapter;
  /** Trofei per entrare (cumulativi). */
  threshold: number;
  /** Requisito in più, per alcune arene avanzate. */
  requires?: Req;
  reward: Reward;
  /** L'ultima arena del suo capitolo: completa il capitolo. */
  chapterEnd: boolean;
}

type Def = [id: string, name: string, desc: string, reward: Reward, requires?: Req];

const DEFS: Def[] = [
  // I — Le origini
  ['bar-del-paese', 'Il Bar del Paese', 'Un tavolino accanto al bancone: si comincia da qui.', {}],
  ['piazza-del-borgo', 'La Piazza del Borgo', 'All’ombra del campanile, tra una partita e l’altra.', { items: ['table:legno-di-casa'] }],
  ['circolo-degli-amici', 'Il Circolo degli Amici', 'Le sedie impagliate e il mazzo che passa di mano.', { coins: 300 }],
  ['taverna-del-moro', 'La Taverna del Moro', 'Volte di pietra, botti e lanterne.', { items: ['back:rosso-tradizionale'] }],
  ['caffe-delle-carte', 'Il Caffè delle Carte', 'Specchi, marmo e il profumo del caffè.', { items: ['felt:rosso-da-circolo'] }],
  ['locanda-del-re', 'La Locanda del Re', 'Dove si fermava il re per una mano a Briscola.', { items: ['table:tavolo-della-taverna'], coins: 200 }],
  // II — I giocatori esperti
  ['circolo-d-oro', 'Il Circolo d’Oro', 'Il circolo dei soci di lunga data.', { title: 're-del-circolo', coins: 300 }],
  ['sala-dei-maestri', 'La Sala dei Maestri', 'I ritratti dei campioni alle pareti.', { items: ['back:oro-classico'] }],
  ['palazzo-delle-carte', 'Il Palazzo delle Carte', 'Scaloni e lampadari: qui si gioca sul serio.', { coins: 500 }],
  ['casino-di-venezia', 'Il Casinò di Venezia', 'Sul Canal Grande, tra stucchi e velluti.', { items: ['felt:venezia-al-tramonto'] }],
  ['loggia-dei-nobili', 'La Loggia dei Nobili', 'Archi di pietra e stemmi di famiglia.', { title: 'nobile-delle-carte', coins: 500 }],
  ['salone-dei-campioni', 'Il Salone dei Campioni', 'Le coppe in vetrina e il tavolo al centro.', { items: ['table:tavolo-del-circolo'] }],
  // III — Il prestigio
  ['club-dei-signori', 'Il Club dei Signori', 'Poltrone di cuoio e silenzio.', { items: ['back:corona-reale'] }],
  ['sala-di-cristallo', 'La Sala di Cristallo', 'Pareti di specchi e lampadari di cristallo.', { items: ['table:cristallo-blu'] }],
  ['palazzo-reale', 'Il Palazzo Reale', 'Il salone delle feste del palazzo.', { title: 'signore-del-palazzo', coins: 600 }],
  ['corte-dei-re', 'La Corte dei Re', 'Davanti al trono, la corte guarda.', { items: ['felt:velluto-reale'] }],
  ['sala-degli-imperatori', 'La Sala degli Imperatori', 'Busti di marmo e porpora.', { title: 'imperatore', items: ['back:sigillo-imperiale'] }],
  ['trono-delle-carte', 'Il Trono delle Carte', 'Un trono fatto di carte, e il tavolo ai suoi piedi.', { items: ['table:palazzo-reale'] }],
  // IV — I maestri
  ['santuario-del-gioco', 'Il Santuario del Gioco', 'Candele e silenzio: si gioca come si prega.', { items: ['felt:nebbia-mistica'], coins: 400 }, { k: 'level', n: 25 }],
  ['cripta-dei-maestri', 'La Cripta dei Maestri', 'Sotto le volte riposano i grandi giocatori.', { title: 'maestro-delle-leggende', items: ['back:rune-antiche'] }],
  ['fortezza-degli-assi', 'La Fortezza degli Assi', 'Mura spesse e quattro torri, una per seme.', { items: ['back:scudo-leggendario'], coins: 800 }, { k: 'stat', key: 'expertWins', n: 15 }],
  ['torre-dei-campioni', 'La Torre dei Campioni', 'In cima alla torre, sopra le nuvole.', { title: 'dominatore', items: ['table:tavolo-del-campione'] }],
  ['olimpo-delle-carte', 'L’Olimpo delle Carte', 'Colonne bianche e cielo d’oro.', { items: ['felt:olimpo'] }, { k: 'allGames', what: 'won', n: 25 }],
  ['sala-degli-immortali', 'La Sala degli Immortali', 'Statue che giocano da secoli.', { title: 'immortale', coins: 1000 }],
  // V — Le leggende
  ['regno-degli-assi', 'Il Regno degli Assi', 'Un regno intero per quattro carte.', { title: 're-degli-assi', items: ['table:trono-degli-assi'] }, { k: 'level', n: 40 }],
  ['palazzo-dell-eternita', 'Il Palazzo dell’Eternità', 'Dove il tempo si ferma a guardare.', { title: 'custode-dell-eternita', items: ['felt:oltre-il-tempo'] }],
  ['trono-degli-immortali', 'Il Trono degli Immortali', 'Il trono che pochi hanno visto.', { title: 'signore-degli-immortali', items: ['table:tavolo-degli-immortali'] }, { k: 'stat', key: 'expertWins', n: 40 }],
  ['corona-dei-tre-giochi', 'La Corona dei Tre Giochi', 'Tressette, Briscola e Scopa: una corona per tutti e tre.', { title: 'corona-dei-tre-giochi', items: ['back:i-tre-giochi'] }, { k: 'allGames', what: 'won', n: 50 }],
  ['ultimo-tavolo', 'L’Ultimo Tavolo', 'Un tavolo solo, in una sala vuota.', { title: 'l-ultimo-campione', items: ['table:l-ultimo-re'] }],
  ['leggenda-vivente', 'La Leggenda Vivente', 'La cima. Da qui si scrive la leggenda.', { title: 'leggenda-vivente', items: ['felt:leggenda-vivente', 'back:leggenda-vivente'], coins: 2000 }, { k: 'level', n: 50 }],
];

export const ARENAS: Arena[] = DEFS.map(([id, name, desc, reward, requires], index) => ({
  index,
  n: index + 1,
  id,
  name,
  desc,
  chapter: CHAPTERS[Math.floor(index / 6)],
  threshold: index * BALANCE.trophies.arenaStep,
  ...(requires ? { requires } : {}),
  reward,
  chapterEnd: index % 6 === 5,
}));

export const LAST_ARENA = ARENAS.length - 1;
export const MAX_THRESHOLD = ARENAS[LAST_ARENA].threshold;

/** L'arena per numero di trofei, senza guardare i requisiti. */
export const arenaByTrophies = (trophies: number): Arena =>
  ARENAS[Math.max(0, Math.min(LAST_ARENA, Math.floor(trophies / BALANCE.trophies.arenaStep)))];

/**
 * L'arena raggiunta: la più alta con il record di trofei sopra la soglia e i requisiti a posto, senza
 * saltare quelle prima (un'arena chiusa ferma la strada).
 */
export function reachedArena(v: ReqView): number {
  let i = 0;
  while (i < LAST_ARENA) {
    const next = ARENAS[i + 1];
    if (v.bestCups < next.threshold) break;
    if (next.requires && !reqMet(next.requires, v)) break;
    i++;
  }
  return i;
}

/** L'arena che ferma la strada per un requisito, se c'è. */
export function blockedArena(v: ReqView): Arena | null {
  const i = reachedArena(v);
  const next = ARENAS[i + 1];
  return next && v.bestCups >= next.threshold && next.requires && !reqMet(next.requires, v) ? next : null;
}

/** Il pavimento: il primo trofeo dell'arena raggiunta. */
export const floorOf = (arenaIndex: number) => ARENAS[Math.max(0, Math.min(LAST_ARENA, arenaIndex))].threshold;

/** Trofei per una partita: un avversario più forte vale di più; contro il Facile non se ne perdono. */
export interface TrophyMatch {
  won: boolean;
  level: Level;
  online: boolean;
}

export function trophyDelta(r: TrophyMatch): number {
  const k = r.online ? 'online' : r.level;
  return r.won ? BALANCE.trophies.win[k] : 0 - BALANCE.trophies.loss[k] || 0;
}

/** Applica una partita ai trofei, rispettando il pavimento dell'arena raggiunta. */
export function applyTrophies(trophies: number, arenaIndex: number, r: TrophyMatch): { trophies: number; delta: number } {
  const next = Math.max(floorOf(arenaIndex), trophies + trophyDelta(r));
  return { trophies: next, delta: next - trophies };
}

/** Avanzamento verso l'arena dopo: trofei fatti e trofei che servono (dopo l'ultima, verso il prossimo grado di Leggenda). */
export function arenaProgress(trophies: number, arenaIndex: number): { have: number; need: number } {
  if (arenaIndex >= LAST_ARENA) {
    const step = BALANCE.trophies.legendStep;
    const over = Math.max(0, trophies - MAX_THRESHOLD);
    return { have: over % step, need: step };
  }
  const a = ARENAS[arenaIndex];
  return { have: Math.max(0, trophies - a.threshold), need: ARENAS[arenaIndex + 1].threshold - a.threshold };
}

export { legendOf };
