import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS, ACHIEVEMENT_CATEGORIES } from '../achievements';
import { ARENAS, CHAPTERS, reachedArena, trophyDelta } from '../arenas';
import { BACKS, FELTS, ITEMS, itemByKey, keyOf, migrateCosmetics, NAPOLI_BACKS, NAPOLI_FELTS, TABLES } from '../catalog';
import { applyHand, applyMatch, buyItem, claimDaily, equipItem, newProgress, normalize, selectTitle, touch, type Progress } from '../ledger';
import { levelInfo, xpForLevel, XP_MAX_LEVEL } from '../levels';
import { MISSIONS, missionsFor, weekOf } from '../missions';
import { cleanHand, type MatchRecord } from '../progress';
import { RARITIES } from '../rarity';
import { reqText } from '../reqs';
import { seasonAt, SEASONS, seasonWindow } from '../seasons';
import { SETS, setParts } from '../sets';
import { sourcesOf } from '../sources';
import { TITLES } from '../titles';

const BRIEF_TABLES = `Legno di Casa|Pino Mediterraneo|Rovere Antico|Noce Italiano|Tavolo della Taverna|Mogano Classico|Ciliegio Rosso|Ulivo Calabrese|Quercia del Borgo|Tavolo del Circolo|Marmo di Carrara|Granito Nero|Ebano Reale|Radica di Lusso|Tavolo Veneziano|Oro Antico|Notte Stellata|Palazzo Reale|Cristallo Blu|Scacchiera Imperiale|Abisso Nero|Giada Orientale|Drago Cremisi|Tempesta d’Argento|Galassia|Trono degli Assi|Corona del Re|Diamante Eterno|Fiamma Dorata|Universo Infinito|Tavolo del Campione|Cuore di Drago|Il Mito|L’Ultimo Re|Tavolo degli Immortali|Crono|Fenice Eterna|Trono Celeste|Il Multiverso|Il Tavolo Leggendario`.split('|');
const TABLE_PRICES = [300, 400, 500, 600, 700, 900, 1000, 1100, 1200, 1300, 1600, 1800, 2000, 2200, 2400, 3000, 3200, 3400, 3600, 3800, 4000, 4200, 4400, 4600, 4800, 5500, 6000, 6500, 7000, 7500, 8000, 8500, 9000, 10000, 12000, 14000, 16000, 18000, 20000, 25000];
const ARENA_NAMES = `Il Bar del Paese|La Piazza del Borgo|Il Circolo degli Amici|La Taverna del Moro|Il Caffè delle Carte|La Locanda del Re|Il Circolo d’Oro|La Sala dei Maestri|Il Palazzo delle Carte|Il Casinò di Venezia|La Loggia dei Nobili|Il Salone dei Campioni|Il Club dei Signori|La Sala di Cristallo|Il Palazzo Reale|La Corte dei Re|La Sala degli Imperatori|Il Trono delle Carte|Il Santuario del Gioco|La Cripta dei Maestri|La Fortezza degli Assi|La Torre dei Campioni|L’Olimpo delle Carte|La Sala degli Immortali|Il Regno degli Assi|Il Palazzo dell’Eternità|Il Trono degli Immortali|La Corona dei Tre Giochi|L’Ultimo Tavolo|La Leggenda Vivente`.split('|');

const DAY = '2026-10-28';
let n = 0;
const match = (won: boolean, extra: Partial<MatchRecord> = {}): MatchRecord => ({ id: `m${++n}`, game: 'scopa', mode: '2', level: 'medio', online: false, won, ...extra });
/** Gioca partite una dopo l'altra (un minuto tra l'una e l'altra). */
function playMany(p: Progress, list: MatchRecord[], day = DAY, server = false) {
  let t = 1_000_000;
  for (const m of list) {
    t += 60_000;
    p = applyMatch(p, m, day, t, { server }).p;
  }
  return p;
}

describe('cataloghi', () => {
  it('40 tavolini con nomi, rarità e prezzi del catalogo', () => {
    expect(TABLES.map(t => t.name)).toEqual(BRIEF_TABLES);
    expect(TABLES.map(t => t.price)).toEqual(TABLE_PRICES);
    expect(TABLES.map(t => t.n)).toEqual(TABLES.map((_, i) => i + 1));
  });
  it('60 grafiche del panno e 60 dorsi', () => {
    expect(FELTS).toHaveLength(60);
    expect(BACKS).toHaveLength(60);
    expect(new Set(FELTS.map(f => f.name)).size).toBe(60);
    expect(new Set(BACKS.map(b => b.name)).size).toBe(60);
  });
  it('la collezione Napoli di prima resta', () => {
    expect(NAPOLI_FELTS.length + NAPOLI_BACKS.length).toBe(18);
  });
  it('chiavi uniche, rarità valide, ogni oggetto si può ottenere in qualche modo', () => {
    const keys = ITEMS.map(keyOf);
    expect(new Set(keys).size).toBe(keys.length);
    for (const i of ITEMS) {
      expect(RARITIES).toContain(i.rarity);
      expect(sourcesOf(keyOf(i)).length, keyOf(i)).toBeGreaterThan(0);
      if (i.status === 'coming') expect(i.art, keyOf(i)).toBeTruthy();
    }
  });
  it('gli oggetti più rari non si comprano tutti', () => {
    const top = ITEMS.filter(i => i.rarity === 'mitico' || i.rarity === 'leggendario');
    expect(top.filter(i => !i.shop).length).toBeGreaterThan(top.length / 2);
  });
  it('ogni ricompensa punta a un oggetto che esiste', () => {
    const refs = [...ARENAS.flatMap(a => a.reward.items ?? []), ...ACHIEVEMENTS.flatMap(a => a.items ?? []), ...SEASONS.map(s => s.special), ...SETS.flatMap(setParts)];
    for (const k of refs) expect(itemByKey(k), k).toBeTruthy();
  });
  it('15 set, ciascuno con un tavolino, un panno e un dorso', () => {
    expect(SETS).toHaveLength(15);
    for (const s of SETS) {
      expect(itemByKey(s.table)?.slot).toBe('table');
      expect(itemByKey(s.felt)?.slot).toBe('felt');
      expect(itemByKey(s.back)?.slot).toBe('back');
    }
  });
});

describe('arene', () => {
  it('30 arene in 5 capitoli, ogni 100 trofei da 0 a 2900', () => {
    expect(ARENAS.map(a => a.name)).toEqual(ARENA_NAMES);
    expect(ARENAS.map(a => a.threshold)).toEqual(ARENAS.map((_, i) => i * 100));
    expect(CHAPTERS).toHaveLength(5);
    for (const c of CHAPTERS) expect(ARENAS.filter(a => a.chapter === c)).toHaveLength(6);
  });
  it('le ricompense alternano monete, titoli e oggetti', () => {
    const kinds = ARENAS.slice(1).map(a => (a.reward.title ? 'titolo' : a.reward.items ? 'oggetto' : 'monete'));
    expect(new Set(kinds)).toEqual(new Set(['titolo', 'oggetto', 'monete']));
    // Mai tre arene di fila con le sole monete.
    expect(kinds.join(',')).not.toMatch(/monete,monete,monete/);
  });
  it('trofei: +10 +20 +30, sconfitte 0 −5 −10', () => {
    expect(trophyDelta({ won: true, level: 'facile', online: false })).toBe(10);
    expect(trophyDelta({ won: true, level: 'medio', online: false })).toBe(20);
    expect(trophyDelta({ won: true, level: 'difficile', online: false })).toBe(30);
    expect(trophyDelta({ won: true, level: 'facile', online: true })).toBe(30);
    expect(trophyDelta({ won: false, level: 'facile', online: false })).toBe(0);
    expect(trophyDelta({ won: false, level: 'medio', online: false })).toBe(-5);
    expect(trophyDelta({ won: false, level: 'difficile', online: false })).toBe(-10);
    expect(trophyDelta({ won: false, level: 'medio', online: true })).toBe(-10);
  });
  it('un requisito chiude la strada finché non c’è, i trofei continuano a contare', () => {
    const p = newProgress('x');
    p.bestCups = 2000;
    p.cups = 2000;
    // Arena 19 chiede il livello 25: senza, ci si ferma alla 18.
    expect(reachedArena(p)).toBe(17);
    p.xp = xpForLevel(25);
    expect(reachedArena(p)).toBe(19);
  });
});

describe('livelli', () => {
  it('100 livelli crescenti, poi il prestigio', () => {
    expect(levelInfo(0)).toMatchObject({ level: 1, prestige: 0 });
    expect(xpForLevel(3) - xpForLevel(2)).toBeGreaterThan(xpForLevel(2) - xpForLevel(1));
    expect(levelInfo(XP_MAX_LEVEL - 1).level).toBe(99);
    expect(levelInfo(XP_MAX_LEVEL)).toMatchObject({ level: 100, prestige: 0 });
    expect(levelInfo(XP_MAX_LEVEL + 25000)).toMatchObject({ level: 100, prestige: 2 });
  });
});

describe('achievement e titoli', () => {
  it('almeno 150 achievement in tutte le 16 categorie, id unici, difficoltà diverse', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(150);
    expect(new Set(ACHIEVEMENTS.map(a => a.id)).size).toBe(ACHIEVEMENTS.length);
    for (const c of ACHIEVEMENT_CATEGORIES) expect(ACHIEVEMENTS.some(a => a.category === c.id), c.id).toBe(true);
    expect(new Set(ACHIEVEMENTS.map(a => a.tier))).toEqual(new Set(['bronzo', 'argento', 'oro', 'platino']));
    for (const a of ACHIEVEMENTS) {
      expect(a.coins).toBeGreaterThanOrEqual(100);
      expect(a.coins).toBeLessThanOrEqual(1000);
    }
  });
  it('quelli richiesti ci sono, con le loro condizioni', () => {
    const by = (name: string) => ACHIEVEMENTS.find(a => a.name === name);
    expect(by('Prima Vittoria')?.req).toEqual({ k: 'stat', key: 'won', n: 1 });
    expect(by('Leggenda del Circolo')?.req).toEqual({ k: 'stat', key: 'won', n: 5000 });
    expect(by('Re della Scopa')?.req).toEqual({ k: 'game', game: 'scopa', what: 'won', n: 500 });
    expect(by('Sempre in Piedi')?.req).toEqual({ k: 'stat', key: 'bestStreak', n: 10 });
    expect(by('Imbattibile')?.req).toEqual({ k: 'stat', key: 'bestStreak', n: 25 });
    expect(by('Il Gran Collezionista')?.req).toEqual({ k: 'owned', n: 100 });
    expect(by('Maestro delle Missioni')?.req).toEqual({ k: 'stat', key: 'missionsDone', n: 250 });
    expect(by('Arredatore Reale')?.req).toEqual({ k: 'owned', slot: 'table', n: 20 });
    for (const name of ['Mani Esperte', 'Veterano del Tavolo', 'Maestro delle Carte', 'Asso di Briscola', 'Maestro del Tressette', 'Il Collezionista', 'Tripla Corona', 'Il Veterano', 'Perfezionista', 'Cacciatore di Sfide', 'Custode delle Carte', 'Signore dei Panni'])
      expect(by(name), name).toBeTruthy();
  });
  it('60 titoli, nomi unici, ognuno con un requisito scritto', () => {
    expect(TITLES).toHaveLength(60);
    expect(new Set(TITLES.map(t => t.name)).size).toBe(60);
    for (const t of TITLES) expect(reqText(t.req).length).toBeGreaterThan(5);
    // Solo il primo si ha senza fare niente.
    expect(TITLES.filter(t => t.req.k === 'start')).toHaveLength(1);
  });
});

describe('registro', () => {
  it('una partita vinta: prima vittoria del giorno, trofei, statistiche', () => {
    const { p, delta } = applyMatch(newProgress('s'), match(true), DAY, 1);
    expect(delta).toBe(20);
    expect(p.cups).toBe(20);
    // 1000 di partenza + 100 prima vittoria + 3 achievement da 100 (prima partita, prima vittoria, prima a scopa)
    // + 60 del livello 2 (l'esperienza degli achievement basta a salire).
    expect(p.coins).toBe(1000 + 100 + 300 + 60);
    expect(p.achievements['prima-vittoria']).toBeTruthy();
    const second = applyMatch(p, match(true), DAY, 120_000).p;
    expect(second.coins - p.coins).toBe(15);
  });
  it('la stessa partita non conta due volte; sul server nemmeno se arriva troppo presto', () => {
    const m = match(true);
    const a = applyMatch(newProgress('s'), m, DAY, 100_000).p;
    const b = applyMatch(a, m, DAY, 200_000);
    expect(b.refused).toBe('duplicate');
    expect(b.p).toBe(a);
    const c = applyMatch(a, match(true), DAY, 110_000, { server: true });
    expect(c.refused).toBe('tooSoon');
  });
  it('una sconfitta finita paga 5 monete; i trofei non scendono sotto l’arena raggiunta', () => {
    let p = playMany(newProgress('s'), Array.from({ length: 5 }, () => match(true)));
    expect(p.cups).toBe(100);
    expect(p.meta.arena).toBe(1);
    const before = p.coins;
    p = applyMatch(p, match(false, { level: 'difficile' }), DAY, 9e9).p;
    expect(p.cups).toBe(100);
    expect(p.coins - before).toBeGreaterThanOrEqual(5);
  });
  it('raggiungere un’arena paga la sua ricompensa una volta sola', () => {
    let p = playMany(newProgress('s'), Array.from({ length: 5 }, () => match(true)));
    expect(p.owned).toContain('table:legno-di-casa');
    const before = p.owned.length;
    p = touch(p, DAY).p;
    expect(p.owned.length).toBe(before);
  });
  it('mani: scope e Settebello entrano nelle statistiche', () => {
    const h = cleanHand({ game: 'scopa', scope: 3, settebello: true, denari: 10, perfect: true });
    const p = applyHand(newProgress('s'), h, DAY).p;
    expect(p.stats.scope).toBe(3);
    expect(p.stats.maxScopeHand).toBe(3);
    expect(p.stats.allDenari).toBe(1);
    expect(p.achievements['mano-perfetta']).toBeTruthy();
    expect(p.owned).toContain('felt:la-mano-perfetta');
    // Dati impossibili tornano nei limiti.
    expect(cleanHand({ game: 'briscola', briscolaPts: 999, scope: 5 })).toMatchObject({ briscolaPts: 120, scope: 0 });
  });
  it('negozio: compra, non due volte, non gli oggetti in arrivo; si equipaggia solo ciò che hai', () => {
    let p = newProgress('s');
    const r = buyItem(p, 'table', 'legno-di-casa', DAY);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    p = r.p;
    expect(p.stats.coinsSpent).toBeGreaterThan(0);
    expect(buyItem(p, 'table', 'legno-di-casa', DAY)).toEqual({ ok: false, why: 'owned' });
    expect(buyItem({ ...p, coins: 99999 }, 'table', 'drago-cremisi', DAY)).toEqual({ ok: false, why: 'notForSale' });
    expect(buyItem(p, 'table', 'palazzo-reale', DAY)).toEqual({ ok: false, why: 'notForSale' });
    expect(equipItem(p, 'table', 'legno-di-casa')?.equipped.table).toBe('legno-di-casa');
    expect(equipItem(p, 'table', 'granito-nero')).toBeNull();
  });
  it('bonus una volta al giorno', () => {
    const a = claimDaily(newProgress('s'), DAY, false);
    expect(a?.amount).toBe(100);
    expect(claimDaily(a!.p, DAY, false)).toBeNull();
  });
  it('titoli: si sceglie solo quello che hai', () => {
    const p = newProgress('s');
    expect(selectTitle(p, 'leggenda-vivente')).toBeNull();
    const q = playMany(p, [match(true)]);
    expect(selectTitle(q, 'primo-vincitore')?.meta.title).toBe('primo-vincitore');
  });
});

describe('missioni', () => {
  it('le stesse per lo stesso seme e periodo, diverse tra giorni', () => {
    expect(missionsFor('daily', DAY, 'a', false).map(m => m.id)).toEqual(missionsFor('daily', DAY, 'a', false).map(m => m.id));
    expect(missionsFor('daily', DAY, 'a', false)).toHaveLength(3);
    expect(missionsFor('weekly', weekOf(DAY), 'a', false)).toHaveLength(4);
    // Chi non ha mai giocato online non riceve missioni online.
    for (let i = 0; i < 40; i++) expect(missionsFor('weekly', `2026-W${i}`, 'z', false).some(m => m.online)).toBe(false);
  });
  it('ricompense nei limiti: 30–100 al giorno, 200–500 alla settimana', () => {
    for (const m of MISSIONS) {
      if (m.period === 'daily') expect(m.coins).toBeGreaterThanOrEqual(30), expect(m.coins).toBeLessThanOrEqual(100);
      else expect(m.coins).toBeGreaterThanOrEqual(200), expect(m.coins).toBeLessThanOrEqual(500);
    }
  });
  it('si completano giocando e pagano una volta; il giorno dopo ne arrivano di nuove', () => {
    let p = newProgress('seme');
    p = playMany(p, Array.from({ length: 12 }, (_, i) => match(i % 3 !== 0, { game: (['scopa', 'briscola', 'tressette'] as const)[i % 3] })));
    const done = p.meta.missions.done.filter(k => k.startsWith(DAY));
    expect(done.length).toBeGreaterThan(0);
    expect(p.stats.missionsDone).toBeGreaterThanOrEqual(done.length);
    const q = touch(p, '2026-10-29').p;
    expect(q.meta.missions.done.some(k => k.startsWith(DAY))).toBe(false);
    expect(q.stats.missionsDone).toBe(p.stats.missionsDone);
  });
  it('settimana ISO dal lunedì', () => {
    expect(weekOf('2026-10-26')).toBe(weekOf('2026-11-01'));
    expect(weekOf('2026-11-01')).not.toBe(weekOf('2026-11-02'));
    expect(weekOf('2027-01-01')).toBe('2026-W53');
  });
});

describe('stagioni', () => {
  it('6 stagioni da 60 giorni una dopo l’altra, ognuna con un cosmetico speciale', () => {
    expect(SEASONS.map(s => s.name)).toEqual(['La Stagione dei Re', 'Il Trionfo degli Assi', 'La Corona d’Oro', 'Il Regno dei Maestri', 'La Notte degli Immortali', 'La Sfida delle Tre Carte']);
    const w = SEASONS.map(seasonWindow);
    expect(w[0].start).toBe('2026-11-02');
    expect(w[0].end).toBe('2026-12-31');
    expect(w[1].start).toBe('2027-01-01');
    expect(seasonAt('2026-11-01')).toBeNull();
    expect(seasonAt('2026-12-31')?.season.n).toBe(1);
    for (const s of SEASONS) expect(itemByKey(s.special)?.status).toBe('ready');
  });
  it('la fine di una stagione azzera solo i punti stagione', () => {
    let p = playMany(newProgress('s'), Array.from({ length: 6 }, () => match(true)), '2026-11-10');
    expect(p.meta.season.points).toBe(120);
    const cups = p.cups;
    const owned = p.owned.length;
    p = touch(p, '2027-01-02').p;
    expect(p.meta.season.id).toBe('trionfo-degli-assi');
    expect(p.meta.season.points).toBe(0);
    expect(p.meta.seasonHistory).toEqual([{ id: 'stagione-dei-re', points: 120, matches: 6 }]);
    expect(p.cups).toBe(cups);
    expect(p.owned.length).toBe(owned);
    expect(p.stats.seasonsPlayed).toBe(1);
  });
});

describe('dal vecchio negozio', () => {
  it('panni con sponda e decori diventano tavolini e grafiche, nessuno si perde', () => {
    const r = migrateCosmetics(['smeraldo', 'nessuno', 'classico', 'reggia', 'maiolica', 'corona', 'lava'], { felt: 'reggia', pattern: 'maiolica', back: 'corona' });
    expect(r.owned).toEqual(expect.arrayContaining(['felt:oro-e-nero', 'table:corona-del-re', 'felt:maiolica-mediterranea', 'back:corona-reale', 'felt:lava', 'table:fiamma-dorata']));
    expect(r.equipped).toEqual({ table: 'corona-del-re', felt: 'maiolica-mediterranea', back: 'corona-reale' });
  });
  it('un profilo di prima: medaglie, statistiche e monete restano', () => {
    const p = normalize({ coins: 4321, xp: 900, trophies: { 'prima-vittoria': 5, 'cento-vittorie': 6, sparito: 7 }, cups: 37, bestCups: 40, owned: ['smeraldo', 'notte'], equipped: { felt: 'notte', pattern: 'nessuno', back: 'classico' }, stats: { won: 3, played: 5 } } as never, 'x');
    expect(p.coins).toBe(4321);
    expect(Object.keys(p.achievements)).toEqual(['prima-vittoria', 'cento-vittorie']);
    expect(p.stats.won).toBe(3);
    expect(p.equipped.felt).toBe('notte-di-velluto');
  });
});

describe('server', () => {
  it('il calendario delle stagioni nella migrazione è lo stesso di seasons.ts', async () => {
    const { readFileSync } = await import('node:fs');
    const sql = readFileSync(new URL('../../../supabase/migrations/20261028000000_progressione_lunga.sql', import.meta.url), 'utf8');
    const rows = [...sql.matchAll(/\('([a-z-]+)', (\d+), '[^']+', '(\d{4}-\d\d-\d\d)', '(\d{4}-\d\d-\d\d)'\)/g)].map(m => [m[1], Number(m[2]), m[3], m[4]]);
    expect(rows).toEqual(SEASONS.map(s => [s.id, s.n, seasonWindow(s).start, seasonWindow(s).end]));
  });
});
