// «Lampara»: la luce unica del gioco (docs/direzione-artistica.md §5.3, 5.4).
//
// Una sola luce principale, la lampada: dall'alto, leggermente da sinistra (ore 11). Gli spigoli in alto a
// sinistra prendono luce, quelli in basso a destra stanno in ombra. Una luce fredda e debole di rimbalzo
// (la finestra, la notte) sfiora gli spigoli in basso a destra: separa gli oggetti scuri dal fondo scuro.
//
// Export:
// - `LUCE`                 direzione (vettore sullo schermo e angolo), colore della lampada, rimbalzo, pozza
// - `GRADIENTE_LUCE`       start/end per expo-linear-gradient e per i gradienti SVG a 160° (alto-sinistra → basso-destra)
// - `ombra(livello)`       boxShadow con contatto + portata per i livelli 2, 3, 4 (stringa per lo style `boxShadow`);
//                          sotto i 34 punti si passa `{ piccolo: true }` e resta solo il contatto
// - `alone(colore, a)`     alone colorato per lampada, leggendario e mitico (opacità massima 0,25)
// - `bordoLuce`            colori del filo chiaro (alto-sinistra) e scuro (basso-destra) per ogni materiale
//
// Nessuna animazione qui: la luce si accende con `Lampada` (materiali.tsx) e si muove con `Riflesso`.
import { primitivi } from './token';

export const LUCE = {
  /** Vettore della luce in coordinate dello schermo (va verso il basso a destra): (-0,35, -0,94) è da dove viene. */
  da: { x: -0.35, y: -0.94 },
  /** Angolo del gradiente dei materiali: 160° (CSS), dall'alto-sinistra al basso-destra. */
  angolo: 160,
  colore: primitivi.lampada,
  rimbalzo: { colore: primitivi.notteFredda.rimbalzo, opacita: 0.12 },
  /** La pozza di luce sulle schermate di vetrina (frazioni della larghezza/altezza dello schermo). */
  pozza: { cx: 0.42, cy: 0.22, r: 0.7, opacita: 0.22 },
} as const;

/** start/end per un gradiente lungo la direzione della luce (alto-sinistra → basso-destra, ~160°). */
export const GRADIENTE_LUCE = { start: { x: 0.18, y: 0 }, end: { x: 0.82, y: 1 } } as const;

const NERO = (a: number) => `rgba(8,3,4,${a})`;

/** Contatto e portata per livello (§5.4). La portata va a destra di un terzo del suo spostamento in basso. */
const OMBRE = {
  2: { contatto: `0px 1px 2px ${NERO(0.5)}`, portata: `3px 8px 16px ${NERO(0.4)}` },
  3: { contatto: `0px 2px 3px ${NERO(0.5)}`, portata: `5px 14px 22px ${NERO(0.45)}` },
  4: { contatto: `0px 3px 4px ${NERO(0.5)}`, portata: `8px 24px 36px ${NERO(0.5)}` },
} as const;

export type LivelloOmbra = 2 | 3 | 4;

/**
 * L'ombra di un elemento al suo livello: `style={{ boxShadow: ombra(3) }}`. Funziona su iOS, Android e web
 * (nuova architettura). Il livello 0, 1 e 5 non hanno ombra propria.
 */
export function ombra(livello: LivelloOmbra, o?: { piccolo?: boolean }): string {
  const s = OMBRE[livello];
  return o?.piccolo ? s.contatto : `${s.contatto}, ${s.portata}`;
}

/** Alone di un materiale (lampada, leggendario, mitico). Opacità limitata a 0,25. Mai su un pulsante. */
export function alone(colore: string, opacita = 0.2, raggio = 28): string {
  const a = Math.min(0.25, opacita);
  const n = parseInt(colore.slice(1), 16);
  return `0px 0px ${raggio}px rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** Fili di rilievo (strato 3 dei materiali): chiaro in alto a sinistra, scuro in basso a destra. */
export const bordoLuce = {
  noce: { chiaro: 'rgba(168,122,80,0.6)', scuro: primitivi.noce.filoScuro },
  ottone: { chiaro: 'rgba(255,243,200,0.7)', scuro: primitivi.ottone.ombra },
  carta: { chiaro: 'rgba(255,255,255,0.5)', scuro: primitivi.carta.bordo },
  velluto: { chiaro: 'rgba(160,70,90,0.45)', scuro: 'rgba(8,3,4,0.6)' },
  cuoio: { chiaro: 'rgba(200,120,80,0.35)', scuro: 'rgba(20,8,4,0.7)' },
  marmo: { chiaro: 'rgba(255,255,255,0.75)', scuro: 'rgba(110,100,88,0.6)' },
  sughero: { chiaro: 'rgba(255,230,190,0.35)', scuro: 'rgba(60,36,18,0.6)' },
  smalto: { chiaro: 'rgba(255,255,255,0.55)', scuro: 'rgba(8,3,4,0.45)' },
} as const;
