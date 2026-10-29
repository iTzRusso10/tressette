// «Lampara»: i token del sistema visivo (docs/direzione-artistica.md §5.1, 5.2, 5.4, 5.5).
//
// Tre livelli, come nella skill design-system:
// - PRIMITIVI: i materiali (noce, ottone, carta…), solo valori.
// - SEMANTICI (`fondo`, `superficie`, `testo`, `accento`, `azione`, `stato`): i ruoli. I componenti usano questi.
// - di COMPONENTE: dentro ogni componente, sempre a partire dai semantici.
//
// Export:
// - `primitivi`          le famiglie di materiale (luce, medio, scuro, ombra…)
// - `fondo`, `superficie`, `testo`, `accento`, `azione`, `stato`   i ruoli semantici
// - `fontArte`           i nomi dei caratteri (Bodoni Moda 600/700/800 caricati in _layout; Sora già presente)
// - `tipografia`         gli stili di testo per ruolo (TextStyle pronti: nomeSvelamento, nomeProfilo, nomeOggetto,
//                        titoloSezione, occhiello, occhielloCarta, numero, inciso). Bodoni mai sotto 20 pt.
// - `raggi`              raggi nuovi: superficie 14, targa 10, carta 4, biglietto 3
// - `LIVELLI`            i sei livelli di profondità (0 sfondo … 5 sovrapposto) con la parallasse di ciascuno
// - `COPPIE_CONTRASTO`   le coppie testo/fondo dichiarate, controllate da __tests__/contrasto.test.ts
// - `rapportoContrasto(a, b)`  il rapporto WCAG tra due colori #RRGGBB
// - `mescola(a, b, t)`, `conAlfa(hex, a)`, `stopSmalto(tinta)`  aiuti puri per i colori
//
// Nessun import di React Native: il file si usa anche nei test.
import type { TextStyle } from 'react-native';

/* ------------------------------------------------------------------ primitivi */

export const primitivi = {
  notte: { luce: '#34211F', medio: '#2A1A1C', scuro: '#1E1316', ombra: '#140C0E' },
  noce: { luce: '#7A4E30', medio: '#5A3A26', scuro: '#3B2418', ombra: '#22140C', filoChiaro: '#A87A50', filoScuro: '#1A0E08' },
  ottone: { luce: '#F5DFA0', medio: '#C9A15A', scuro: '#8A6526', ombra: '#4A3410', filo: '#FFF3C8' },
  fogliaOro: '#E6C36A',
  carta: { luce: '#F6EBD9', medio: '#F3E9D2', scuro: '#E4D4B4', bordo: '#CBB68E' },
  inchiostro: { forte: '#2A1810', tenue: '#5C4434', rosso: '#8E1A26' },
  velluto: { luce: '#7A2433', medio: '#4A1420', ombra: '#24080E' },
  ceralacca: { luce: '#A8323C', medio: '#8E1A26', scuro: '#6E1A22' },
  maiolica: { bianco: '#F4F1EA', blu: '#1E4F99', giallo: '#F2C230', ramina: '#2E7D57', raminaScura: '#1F6A49' },
  marmo: { luce: '#EDE6DA', medio: '#D8CDBA', vena: '#8E8478' },
  cuoio: { luce: '#8A4428', medio: '#6A3A22', scuro: '#3A1E12' },
  sughero: { medio: '#B98A5A', scuro: '#8E6440' },
  panno: { luce: '#14806A', medio: '#0B4D42', scuro: '#06352E' },
  lampada: '#FFD9A0',
  notteFredda: { rimbalzo: '#3A4A6A', luna: '#CFE2FF' },
  /** Nero caldo delle ombre: mai viola, mai colorato. */
  ombra: '#080304',
} as const;

/* ------------------------------------------------------------------ semantici */

export const fondo = {
  /** Fondo di ogni schermata, fuori dalla luce. */
  base: primitivi.notte.ombra,
  /** Il centro della pozza di luce. */
  luce: primitivi.notte.scuro,
} as const;

export const superficie = {
  /** Pannelli scuri (cuoio, legno scuro). */
  s1: primitivi.notte.medio,
  /** Superficie rialzata, riga premuta. */
  s2: primitivi.notte.luce,
  /** Biglietti, schede di carta, libro mastro. */
  carta: primitivi.carta.medio,
} as const;

export const testo = {
  /** Testi su scuro. */
  forte: primitivi.carta.luce,
  /** Sottotitoli su scuro. */
  medio: '#D8C6AA',
  /** Note, contatori su scuro (mai sotto 12 pt). */
  tenue: '#B4A086',
  /** Testi su carta e su ottone. */
  inchiostro: primitivi.inchiostro.forte,
  /** Note su carta. */
  inchiostroTenue: primitivi.inchiostro.tenue,
  /** Rosso tipografico su carta (occhielli, filetti). */
  rosso: primitivi.inchiostro.rosso,
} as const;

export const accento = {
  /** Numeri importanti, titoli piccoli, filetti su scuro. */
  oro: primitivi.fogliaOro,
} as const;

export const azione = {
  /** Il pulsante più importante della schermata (uno solo): placca d'ottone, testo inchiostro. */
  principale: { stop: [primitivi.ottone.luce, primitivi.ottone.medio, primitivi.ottone.scuro] as const, testo: testo.inchiostro },
  /** Noce, testo avorio. */
  secondaria: { stop: [primitivi.noce.luce, primitivi.noce.scuro] as const, testo: testo.forte },
  /** Ceralacca, testo avorio. */
  pericolo: { colore: primitivi.ceralacca.luce, testo: testo.forte },
} as const;

export const stato = {
  successo: '#5FB37E',
  pronto: accento.oro,
  errore: '#F08A72',
  info: '#6FA8E8',
  bloccato: testo.tenue,
} as const;

/* ------------------------------------------------------------------ tipografia */

export const fontArte = {
  bodoniSemi: 'BodoniModa_600SemiBold',
  bodoni: 'BodoniModa_700Bold',
  bodoniExtra: 'BodoniModa_800ExtraBold',
  sora: 'Sora_500Medium',
  soraSemi: 'Sora_600SemiBold',
  soraBold: 'Sora_700Bold',
  soraExtra: 'Sora_800ExtraBold',
} as const;

/** Stili di testo per ruolo (§5.2). Colore di default per il fondo scuro; su carta si cambia il colore. */
export const tipografia = {
  /** Nome del luogo nello svelamento. */
  nomeSvelamento: { fontFamily: fontArte.bodoni, fontSize: 40, lineHeight: 46, color: testo.forte, letterSpacing: -0.2 },
  /** Nome del giocatore nel profilo. */
  nomeProfilo: { fontFamily: fontArte.bodoni, fontSize: 32, lineHeight: 38, color: testo.forte, letterSpacing: -0.1 },
  /** Nome di un oggetto nella sua scheda. */
  nomeOggetto: { fontFamily: fontArte.bodoni, fontSize: 26, lineHeight: 32, color: testo.forte },
  /** Titolo di sezione dentro una schermata di vetrina. */
  titoloSezione: { fontFamily: fontArte.bodoniSemi, fontSize: 22, lineHeight: 28, color: testo.forte },
  /** Occhiello su scuro: «ARENA 14 · CAPITOLO III». Va scritto in maiuscolo. */
  occhiello: { fontFamily: fontArte.soraSemi, fontSize: 12, lineHeight: 16, letterSpacing: 1.4, color: accento.oro },
  /** Occhiello su carta: rosso tipografico. */
  occhielloCarta: { fontFamily: fontArte.soraSemi, fontSize: 12, lineHeight: 16, letterSpacing: 1.4, color: testo.rosso },
  /** Numeri (monete, trofei, contatori): cifre tabellari, niente che balla mentre conta. */
  numero: { fontFamily: fontArte.soraBold, fontVariant: ['tabular-nums'], color: testo.forte },
  /** Testo inciso nell'ottone: la luce viene dall'alto, quindi il filo chiaro sta sotto la lettera. */
  inciso: {
    color: testo.inchiostro,
    textShadowColor: 'rgba(255,240,200,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 0,
  },
} satisfies Record<string, TextStyle>;

/* ------------------------------------------------------------------ misure */

/** Raggi nuovi di Lampara (quelli di theme.ts restano per il Tramonto). */
export const raggi = { superficie: 14, targa: 10, carta: 4, biglietto: 3 } as const;

/** I sei livelli di profondità (§5.5). Lo stesso livello ha la stessa ombra ovunque (vedi luce.ts `ombra`). */
export const LIVELLI = {
  sfondo: { n: 0, parallasse: 0.2 },
  ambiente: { n: 1, parallasse: 0.5 },
  superficie: { n: 2, parallasse: 1 },
  oggetto: { n: 3, parallasse: 1 },
  primoPiano: { n: 4, parallasse: 1 },
  sovrapposto: { n: 5, parallasse: 1, velo: 'rgba(20,12,14,0.84)' },
} as const;

/* ------------------------------------------------------------------ colori */

const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** Mescola due colori #RRGGBB: t = 0 dà `a`, t = 1 dà `b`. */
export function mescola(a: string, b: string, t: number): string {
  const x = rgb(a);
  const y = rgb(b);
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('').toUpperCase();
}

/** Un colore #RRGGBB con alfa, come stringa rgba(). */
export function conAlfa(hex: string, a: number): string {
  const [r, g, b] = rgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

/** Gli stop dello smalto a 160° (più chiaro in alto a sinistra, più scuro in basso a destra). */
export function stopSmalto(tinta: string): [string, string, string] {
  return [mescola(tinta, '#FFFFFF', 0.1), tinta, mescola(tinta, '#000000', 0.25)];
}

/* ------------------------------------------------------------------ contrasti */

const lum = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    .map(v => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    })
    .reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
};

/** Rapporto di contrasto WCAG tra due colori #RRGGBB. */
export function rapportoContrasto(a: string, b: string): number {
  const x = lum(a);
  const y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

export interface CoppiaContrasto {
  testo: string;
  fondo: string;
  dove: string;
  /** Solo testi grandi (≥ 18,5 pt grassetto o ≥ 24 pt): basta 3:1. */
  grande?: boolean;
}

/**
 * Ogni coppia testo/fondo usata dai componenti di src/ui/arte. Il test la verifica: ≥ 4,5:1 (≥ 3:1 se grande).
 * Chi aggiunge un colore di testo nuovo aggiunge qui la sua coppia.
 */
export const COPPIE_CONTRASTO: readonly CoppiaContrasto[] = [
  { testo: testo.forte, fondo: fondo.base, dove: 'testo su sala' },
  { testo: testo.forte, fondo: superficie.s1, dove: 'testo su pannello' },
  { testo: testo.forte, fondo: primitivi.noce.scuro, dove: 'testo su noce scuro' },
  { testo: testo.forte, fondo: primitivi.noce.luce, dove: 'pulsante noce, parte più chiara' },
  { testo: testo.forte, fondo: primitivi.velluto.medio, dove: 'testo su velluto' },
  { testo: testo.forte, fondo: primitivi.panno.medio, dove: 'testo su panno' },
  { testo: testo.forte, fondo: primitivi.cuoio.luce, dove: 'testo su cuoio, parte più chiara' },
  { testo: testo.forte, fondo: primitivi.ceralacca.luce, dove: 'pulsante ceralacca, sigillo' },
  { testo: testo.forte, fondo: stopSmalto(primitivi.ceralacca.luce)[0], dove: 'pulsante pericolo, parte più chiara' },
  { testo: testo.forte, fondo: stopSmalto(primitivi.maiolica.blu)[0], dove: 'smalto blu, parte più chiara' },
  { testo: testo.forte, fondo: primitivi.maiolica.blu, dove: 'testo su smalto blu' },
  { testo: testo.forte, fondo: primitivi.maiolica.raminaScura, dove: 'testo su ramina scura' },
  { testo: testo.medio, fondo: superficie.s1, dove: 'sottotitolo su pannello' },
  { testo: testo.medio, fondo: superficie.s2, dove: 'sottotitolo su superficie rialzata' },
  { testo: testo.medio, fondo: primitivi.panno.medio, dove: 'sottotitolo su panno' },
  { testo: testo.tenue, fondo: fondo.base, dove: 'nota su sala' },
  { testo: testo.tenue, fondo: superficie.s1, dove: 'nota su pannello' },
  { testo: testo.tenue, fondo: superficie.s2, dove: 'nota su superficie rialzata' },
  { testo: accento.oro, fondo: fondo.base, dove: 'occhiello su sala' },
  { testo: accento.oro, fondo: superficie.s1, dove: 'occhiello su pannello' },
  { testo: accento.oro, fondo: primitivi.velluto.medio, dove: 'oro su velluto' },
  { testo: accento.oro, fondo: primitivi.noce.scuro, dove: 'oro su noce scuro' },
  { testo: testo.inchiostro, fondo: superficie.carta, dove: 'testo su carta' },
  { testo: testo.inchiostro, fondo: primitivi.carta.scuro, dove: 'testo su carta scura' },
  { testo: testo.inchiostro, fondo: primitivi.ottone.medio, dove: 'testo inciso su ottone medio' },
  { testo: testo.inchiostro, fondo: primitivi.fogliaOro, dove: 'testo su foglia d’oro' },
  { testo: testo.inchiostro, fondo: primitivi.marmo.medio, dove: 'testo su marmo' },
  { testo: testo.inchiostro, fondo: primitivi.sughero.medio, dove: 'testo su sughero' },
  { testo: testo.inchiostro, fondo: primitivi.maiolica.giallo, dove: 'testo su smalto giallo' },
  { testo: testo.inchiostro, fondo: primitivi.maiolica.bianco, dove: 'testo su smalto bianco' },
  { testo: testo.inchiostroTenue, fondo: superficie.carta, dove: 'nota su carta' },
  { testo: testo.inchiostroTenue, fondo: primitivi.carta.scuro, dove: 'nota su carta scura' },
  { testo: testo.rosso, fondo: superficie.carta, dove: 'rosso tipografico su carta' },
  { testo: stato.successo, fondo: fondo.base, dove: 'stato completato' },
  { testo: stato.errore, fondo: fondo.base, dove: 'stato errore' },
  { testo: stato.info, fondo: fondo.base, dove: 'stato informazione' },
  { testo: stato.successo, fondo: superficie.s1, dove: 'stato completato su pannello' },
  { testo: stato.errore, fondo: superficie.s1, dove: 'stato errore su pannello' },
];
