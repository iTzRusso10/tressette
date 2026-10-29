import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS, isSecret } from '../achievements';
import { BALANCE } from '../balance';
import { FRAMES, itemByKey } from '../catalog';
import { eventAt, EVENT_TEMPLATES, nextEvent } from '../events';
import {
  activeMissions,
  addGrants,
  applyHand,
  applyMatch,
  claimReward,
  eventProgressOf,
  newProgress,
  opponentStrength,
  selectAvatar,
  selectShowcase,
  showcaseOf,
  swapMission,
  touch,
  type Progress,
} from '../ledger';
import { cleanHand, type MatchRecord } from '../progress';
import { LEAGUES, leagueOf, performance, rate, RATING, newRating } from '../rating';
import { reqText } from '../reqs';
import { sourcesOf } from '../sources';

let n = 0;
// Partite classificate contro una persona da 1400: le uniche che muovono il punteggio.
const m = (won: boolean, extra: Partial<MatchRecord> = {}): MatchRecord => ({
  id: `c${++n}`,
  game: 'scopa',
  mode: '2',
  level: 'difficile',
  online: true,
  won,
  queue: 'ranked',
  mm: 'mm1',
  oppRating: 1400,
  ...extra,
});
function play(p: Progress, list: MatchRecord[], day = '2026-11-10') {
  let t = 5_000_000;
  for (const r of list) {
    t += 60_000;
    p = applyMatch(p, r, day, t).p;
  }
  return p;
}

describe('punteggio di bravura', () => {
  it('vincere contro chi è più forte vale di più; contro il Facile, una volta saliti, niente', () => {
    const g = { r: 1000, n: 20, peak: 1000 };
    expect(rate(g, 1400, true).delta).toBeGreaterThan(rate(g, 800, true).delta);
    let x = { r: 1000, n: 0, peak: 1000 };
    for (let i = 0; i < 2000; i++) x = rate(x, 800, true).g;
    // Battere all'infinito chi vale 800 non fa salire oltre un tetto.
    expect(x.r).toBeLessThan(1700);
    const y = rate(x, 800, true);
    expect(y.delta).toBe(0);
  });
  it('si ferma dove sta la bravura: vincere il 50% contro l’Esperto porta intorno a 1400', () => {
    let x = newRating();
    for (let i = 0; i < 400; i++) x = rate(x, 1400, i % 2 === 0).g;
    expect(Math.abs(x.r - 1400)).toBeLessThan(40);
  });
  it('leghe in ordine, con un nome e una cornice ciascuna', () => {
    expect(LEAGUES.map(l => l.min)).toEqual([...LEAGUES.map(l => l.min)].sort((a, b) => a - b));
    for (const l of LEAGUES) expect(itemByKey(`frame:${l.frame}`)?.slot).toBe('frame');
    expect(leagueOf(1000).id).toBe('grana');
    expect(leagueOf(2000).id).toBe('re');
  });
  it('una partita aggiorna il punteggio del suo gioco e la settimana', () => {
    const p = play(newProgress('r'), [m(true), m(true), m(false)]);
    expect(p.meta.ratings.scopa.n).toBe(3);
    expect(p.meta.ratings.briscola.n).toBe(0);
    expect(p.meta.weekly.scopa).toMatchObject({ n: 3, w: 2, l: 1 });
    expect(performance(p.meta.weekly.scopa)).toBeNull();
  });
  it('solo la classificata muove il punteggio; trofei solo dalla partita veloce', () => {
    const cpu = play(newProgress('r'), [m(true, { queue: 'cpu', online: false }), m(true, { queue: 'cpu', online: false })]);
    expect(cpu.meta.ratings.scopa.n).toBe(0);
    expect(cpu.cups).toBe(0);
    expect(cpu.meta.season.matches).toBe(0);
    const friends = play(newProgress('r'), [m(true, { queue: 'friends', opp: ['amico'] })]);
    expect(friends.meta.ratings.scopa.n).toBe(0);
    expect(friends.cups).toBe(0);
    expect(friends.meta.rivals.amico).toBe(1);
    const ranked = play(newProgress('r'), [m(true)]);
    expect(ranked.meta.ratings.scopa.n).toBe(1);
    expect(ranked.cups).toBe(0);
    const quick = play(newProgress('r'), [m(true, { queue: 'quick', oppRating: undefined })]);
    expect(quick.meta.ratings.scopa.n).toBe(0);
    expect(quick.cups).toBe(BALANCE.trophies.quick.win);
  });
  it('la classificata usa la forza vera degli avversari', () => {
    const strong = applyMatch(newProgress('r'), m(true, { oppRating: 1600 }), '2026-11-10', 1).ratingDelta;
    const weak = applyMatch(newProgress('r'), m(true, { oppRating: 700 }), '2026-11-10', 1).ratingDelta;
    expect(strong).toBeGreaterThan(weak);
    // Una forza impossibile torna nei limiti.
    expect(opponentStrength(m(true, { oppRating: 99999 }))).toBe(4000);
    expect(opponentStrength(m(true, { oppRating: undefined }))).toBe(RATING.unknownOpponent);
  });
  it('online, contro la stessa persona contano al massimo 3 partite al giorno', () => {
    const list = Array.from({ length: 6 }, () => m(true, { online: true, opp: ['amico'] }));
    const p = play(newProgress('r'), list);
    expect(p.meta.ratings.scopa.n).toBe(3);
    expect(p.meta.rivals.amico).toBe(6);
    expect(p.stats.maxRivalWins).toBe(6);
  });
  it('a fine stagione: premio della lega da riscuotere, punteggio a metà strada da 1000', () => {
    let p = play(newProgress('r'), Array.from({ length: 12 }, () => m(true)), '2026-11-10');
    const r = p.meta.ratings.scopa.r;
    expect(r).toBeGreaterThan(1000);
    p = touch(p, '2027-01-02').p;
    expect(p.meta.ratingSeason).toBe('trionfo-degli-assi');
    expect(p.meta.ratings.scopa.r).toBe(Math.round(1000 + (r - 1000) / 2));
    const c = p.meta.claims.find(x => x.id === 'lega:stagione-dei-re:scopa');
    expect(c).toBeTruthy();
    expect(p.meta.leagueHistory[0]).toMatchObject({ season: 'stagione-dei-re', game: 'scopa' });
    // Chi non ha giocato abbastanza un gioco non riceve niente per quel gioco.
    expect(p.meta.claims.some(x => x.id === 'lega:stagione-dei-re:briscola')).toBe(false);
  });
});

describe('ricompense da riscuotere', () => {
  it('le missioni completate aspettano di essere riscosse, una volta sola', () => {
    let p = play(newProgress('claim'), Array.from({ length: 6 }, (_, i) => m(i % 2 === 0, { game: (['scopa', 'briscola', 'tressette'] as const)[i % 3] })));
    const pending = p.meta.claims.filter(c => c.id.startsWith('m:'));
    expect(pending.length).toBeGreaterThan(0);
    const coins = p.coins;
    const c = pending[0];
    const a = claimReward(p, c.id, '2026-11-10');
    expect(a.p.coins).toBeGreaterThanOrEqual(coins + (c.coins ?? 0));
    const b = claimReward(a.p, c.id, '2026-11-10');
    expect(b.p).toBe(a.p);
    expect(b.claimed).toEqual([]);
    p = claimReward(a.p, '*', '2026-11-10').p;
    expect(p.meta.claims).toEqual([]);
  });
  it('un premio del server arriva una volta sola anche se mandato due volte', () => {
    const g = [{ id: 'podio:2026-W46:scopa', why: 'Podio settimanale', coins: 500, items: ['frame:podio-settimana'] }];
    const a = addGrants(newProgress('g'), g, '2026-11-20').p;
    const b = addGrants(a, g, '2026-11-20').p;
    expect(b.meta.claims.length).toBe(1);
    const c = claimReward(b, g[0].id, '2026-11-20').p;
    expect(c.owned).toContain('frame:podio-settimana');
    expect(addGrants(c, g, '2026-11-20').p.meta.claims.some(x => x.id === g[0].id)).toBe(false);
  });
  it('un oggetto già posseduto diventa monete', () => {
    const p = addGrants(newProgress('g'), [{ id: 'x', why: 'Prova', items: ['frame:semplice'] }], '2026-11-20').p;
    expect(claimReward(p, 'x', '2026-11-20').p.coins).toBe(p.coins + 300);
  });
});

describe('missioni', () => {
  it('si può cambiare una missione del giorno, una volta', () => {
    const day = '2026-11-11';
    const p = touch(newProgress('swap'), day).p;
    const daily = activeMissions(p, day).filter(x => x.def.period === 'daily');
    const q = swapMission(p, daily[0].key, day)!;
    expect(q).toBeTruthy();
    const after = activeMissions(q, day).filter(x => x.def.period === 'daily');
    expect(after).toHaveLength(3);
    expect(after.some(x => x.key === daily[0].key)).toBe(false);
    expect(swapMission(q, after[0].key, day)).toBeNull();
  });
  it('le mani contano per le missioni di mani e scope', () => {
    let p = newProgress('mani');
    for (let i = 0; i < 6; i++) p = applyHand(p, cleanHand({ game: 'scopa', scope: 1, handWon: true }), '2026-11-11').p;
    expect(p.stats.handsWon).toBe(6);
  });
});

describe('achievement segreti', () => {
  it('ognuno ha un indizio e una condizione scritta', () => {
    const secret = ACHIEVEMENTS.filter(isSecret);
    expect(secret.length).toBeGreaterThanOrEqual(10);
    for (const a of secret) {
      expect(a.hint!.length).toBeGreaterThan(10);
      expect(reqText(a.req).length).toBeGreaterThan(10);
    }
  });
  it('la rimonta e i tre tavoli in un giorno', () => {
    const p = play(newProgress('s'), [m(true, { comeback: true }), m(false, { game: 'briscola' }), m(false, { game: 'tressette' })]);
    expect(p.achievements['s-rimonta']).toBeTruthy();
    expect(p.owned).toContain('frame:segreto-rimonta');
    expect(p.achievements['s-tre-tavoli']).toBeTruthy();
  });
  it('battere ogni livello in ogni gioco', () => {
    const list = (['tressette', 'briscola', 'scopa'] as const).flatMap(game => (['facile', 'medio', 'difficile'] as const).map(level => m(true, { game, level, queue: 'cpu', online: false })));
    expect(play(newProgress('s'), list).achievements['s-ogni-avversario']).toBeTruthy();
  });
});

describe('eventi', () => {
  it('c’è un calendario: un evento adesso o il prossimo, ognuno con tre traguardi e una cornice', () => {
    expect(eventAt('2026-10-29')?.template.id).toBe('settimana-tressette');
    expect(eventAt('2026-11-02')).toBeNull();
    expect(eventAt('2026-11-06')?.template.id).toBe('weekend-scopa');
    expect(nextEvent('2026-11-02').start).toBe('2026-11-06');
    for (const t of EVENT_TEMPLATES) {
      expect(t.tiers).toHaveLength(3);
      const frame = t.rewards[2].items![0];
      expect(itemByKey(frame)?.slot).toBe('frame');
      expect(sourcesOf(frame).length).toBeGreaterThan(0);
    }
  });
  it('conta solo da quando comincia, e i traguardi finiscono tra le ricompense', () => {
    let p = play(newProgress('e'), Array.from({ length: 3 }, () => m(true, { game: 'tressette' })), '2026-10-25');
    p = touch(p, '2026-10-27').p;
    expect(eventProgressOf(p)).toBe(0);
    p = play(p, Array.from({ length: 5 }, () => m(true, { game: 'tressette' })), '2026-10-28');
    expect(eventProgressOf(p)).toBe(5);
    expect(p.meta.claims.some(c => c.id.startsWith('evento:settimana-tressette-2026-10-26:0'))).toBe(true);
  });
});

describe('profilo', () => {
  it('avatar, vetrina scelta o automatica', () => {
    let p = newProgress('v');
    expect(selectAvatar(p, 'sole')!.meta.avatar).toBe('sole');
    expect(selectAvatar(p, 'drago')).toBeNull();
    p = { ...p, owned: [...p.owned, 'frame:gemme', 'table:legno-di-casa'] };
    expect(showcaseOf(p)[0]).toBe('item:frame:gemme');
    expect(selectShowcase(p, ['item:table:legno-di-casa'])!.meta.showcase).toEqual(['item:table:legno-di-casa']);
    expect(selectShowcase(p, ['item:table:il-mito'])).toBeNull();
    expect(selectShowcase(p, ['ach:prima-vittoria'])).toBeNull();
  });
  it('ogni cornice si ottiene in qualche modo', () => {
    for (const f of FRAMES) expect(sourcesOf(`frame:${f.id}`).length, f.id).toBeGreaterThan(0);
  });
});

describe('reazioni veloci', () => {
  it('limite per chi manda: una ogni due secondi e mezzo, al massimo cinque in trenta secondi', async () => {
    const { canSend, canShow, REACT_LIMIT } = await import('../reactions');
    expect(canSend([], 0)).toBe(true);
    expect(canSend([1000], 2000)).toBe(false);
    expect(canSend([1000], 1000 + REACT_LIMIT.cooldownMs)).toBe(true);
    const five = [0, 3000, 6000, 9000, 12000];
    expect(canSend(five, 15000)).toBe(false);
    expect(canSend(five, 30001)).toBe(true);
    expect(canShow('bravo', undefined, 0)).toBe(true);
    expect(canShow('bravo', 1000, 1500)).toBe(false);
    expect(canShow('parolaccia', undefined, 0)).toBe(false);
  });
});
