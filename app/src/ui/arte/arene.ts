// «Lampara»: i dati visivi delle arene per id (docs/direzione-artistica.md §5.13, §7 B1). Il catalogo
// (src/meta/arenas.ts) non si tocca: qui solo come si presenta un'arena.
//
// Per ora pieno solo per «Il Club dei Signori», l'arena del prototipo (arene/club/). Le altre 29 seguiranno in Fase D,
// capitolo per capitolo, con la crescita di 5.13 (più luce, materiali più nobili, più vita).
//
// Export:
// - `ARENE_ARTE`      { [id]: ArteArena }   capitolo, palette, le due luci, gli elementi di vita e il loro budget
// - `arteArena(id)`   l'ArteArena o undefined (le arene vettoriali di prima)
// - `siEsplora(id)`   true se l'arena ha la scena a piani: «Esplora l'arena» esiste solo per queste
// - `ArteArena`
// Puro, nessun React.
import { primitivi } from './token';

export interface ArteArena {
  capitolo: 1 | 2 | 3 | 4 | 5;
  /** Colori di riferimento della scena (materiali, non sfondi dell'interfaccia). */
  palette: readonly string[];
  /** La luce principale (calda, sul tavolo) e quella di contrasto (fredda, dal fondo). */
  luce: { principale: string; contrasto?: string };
  /** Gli elementi di vita in vetrina (≤ 3), più quelli solo in «Esplora». */
  vita: readonly string[];
  vitaEsplora: readonly string[];
  /** La scena è a piani (parallasse, tavolino equipaggiato in prospettiva, entrata nello svelamento). */
  piani: boolean;
}

export const ARENE_ARTE: Record<string, ArteArena> = {
  'club-dei-signori': {
    capitolo: 3,
    palette: [primitivi.noce.luce, primitivi.cuoio.luce, primitivi.ottone.medio, '#24406E', '#561722', primitivi.marmo.luce, '#1E7A4A'],
    luce: { principale: primitivi.lampada, contrasto: primitivi.notteFredda.luna },
    vita: ['la lampara sul golfo', 'la tenda di destra', 'il fumo del sigaro'],
    vitaEsplora: ['la polvere nel cono della lampada'],
    piani: true,
  },
};

export const arteArena = (id: string): ArteArena | undefined => ARENE_ARTE[id];

/** L'arena ha la scena a piani: solo queste si esplorano a tutto schermo (/arena/[id]). Le illustrazioni piatte di
 *  prima, ingrandite, sarebbero l'immagine più povera del gioco proprio nel momento del premio. */
export const siEsplora = (id: string): boolean => !!ARENE_ARTE[id]?.piani;
