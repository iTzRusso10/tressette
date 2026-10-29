// «Lampara»: i dati visivi delle cornici e dei fondi degli avatar (pacchetto B3, docs/direzione-artistica.md
// §5.6, §5.7). Il catalogo (src/meta/catalog.ts) dice cosa è una cornice; qui si dice com'è fatta: metallo,
// profilo dell'anello, smalto, ornamento, gemme, elemento narrativo dei mitici. Indicizzato per id.
//
// La scala (§5.7), che deve leggersi anche in scala di grigi:
//   comune       anello sottile e liscio (peltro, ottone, argento, rame); al più una zigrinatura
//   non comune   anello più largo con un motivo semplice: doppio filo, perline, una fascia di smalto
//   raro         argento con smalto blu: motivo + un'incastonatura (perle, alloro smaltato, zaffiro)
//   epico        argento dorato, rilievo su tutto il giro, due materiali (smalti, ametiste); il riflesso passa
//   leggendario  oro zecchino, ornamento scolpito che esce dalla sagoma (≤ 18% del raggio) e gemme a taglio
//                brillante; il riflesso passa, le gemme brillano, poche scintille
//   mitico       oro rosa, madreperla e corallo, con un segno napoletano (la corona di corallo di Partenope,
//                la luna e la lampara nel golfo); madreperla iridescente e granelli
//
// Geometria: tutto è in una tela 100×100 (centro 50, 50). `foro` è il raggio del cerchio dell'avatar e
// `spessore` lo spessore dell'anello, in frazioni della misura. Il cerchio dell'avatar resta ≥ 70% della misura
// (foro ≥ 0,35) e niente esce dalla tela (lo controlla src/ui/camerino/__tests__/cornici.test.ts).
//
// Export:
// - `METALLI`             i metalli a quattro stop (luce, medio, scuro, rimbalzo) a 160°
// - `StileCornice`, `Fascia`, `Giro`, `Gemme`   la descrizione di una cornice
// - `CORNICI`             per ogni id del posto `frame`
// - `stileCornice(id)`    la cornice di un id (sconosciuto → «semplice»)
// - `ingombro(st)`        il raggio massimo raggiunto dall'ornamento (tela 100: ≤ 50)
// - `FondoAvatar`, `FONDI_AVATAR`, `fondoAvatar(id)`   i fondi «da mazzo» dei simboli degli avatar
//
// Solo dati: il disegno sta in src/ui/avatar.tsx.
import type { Rarity } from '@/meta/rarity';

export type Metallo = readonly [string, string, string, string];

export const METALLI = {
  peltro: ['#EEEAE2', '#B3AC9F', '#6E685F', '#9C958A'],
  ottone: ['#FFF2C4', '#E6BC56', '#93681A', '#D3A040'],
  argento: ['#FFFFFF', '#CBD2DA', '#7A8490', '#AEB7C2'],
  rame: ['#F8CBA2', '#C47A48', '#783E20', '#B06A3E'],
  bronzo: ['#EED3A0', '#B08A4A', '#634820', '#9C7A40'],
  vermeil: ['#FCF0D2', '#D9BC82', '#86683E', '#C2A672'],
  zecchino: ['#FFF6CC', '#F2C24E', '#946410', '#DDA83A'],
  oroRosso: ['#FFE2BC', '#E9A25E', '#86391A', '#C9783E'],
  oroRosa: ['#FFE2CE', '#E3A07A', '#8A4630', '#C9805E'],
  brunito: ['#D8BCB2', '#8A6A64', '#2E2022', '#5E4644'],
} as const satisfies Record<string, Metallo>;

export interface Fascia {
  /** smalto (colore pieno, lucido), madreperla, madreperla nera, onice. */
  tipo: 'smalto' | 'madreperla' | 'madreperlaNera' | 'onice';
  tinta: string;
  motivo?: 'maiolica' | 'onde' | 'stelle' | 'scritta' | 'tre';
  /** Colori del motivo (maiolica: fiore, centro, foglia; tre: i tre smalti; onde/scritta: il primo). */
  colori?: readonly string[];
}

export interface Giro {
  /** L'ornamento che corre intorno all'anello. */
  tipo: 'perle' | 'alloro' | 'raggi' | 'foglie' | 'gigli' | 'fiamme' | 'semi' | 'castoni';
  n: number;
  /** Colore (foglie d'alloro smaltate, smalto dentro le fiamme, gemme dei castoni). */
  tinte?: readonly string[];
  /** Alloro e foglie d'oro pieno invece che smaltate. */
  oro?: boolean;
}

export interface Gemme {
  n: number;
  tinta: string;
  taglio: 'cabochon' | 'brillante';
  /** Angolo della prima gemma in gradi (−90 è in alto, 90 in basso). */
  da: number;
  /** Raggio della gemma (tela 100). */
  misura: number;
}

export interface StileCornice {
  id: string;
  rarita: Rarity;
  /** Il materiale, a parole (per la scheda e per l'accessibilità). */
  materiale: string;
  metallo: Metallo;
  /** Raggio del cerchio dell'avatar / misura (≥ 0,35). */
  foro: number;
  /** Spessore dell'anello / misura. */
  spessore: number;
  /** Sezione dell'anello: tondo (un toro lucido), piatto (una piastra smussata), doppio (due fili). */
  profilo: 'tondo' | 'piatto' | 'doppio';
  bordo?: 'zigrinato' | 'perline';
  fascia?: Fascia;
  giro?: Giro;
  gemme?: Gemme;
  /** In cima, scolpito: esce dalla sagoma. */
  cimiero?: 'corona' | 'corallo' | 'luna';
  /** In basso, appeso o appoggiato all'anello. */
  pendente?: 'nastro' | 'gemma' | 'conchiglia' | 'lampara';
  /** Colore del nastro o della gemma del pendente. */
  tintaPendente?: string;
}

const S = {
  bianco: '#F4F1EA',
  blu: '#1E4F99',
  giallo: '#F2C230',
  ramina: '#2E7D57',
  rubino: '#B0182C',
  zaffiro: '#2450B8',
  ametista: '#6A2C9E',
  smeraldo: '#1F8A5A',
  diamante: '#E8F2FF',
  corallo: '#D8485A',
  terracotta: '#B5532A',
};

const c = (id: string, rarita: Rarity, materiale: string, metallo: Metallo, foro: number, spessore: number, profilo: StileCornice['profilo'], extra: Partial<StileCornice> = {}): StileCornice => ({
  id,
  rarita,
  materiale,
  metallo,
  foro,
  spessore,
  profilo,
  ...extra,
});

const LISTA: StileCornice[] = [
  /* ---------------- comuni: un anello sottile, liscio, ben lucidato */
  c('semplice', 'comune', 'peltro lucidato', METALLI.peltro, 0.415, 0.05, 'tondo'),
  c('oro-sottile', 'comune', 'filo d’ottone dorato', METALLI.ottone, 0.415, 0.05, 'tondo'),
  c('argento-sottile', 'comune', 'filo d’argento', METALLI.argento, 0.415, 0.05, 'tondo'),
  c('lega-tornese', 'comune', 'rame del tornese, bordo zigrinato', METALLI.rame, 0.405, 0.06, 'piatto', { bordo: 'zigrinato' }),

  /* ---------------- non comuni: un motivo semplice */
  c('doppio-anello', 'noncomune', 'due fili di rame', METALLI.rame, 0.4, 0.078, 'doppio'),
  c('maiolica', 'noncomune', 'bronzo e maiolica di Vietri', METALLI.bronzo, 0.395, 0.088, 'piatto', {
    fascia: { tipo: 'smalto', tinta: S.bianco, motivo: 'maiolica', colori: [S.blu, S.giallo, S.ramina] },
  }),
  c('onde', 'noncomune', 'bronzo e smalto blu del golfo', METALLI.bronzo, 0.395, 0.088, 'piatto', {
    fascia: { tipo: 'smalto', tinta: S.blu, motivo: 'onde', colori: ['#D6EAFF'] },
  }),
  c('lega-grana', 'noncomune', 'bronzo della grana, perline', METALLI.bronzo, 0.4, 0.075, 'piatto', { bordo: 'perline' }),

  /* ---------------- rari: argento, smalto blu, un'incastonatura */
  c('perle', 'raro', 'argento, perle e uno zaffiro', METALLI.argento, 0.39, 0.088, 'tondo', {
    giro: { tipo: 'perle', n: 22 },
    pendente: 'gemma',
    tintaPendente: S.zaffiro,
  }),
  c('alloro', 'raro', 'argento e alloro smaltato', METALLI.argento, 0.37, 0.065, 'tondo', {
    giro: { tipo: 'alloro', n: 16, tinte: [S.ramina] },
    pendente: 'nastro',
    tintaPendente: S.blu,
  }),
  c('lega-carlino', 'raro', 'argento del carlino e smalto blu', METALLI.argento, 0.39, 0.092, 'piatto', {
    bordo: 'zigrinato',
    fascia: { tipo: 'smalto', tinta: S.blu, motivo: 'scritta', colori: ['#E6ECF4'] },
    gemme: { n: 1, tinta: S.zaffiro, taglio: 'cabochon', da: -90, misura: 3.2 },
  }),

  /* ---------------- epici: argento dorato, rilievo su tutto il giro, due materiali */
  c('stelle', 'epico', 'argento dorato e lapislazzuli', METALLI.vermeil, 0.38, 0.1, 'piatto', {
    bordo: 'perline',
    fascia: { tipo: 'smalto', tinta: '#17224D', motivo: 'stelle' },
    gemme: { n: 4, tinta: S.ametista, taglio: 'cabochon', da: 45, misura: 2.6 },
  }),
  c('raggi', 'epico', 'argento dorato e smalto d’ambra', METALLI.vermeil, 0.375, 0.075, 'tondo', {
    giro: { tipo: 'raggi', n: 32 },
    fascia: { tipo: 'smalto', tinta: '#B8561E' },
  }),
  c('lega-piastra', 'epico', 'argento della piastra e smalto azzurro', METALLI.argento, 0.375, 0.094, 'piatto', {
    bordo: 'zigrinato',
    giro: { tipo: 'foglie', n: 24 },
    fascia: { tipo: 'smalto', tinta: '#2A5EA8', motivo: 'scritta', colori: ['#EEF4FF'] },
  }),
  c('lega-ducato', 'epico', 'oro del ducato e porpora', METALLI.vermeil, 0.375, 0.094, 'piatto', {
    bordo: 'perline',
    giro: { tipo: 'foglie', n: 24 },
    fascia: { tipo: 'smalto', tinta: '#4A1A5E', motivo: 'scritta', colori: ['#F6E3B0'] },
  }),
  c('evento-scopa', 'epico', 'argento dorato e smalto d’ametista', METALLI.vermeil, 0.38, 0.095, 'piatto', {
    fascia: { tipo: 'smalto', tinta: '#5A2490', motivo: 'onde', colori: ['#EADCFF'] },
    gemme: { n: 4, tinta: S.ametista, taglio: 'cabochon', da: 0, misura: 2.5 },
  }),
  c('evento-briscola', 'epico', 'argento dorato e i quattro semi smaltati', METALLI.vermeil, 0.38, 0.09, 'tondo', {
    giro: { tipo: 'semi', n: 4 },
    fascia: { tipo: 'smalto', tinta: '#7A1A3A' },
  }),
  c('evento-tressette', 'epico', 'argento dorato e terracotta smaltata', METALLI.vermeil, 0.38, 0.095, 'piatto', {
    bordo: 'perline',
    fascia: { tipo: 'smalto', tinta: S.terracotta, motivo: 'maiolica', colori: [S.bianco, S.giallo, '#1E4F99'] },
  }),
  c('evento-festa', 'epico', 'argento dorato e castoni di smalto', METALLI.vermeil, 0.38, 0.09, 'tondo', {
    giro: { tipo: 'castoni', n: 12, tinte: ['#1FA08A', S.corallo, S.giallo] },
  }),
  c('segreto-tre-semi', 'epico', 'argento dorato e i tre smalti dei giochi', METALLI.vermeil, 0.38, 0.1, 'piatto', {
    fascia: { tipo: 'smalto', tinta: S.terracotta, motivo: 'tre', colori: [S.terracotta, S.corallo, S.blu] },
    gemme: { n: 3, tinta: S.diamante, taglio: 'brillante', da: -90, misura: 2.6 },
  }),

  /* ---------------- leggendari: oro zecchino scolpito e gemme a taglio brillante */
  c('gemme', 'leggendario', 'oro zecchino, rubini e diamanti', METALLI.zecchino, 0.36, 0.1, 'tondo', {
    bordo: 'perline',
    giro: { tipo: 'castoni', n: 8, tinte: [S.diamante] },
    gemme: { n: 4, tinta: S.rubino, taglio: 'brillante', da: -90, misura: 5.6 },
  }),
  c('corona', 'leggendario', 'oro zecchino, rubini, zaffiri e perle', METALLI.zecchino, 0.35, 0.08, 'tondo', {
    bordo: 'perline',
    cimiero: 'corona',
    giro: { tipo: 'castoni', n: 6, tinte: [S.zaffiro, S.rubino] },
  }),
  c('lega-oncia', 'leggendario', 'oro rosso dell’oncia e smalto rosa', METALLI.oroRosso, 0.36, 0.09, 'piatto', {
    giro: { tipo: 'raggi', n: 24 },
    fascia: { tipo: 'smalto', tinta: '#B02858', motivo: 'scritta', colori: ['#FFE0EA'] },
    gemme: { n: 4, tinta: '#E04880', taglio: 'brillante', da: -90, misura: 3.4 },
  }),
  c('podio-settimana', 'leggendario', 'alloro d’oro zecchino e nastro rosso', METALLI.zecchino, 0.36, 0.075, 'tondo', {
    giro: { tipo: 'alloro', n: 20, oro: true },
    pendente: 'nastro',
    tintaPendente: '#A8323C',
    gemme: { n: 1, tinta: S.smeraldo, taglio: 'brillante', da: -90, misura: 3.6 },
  }),
  c('evento-maestri', 'leggendario', 'oro zecchino, onice e zaffiri', METALLI.zecchino, 0.36, 0.1, 'piatto', {
    fascia: { tipo: 'onice', tinta: '#14101C' },
    giro: { tipo: 'gigli', n: 4 },
    gemme: { n: 4, tinta: S.zaffiro, taglio: 'brillante', da: 45, misura: 3.4 },
  }),
  c('segreto-rimonta', 'leggendario', 'oro rosso scolpito a fiamme e opali di fuoco', METALLI.oroRosso, 0.35, 0.078, 'tondo', {
    bordo: 'perline',
    fascia: { tipo: 'smalto', tinta: '#7A1A10' },
    giro: { tipo: 'fiamme', n: 14, tinte: ['#E0461E'] },
    gemme: { n: 3, tinta: '#FF7A2A', taglio: 'brillante', da: -90, misura: 3.4 },
  }),

  /* ---------------- mitici: oro rosa, madreperla, corallo e un segno napoletano */
  c('lega-re', 'mitico', 'oro rosa, madreperla e la corona di corallo di Partenope', METALLI.oroRosa, 0.35, 0.11, 'tondo', {
    bordo: 'perline',
    fascia: { tipo: 'madreperla', tinta: '#F6EEF2' },
    cimiero: 'corallo',
    pendente: 'conchiglia',
    giro: { tipo: 'foglie', n: 28 },
    gemme: { n: 4, tinta: S.corallo, taglio: 'cabochon', da: 45, misura: 3.6 },
  }),
  c('segreto-ombra', 'mitico', 'oro brunito, madreperla nera, la luna e la lampara nel golfo', METALLI.brunito, 0.35, 0.11, 'piatto', {
    bordo: 'perline',
    fascia: { tipo: 'madreperlaNera', tinta: '#23212E', motivo: 'onde', colori: ['#DCE8F6'] },
    cimiero: 'luna',
    pendente: 'lampara',
    giro: { tipo: 'raggi', n: 36 },
    gemme: { n: 4, tinta: S.diamante, taglio: 'brillante', da: -35, misura: 2.8 },
  }),
];

export const CORNICI: Record<string, StileCornice> = Object.fromEntries(LISTA.map(s => [s.id, s]));

/** La cornice di un id; un id sconosciuto vale «semplice». */
export function stileCornice(id: string | undefined): StileCornice {
  return (id && CORNICI[id]) || CORNICI.semplice;
}

/** Il raggio esterno dell'anello (tela 100). */
export const raggioAnello = (st: StileCornice) => (st.foro + st.spessore) * 100;

/** Il raggio massimo raggiunto da qualcosa della cornice (tela 100): deve stare ≤ 50. */
export function ingombro(st: StileCornice): number {
  const R = raggioAnello(st);
  let m = R + (st.bordo === 'perline' ? 0.2 : 0);
  const g = st.giro;
  if (g?.tipo === 'raggi') m = Math.max(m, R + Math.min(4.8, 49.2 - R));
  if (g?.tipo === 'alloro') m = Math.max(m, R + 6.4);
  if (g?.tipo === 'foglie') m = Math.max(m, R + 2.4);
  if (g?.tipo === 'gigli') m = Math.max(m, Math.min(R + 6.2, 49.4));
  if (g?.tipo === 'fiamme') m = Math.max(m, Math.min(R + 6.6, 48.2) + 1.2);
  if (st.gemme && st.gemme.misura > 4) m = Math.max(m, R - st.spessore * 50 + st.gemme.misura * 1.3);
  if (st.cimiero) m = Math.max(m, 49.6);
  if (st.pendente === 'nastro') m = Math.max(m, 49.4);
  if (st.pendente === 'lampara' || st.pendente === 'conchiglia') m = Math.max(m, 49.4);
  return m;
}

/* ------------------------------------------------------------------ fondi degli avatar */

/**
 * Il fondo di un simbolo: «da mazzo». I semi su carta avorio con il doppio filetto stampato nel colore del
 * seme, come le napoletane; il resto su un materiale: velluto, smalto di maiolica, notte, panno, il tramonto
 * dietro il Vesuvio.
 */
export interface FondoAvatar {
  /** Il materiale del fondo. */
  tipo: 'carta' | 'velluto' | 'smalto' | 'notte' | 'panno' | 'cielo';
  /** Dall'alto a sinistra (luce) al basso a destra. */
  fondo: readonly [string, string];
  /** Colore del simbolo. */
  segno: string;
  /** Il doppio filetto stampato (carta), o un filo d'oro (gli altri). */
  filo: string;
}

const carta = (segno: string, filo = segno): FondoAvatar => ({ tipo: 'carta', fondo: ['#F7EDDB', '#E2D0AC'], segno, filo });

export const FONDI_AVATAR: Record<string, FondoAvatar> = {
  iniziale: { tipo: 'velluto', fondo: ['#8A2A3A', '#3A0E18'], segno: '#E6C36A', filo: '#C9A15A' },
  foto: { tipo: 'velluto', fondo: ['#8A2A3A', '#3A0E18'], segno: '#E6C36A', filo: '#C9A15A' },
  coppa: carta('#B5312B'),
  denaro: carta('#C8861A', '#B5312B'),
  spada: carta('#2B4E8C'),
  bastone: carta('#3E6E3A'),
  sole: { tipo: 'smalto', fondo: ['#2E64B0', '#123468'], segno: '#F2C230', filo: '#F4F1EA' },
  luna: { tipo: 'notte', fondo: ['#26345E', '#0C1230'], segno: '#F3E3B0', filo: '#C9A15A' },
  corona: { tipo: 'velluto', fondo: ['#8A2A3A', '#3A0E18'], segno: '#E6C36A', filo: '#C9A15A' },
  vesuvio: { tipo: 'cielo', fondo: ['#F0A066', '#6A2A4A'], segno: '#2A1418', filo: '#F6D6A8' },
  limone: { tipo: 'smalto', fondo: ['#2A5FA8', '#0E2E66'], segno: '#F2C230', filo: '#F4F1EA' },
  corno: carta('#C42A36'),
  sette: { tipo: 'panno', fondo: ['#178A70', '#06352E'], segno: '#E6C36A', filo: '#C9A15A' },
  stella: { tipo: 'notte', fondo: ['#22305E', '#0A1029'], segno: '#E6C36A', filo: '#C9A15A' },
};

export function fondoAvatar(id: string | undefined): FondoAvatar {
  return (id && FONDI_AVATAR[id]) || FONDI_AVATAR.iniziale;
}
