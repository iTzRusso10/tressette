// I 60 titoli che si scelgono dal profilo. Ognuno ha un requisito preciso e verificabile; solo i primi,
// introduttivi, si ottengono quasi subito.

import { reqMet, type Req, type ReqView } from './reqs.ts';

export interface Title {
  id: string;
  name: string;
  req: Req;
  /** Gruppo, per ordinarli nel profilo. */
  group: 'inizio' | 'vittorie' | 'giochi' | 'sfide' | 'arene' | 'collezione' | 'tempo' | 'stagioni' | 'online';
}

const T = (id: string, name: string, group: Title['group'], req: Req): Title => ({ id, name, group, req });

export const TITLES: Title[] = [
  T('nuovo-giocatore', 'Nuovo Giocatore', 'inizio', { k: 'start' }),
  T('primo-vincitore', 'Primo Vincitore', 'inizio', { k: 'stat', key: 'won', n: 1 }),
  T('frequentatore-del-bar', 'Frequentatore del Bar', 'inizio', { k: 'stat', key: 'played', n: 10 }),
  T('giocatore-abituale', 'Giocatore Abituale', 'tempo', { k: 'stat', key: 'played', n: 100 }),
  T('mano-esperta', 'Mano Esperta', 'vittorie', { k: 'stat', key: 'won', n: 100 }),
  T('veterano', 'Veterano', 'vittorie', { k: 'stat', key: 'won', n: 500 }),
  T('maestro', 'Maestro', 'vittorie', { k: 'stat', key: 'won', n: 1000 }),
  T('gran-maestro', 'Gran Maestro', 'vittorie', { k: 'stat', key: 'won', n: 2500 }),
  T('campione-di-scopa', 'Campione di Scopa', 'giochi', { k: 'game', game: 'scopa', what: 'won', n: 100 }),
  T('campione-di-briscola', 'Campione di Briscola', 'giochi', { k: 'game', game: 'briscola', what: 'won', n: 100 }),
  T('campione-di-tressette', 'Campione di Tressette', 'giochi', { k: 'game', game: 'tressette', what: 'won', n: 100 }),
  T('re-della-scopa', 'Re della Scopa', 'giochi', { k: 'game', game: 'scopa', what: 'won', n: 500 }),
  T('asso-di-briscola', 'Asso di Briscola', 'giochi', { k: 'game', game: 'briscola', what: 'won', n: 500 }),
  T('maestro-del-tressette', 'Maestro del Tressette', 'giochi', { k: 'game', game: 'tressette', what: 'won', n: 500 }),
  T('stratega', 'Stratega', 'sfide', { k: 'stat', key: 'expertWins', n: 100 }),
  T('implacabile', 'Implacabile', 'sfide', { k: 'stat', key: 'bestStreak', n: 10 }),
  T('inarrestabile', 'Inarrestabile', 'sfide', { k: 'stat', key: 'bestStreak', n: 25 }),
  T('senza-paura', 'Senza Paura', 'sfide', { k: 'stat', key: 'bestExpertStreak', n: 10 }),
  T('cacciatore-di-trofei', 'Cacciatore di Trofei', 'arene', { k: 'best', n: 1000 }),
  T('collezionista', 'Collezionista', 'collezione', { k: 'owned', n: 25 }),
  T('collezionista-esperto', 'Collezionista Esperto', 'collezione', { k: 'owned', n: 100 }),
  T('mecenate', 'Mecenate', 'collezione', { k: 'stat', key: 'coinsSpent', n: 100000 }),
  T('re-del-circolo', 'Re del Circolo', 'arene', { k: 'arena', n: 7 }),
  T('nobile-delle-carte', 'Nobile delle Carte', 'arene', { k: 'arena', n: 11 }),
  T('signore-del-palazzo', 'Signore del Palazzo', 'arene', { k: 'arena', n: 15 }),
  T('imperatore', 'Imperatore', 'arene', { k: 'arena', n: 17 }),
  T('maestro-delle-leggende', 'Maestro delle Leggende', 'arene', { k: 'arena', n: 20 }),
  T('dominatore', 'Dominatore', 'arene', { k: 'arena', n: 22 }),
  T('immortale', 'Immortale', 'arene', { k: 'arena', n: 24 }),
  T('re-degli-assi', 'Re degli Assi', 'arene', { k: 'arena', n: 25 }),
  T('custode-dell-eternita', 'Custode dell’Eternità', 'arene', { k: 'arena', n: 26 }),
  T('signore-degli-immortali', 'Signore degli Immortali', 'arene', { k: 'arena', n: 27 }),
  T('corona-dei-tre-giochi', 'Corona dei Tre Giochi', 'arene', { k: 'arena', n: 28 }),
  T('l-ultimo-campione', 'L’Ultimo Campione', 'arene', { k: 'arena', n: 29 }),
  T('leggenda-vivente', 'Leggenda Vivente', 'arene', { k: 'arena', n: 30 }),
  T('perfezionista', 'Perfezionista', 'sfide', { k: 'achievements', n: 50 }),
  T('cacciatore-di-sfide', 'Cacciatore di Sfide', 'sfide', { k: 'achievements', n: 100 }),
  T('maestro-delle-missioni', 'Maestro delle Missioni', 'tempo', { k: 'stat', key: 'missionsDone', n: 250 }),
  T('assiduo', 'Assiduo', 'tempo', { k: 'stat', key: 'days', n: 30 }),
  T('veterano-del-tempo', 'Veterano del Tempo', 'tempo', { k: 'stat', key: 'days', n: 100 }),
  T('senza-tempo', 'Senza Tempo', 'tempo', { k: 'stat', key: 'days', n: 365 }),
  T('primo-di-stagione', 'Primo di Stagione', 'stagioni', { k: 'seasonRank', n: 1 }),
  T('campione-stagionale', 'Campione Stagionale', 'stagioni', { k: 'seasonRank', n: 10 }),
  T('finalista', 'Finalista', 'stagioni', { k: 'seasonRank', n: 100 }),
  T('vincitore-del-torneo', 'Vincitore del Torneo', 'stagioni', { k: 'event', id: 'torneo', what: 'Vinci un torneo' }),
  T('re-del-tavolo', 'Re del Tavolo', 'online', { k: 'stat', key: 'won4', n: 250 }),
  T('dominatore-del-circolo', 'Dominatore del Circolo', 'online', { k: 'stat', key: 'onlineWins', n: 100 }),
  T('leggenda-del-multiplayer', 'Leggenda del Multiplayer', 'online', { k: 'stat', key: 'onlineWins', n: 500 }),
  T('amico-del-circolo', 'Amico del Circolo', 'online', { k: 'stat', key: 'onlinePlayed', n: 10 }),
  T('compagno-fedele', 'Compagno Fedele', 'online', { k: 'stat', key: 'onlinePairWins', n: 50 }),
  T('collezionista-di-stagione', 'Collezionista di Stagione', 'stagioni', { k: 'seasonItems', n: 3 }),
  T('custode-delle-carte', 'Custode delle Carte', 'collezione', { k: 'owned', slot: 'back', n: 30 }),
  T('signore-dei-panni', 'Signore dei Panni', 'collezione', { k: 'owned', slot: 'felt', n: 30 }),
  T('arredatore-reale', 'Arredatore Reale', 'collezione', { k: 'owned', slot: 'table', n: 20 }),
  T('ricco-di-monete', 'Ricco di Monete', 'collezione', { k: 'stat', key: 'coinsEarned', n: 100000 }),
  T('tesoro-del-circolo', 'Tesoro del Circolo', 'collezione', { k: 'stat', key: 'coinsEarned', n: 500000 }),
  T('mano-perfetta', 'Mano Perfetta', 'giochi', { k: 'stat', key: 'perfectScopa', n: 1 }),
  T('maestro-della-strategia', 'Maestro della Strategia', 'sfide', { k: 'stat', key: 'expertWins', n: 250 }),
  T('gloria-eterna', 'Gloria Eterna', 'tempo', { k: 'prestige', n: 10 }),
  T('il-senza-pari', 'Il Senza Pari', 'sfide', { k: 'achievements', n: 150 }),
];

const byId = new Map(TITLES.map(t => [t.id, t]));
export const titleById = (id: string) => byId.get(id);
export const DEFAULT_TITLE = 'nuovo-giocatore';

/** I titoli che hai: quelli con il requisito soddisfatto. */
export const titlesOwned = (v: ReqView) => TITLES.filter(t => reqMet(t.req, v));
export const hasTitle = (id: string, v: ReqView) => {
  const t = byId.get(id);
  return !!t && reqMet(t.req, v);
};
