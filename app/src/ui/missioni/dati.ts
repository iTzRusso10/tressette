// «La bacheca del circolo»: i dati che la bacheca mostra (docs/direzione-artistica.md §5.17). Funzioni pure.
//
// Legge soltanto: `activeMissions`, `missionProgress`, `eventProgressOf`, `seasonMissionProgress` di ledger.ts,
// `daysToWeekEnd` di missions.ts, eventi e stagioni. Nessuna regola nuova: chi completa, chi riscuote e chi
// cambia una missione resta ledger.ts (tramite claim e swapDailyMission di profile.ts).
//
// Export:
// - `StatoMissione`        'dafare' | 'incorso' | 'riscuotere' | 'riscossa'
// - `TipoIcona`            il tipo di obiettivo (decide l'icona di smalto)
// - `Ricompensa`           { coins, xp, item? }
// - `BigliettoDati`        una missione del giorno o della settimana pronta da disegnare
// - `RigaSpeciale`, `SpecialeDati`   un manifesto (evento in corso, prossimo evento, stagione)
// - `bachecaDi(p, day)`    { giorno, settimana, cambioLibero, giorniSettimana, daRiscuotere }
// - `specialiDi(p, day)`   i manifesti da appendere (evento e stagione)
// - `iconaDi(id)`, `BREVE`, `breveDi(def)`   icona e frase corta di una missione
// - `oreAMezzanotte(now)`  «5 ore», «meno di un’ora»
// - `quanteMonete`, `misuraMoneta`, `scaglioneTutto(n)`   misure del volo delle monete (§5.10)
// - `semeDi(testo)`        un numero stabile da una chiave (per storture e matita con seeded())
import type { Progress } from '@/meta/ledger';
import { activeMissions, eventProgressOf, missionProgress, seasonMissionProgress } from '@/meta/ledger';
import { daysToWeekEnd, type MissionDef } from '@/meta/missions';
import { daysLeftIn, daysUntil, eventAt, nextEvent, type EventTemplate } from '@/meta/events';
import { daysLeft, seasonAt } from '@/meta/seasons';

export type StatoMissione = 'dafare' | 'incorso' | 'riscuotere' | 'riscossa';

export type TipoIcona = 'vittoria' | 'partita' | 'trofei' | 'scopa' | 'mani' | 'punti' | 'serie' | 'esperto' | 'online' | 'oggetto' | 'calendario' | 'giochi' | 'quattro';

export interface Ricompensa {
  coins: number;
  xp: number;
  /** Chiave del catalogo, se la ricompensa è anche un oggetto. */
  item?: string;
}

export interface BigliettoDati {
  key: string;
  id: string;
  periodo: 'daily' | 'weekly';
  /** La frase intera (missions.ts). */
  testo: string;
  /** La frase corta senza il numero, per i biglietti piccoli e le locandine: il numero si scrive in Bodoni. */
  breve: string;
  have: number;
  goal: number;
  ricompensa: Ricompensa;
  stato: StatoMissione;
  claimId: string;
  /** Si può cambiare adesso (una del giorno, non fatta, nessun cambio oggi). */
  cambiabile: boolean;
  icona: TipoIcona;
  seme: number;
}

/** Il tipo di obiettivo di ogni missione (l'icona di smalto). Le missioni nuove senza voce usano `iconaDi`. */
const ICONE: Record<string, TipoIcona> = {
  'vinci-scopa-2': 'vittoria',
  'vinci-briscola-3': 'vittoria',
  'gioca-tressette-2': 'partita',
  'gioca-5': 'partita',
  'vinci-1': 'vittoria',
  'trofei-20': 'trofei',
  'tre-giochi': 'giochi',
  'cosmetico-nuovo': 'oggetto',
  'vinci-medio-2': 'esperto',
  'vinci-quattro': 'quattro',
  'gioca-3': 'partita',
  'due-giochi': 'giochi',
  'mani-4': 'mani',
  'scope-3': 'scopa',
  'briscola-80': 'punti',
  'vinci-25': 'vittoria',
  'cinque-per-gioco': 'giochi',
  'trofei-100': 'trofei',
  'quindici-giornaliere': 'calendario',
  'cinque-di-fila': 'serie',
  'online-10': 'online',
  'nuovo-oggetto': 'oggetto',
  'esperto-5': 'esperto',
  'gioca-40': 'partita',
  'vinci-15': 'vittoria',
  'cinque-ogni-gioco': 'giochi',
  'dieci-un-gioco': 'vittoria',
};

export function iconaDi(id: string): TipoIcona {
  if (ICONE[id]) return ICONE[id];
  if (id.includes('online')) return 'online';
  if (id.includes('trofei')) return 'trofei';
  if (id.includes('scop')) return 'scopa';
  if (id.includes('esperto')) return 'esperto';
  if (id.startsWith('vinci')) return 'vittoria';
  return 'partita';
}

/** La frase corta, letta dopo il numero in Bodoni: «3» «vittorie a Briscola». */
export const BREVE: Record<string, string> = {
  'vinci-scopa-2': 'vittorie a Scopa',
  'vinci-briscola-3': 'vittorie a Briscola',
  'gioca-tressette-2': 'partite di Tressette',
  'gioca-5': 'partite fino in fondo',
  'vinci-1': 'vittoria fino in fondo',
  'trofei-20': 'trofei guadagnati',
  'tre-giochi': 'giochi: una partita per gioco',
  'cosmetico-nuovo': 'partita con un tavolo diverso',
  'vinci-medio-2': 'vittorie su Medio o Esperto',
  'vinci-quattro': 'vittoria in quattro',
  'gioca-3': 'partite fino in fondo',
  'due-giochi': 'giochi diversi',
  'mani-4': 'mani vinte',
  'scope-3': 'scope',
  'briscola-80': 'mano di Briscola da 80 punti',
  'vinci-25': 'vittorie',
  'cinque-per-gioco': 'vittorie, 5 per gioco',
  'trofei-100': 'trofei guadagnati',
  'quindici-giornaliere': 'missioni del giorno',
  'cinque-di-fila': 'vittorie di fila',
  'online-10': 'partite online',
  'nuovo-oggetto': 'oggetto estetico nuovo',
  'esperto-5': 'vittorie contro l’Esperto',
  'gioca-40': 'partite fino in fondo',
  'vinci-15': 'vittorie',
  'cinque-ogni-gioco': 'partite, 5 per gioco',
  'dieci-un-gioco': 'vittorie in un solo gioco',
};

export const breveDi = (def: Pick<MissionDef, 'id' | 'text'>) => BREVE[def.id] ?? def.text;

/** Un numero stabile da una chiave (FNV-1a), per seeded(). */
export function semeDi(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function statoDi(done: boolean, daRiscuotere: boolean, have: number): StatoMissione {
  if (daRiscuotere) return 'riscuotere';
  if (done) return 'riscossa';
  return have > 0 ? 'incorso' : 'dafare';
}

export interface Bacheca {
  giorno: BigliettoDati[];
  settimana: BigliettoDati[];
  /** Oggi si può ancora cambiare una missione del giorno. */
  cambioLibero: boolean;
  /** Giorni alla fine della settimana, compreso oggi. */
  giorniSettimana: number;
}

/** Le missioni attive del giorno `day` e della sua settimana, con lo stato di ciascuna. */
export function bachecaDi(p: Progress, day: string): Bacheca {
  const m = p.meta.missions;
  const cambioLibero = !(m.swaps[day]?.length ?? 0);
  const giorno: BigliettoDati[] = [];
  const settimana: BigliettoDati[] = [];
  for (const { def, key } of activeMissions(p, day)) {
    const done = m.done.includes(key);
    const claimId = `m:${key}`;
    const daRiscuotere = p.meta.claims.some(c => c.id === claimId);
    // Le chiavi hanno il giorno (o la settimana) dentro: a un giorno nuovo il progresso riparte da zero.
    const have = Math.min(def.goal, done ? def.goal : missionProgress(p, key));
    const b: BigliettoDati = {
      key,
      id: def.id,
      periodo: def.period,
      testo: def.text,
      breve: breveDi(def),
      have,
      goal: def.goal,
      ricompensa: { coins: def.coins, xp: def.xp },
      stato: statoDi(done, daRiscuotere, have),
      claimId,
      cambiabile: def.period === 'daily' && !done && cambioLibero,
      icona: iconaDi(def.id),
      seme: semeDi(key),
    };
    (def.period === 'daily' ? giorno : settimana).push(b);
  }
  return { giorno, settimana, cambioLibero, giorniSettimana: daysToWeekEnd(day) };
}

/* ------------------------------------------------------------------ manifesti */

export interface RigaSpeciale {
  /** Cosa chiede la riga: «5 vittorie» per un traguardo, la frase per una missione di stagione. */
  testo: string;
  have: number;
  goal: number;
  ricompensa: Ricompensa;
  stato: StatoMissione;
  claimId: string;
}

export interface SpecialeDati {
  id: string;
  tipo: 'evento' | 'prossimo' | 'stagione';
  occhiello: string;
  /** Quanto manca: «Ancora 4 giorni, fino al 1 novembre». */
  scadenza: string;
  titolo: string;
  testo: string;
  icona: TipoIcona;
  /** Per l'evento: il progresso unico sui tre traguardi. */
  have?: number;
  top?: number;
  unita?: string;
  righe: RigaSpeciale[];
}

function iconaEvento(t: EventTemplate): TipoIcona {
  if (t.id.includes('scopa')) return 'scopa';
  if (t.id.includes('maestri')) return 'esperto';
  if (t.id.includes('festa')) return 'partita';
  return 'trofei';
}

const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const data = (d: string) => {
  const [, mm, g] = d.split('-').map(Number);
  return `${g} ${MESI[mm - 1]}`;
};

/** L'evento in corso (o il prossimo) e la stagione in corso, come manifesti. */
export function specialiDi(p: Progress, day: string): SpecialeDati[] {
  const out: SpecialeDati[] = [];
  const ev = eventAt(day);
  if (ev) {
    const t = ev.template;
    const mine = p.meta.event.id === ev.id;
    const have = mine ? eventProgressOf(p) : 0;
    const reached = mine ? p.meta.event.tiers : [];
    const left = daysLeftIn(ev, day);
    out.push({
      id: ev.id,
      tipo: 'evento',
      occhiello: 'Obiettivo speciale',
      scadenza: `${left === 1 ? 'Ultimo giorno' : `Ancora ${left} giorni`}, fino al ${data(ev.end)}`,
      titolo: t.name,
      testo: t.desc,
      icona: iconaEvento(t),
      have,
      top: t.tiers[t.tiers.length - 1],
      unita: t.unit,
      righe: t.tiers.map((goal, i) => {
        const r = t.rewards[i];
        const claimId = `evento:${ev.id}:${i}`;
        const daRiscuotere = p.meta.claims.some(c => c.id === claimId);
        return {
          testo: `${goal} ${t.unit.split(' ')[0]}`,
          have: Math.min(goal, have),
          goal,
          ricompensa: { coins: r.coins ?? 0, xp: 0, item: r.items?.[0] },
          stato: statoDi(reached.includes(i), daRiscuotere, Math.min(goal, have)),
          claimId,
        };
      }),
    });
  } else {
    const nx = nextEvent(day);
    const t = nx.template;
    const last = t.rewards[t.rewards.length - 1];
    const d = daysUntil(nx, day);
    out.push({
      id: nx.id,
      tipo: 'prossimo',
      occhiello: 'Prossimo evento',
      scadenza: `${d === 1 ? 'Comincia domani' : `Comincia tra ${d} giorni`}: dal ${data(nx.start)} al ${data(nx.end)}`,
      titolo: t.name,
      testo: t.desc,
      icona: iconaEvento(t),
      righe: last.items?.[0]
        ? [{ testo: 'Premio finale', have: 0, goal: 1, ricompensa: { coins: 0, xp: 0, item: last.items[0] }, stato: 'dafare', claimId: '' }]
        : [],
    });
  }
  const s = seasonAt(day);
  if (s) {
    const mine = p.meta.season.id === s.season.id ? p.meta.season : null;
    const left = daysLeft(s, day);
    out.push({
      id: s.season.id,
      tipo: 'stagione',
      occhiello: `Stagione ${s.season.n}`,
      scadenza: `${left === 1 ? 'Ultimo giorno' : `Ancora ${left} giorni`}, fino al ${data(s.end)}`,
      titolo: s.season.name,
      testo: `Le missioni di stagione contano dal ${data(s.start)}.`,
      icona: 'trofei',
      righe: s.season.missions.map(m => {
        const claimId = `stagione:${s.season.id}:${m.id}`;
        const [a, b] = seasonMissionProgress(p, m);
        const have = mine ? Math.min(a, b) : 0;
        const done = !!mine?.missions.includes(m.id);
        return {
          testo: m.text,
          have: done ? b : have,
          goal: b,
          ricompensa: { coins: m.coins, xp: m.xp },
          stato: statoDi(done, p.meta.claims.some(c => c.id === claimId), have),
          claimId,
        };
      }),
    });
  }
  return out;
}

/* ------------------------------------------------------------------ tempi e misure */

export function oreAMezzanotte(now: Date): string {
  const end = new Date(now);
  end.setHours(24, 0, 0, 0);
  const h = Math.ceil((end.getTime() - now.getTime()) / 3600000);
  return h <= 1 ? 'meno di un’ora' : `${h} ore`;
}

/** Millisecondi alla prossima mezzanotte locale (per rinnovare la bacheca al cambio del giorno). */
export function msAMezzanotte(now: Date): number {
  const end = new Date(now);
  end.setHours(24, 0, 2, 0);
  return Math.max(1000, end.getTime() - now.getTime());
}

/**
 * Monete in volo per una busta. Sempre 5 (il minimo di MoneteInVolo): l'ultima arriva a 4 × 40 + 520 = 680 ms,
 * entro i 700 della ricompensa piccola (§5.11). La grandezza del premio la dicono la misura delle monete e il
 * conteggio.
 */
export const quanteMonete = (_coins: number) => 5;

/** Diametro delle monete in volo: cresce con il premio (proporzionato, §5.10). */
export const misuraMoneta = (coins: number) => (coins >= 300 ? 26 : coins >= 80 ? 23 : 20);

/** Quando arriva l'ultima moneta di un volo, dalla partenza. */
/** mov.volo e mov.scaglione di arte/movimento.ts (qui scritti a mano: il file resta puro, senza Reanimated). */
export const VOLO = 520;
export const SCAGLIONE_VOLO = 40;
export const arrivoUltima = (quante = 5) => VOLO + (quante - 1) * SCAGLIONE_VOLO;
/** Quando l'ultima moneta è sul contatore: al 92% del suo volo (con ease.move è il 99,8% della strada). */
export const fineVolo = (quante = 5) => Math.round((quante - 1) * SCAGLIONE_VOLO + VOLO * 0.92);

/**
 * Lo scaglione di «Riscuoti tutto» tra una busta e l'altra: 120 ms come da §5.10, ridotto quando le buste sono
 * tante perché l'ultima moneta arrivi entro 1,2 s (7 buste: 6 × 63 + 638 = 1016 ms, con margine per un telefono lento).
 */
export function scaglioneTutto(n: number): number {
  if (n <= 1) return 0;
  return Math.min(120, Math.floor((1200 - 180 - fineVolo()) / (n - 1)));
}
