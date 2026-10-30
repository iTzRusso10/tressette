// «Lampara»: la scala delle rarità come dati (docs/direzione-artistica.md §5.1 «Rarità», §5.7).
//
// La qualità del disegno è la stessa per tutte e sei; cresce la spettacolarità: materiale più nobile, più
// ornamento, luce più viva, movimento solo dall'epico. Il nome della rarità è sempre scritto (il colore non
// è mai l'unico segno).
//
// Export:
// - `RARITA`              per ogni `Rarity` (src/meta/rarity.ts): nome, materiale, colore su scuro, i quattro
//                         stop del metallo (luce, medio, scuro, rimbalzo), filo chiaro e scuro, colore della gemma
//                         (o null), riflesso statico (morbido/netto), movimenti (0…3), particelle (0, 8, 16),
//                         pausa del riflesso (ms o null), presentazione (piccola/media/grande), sipario, alone
// - `rarita(r)`           la voce di RARITA (accetta anche id sconosciuti → comune)
// - `puoAnimare(r, misura)`  true solo se la rarità ha movimento e l'oggetto è ≥ 48 punti (BUDGET.minimoAnimato)
// - `ORDINE_RARITA`       le sei rarità in ordine (rinvio di RARITIES)
// - `PAUSE_RIFLESSO`, `MINIMO_ANIMATO`  pause del riflesso per rarità e misura minima per animarsi (gli stessi
//                         oggetti di mov.pausaRiflesso e BUDGET.minimoAnimato)
//
// Solo dati, nessun componente: TarghettaRarita sta in TarghettaRarita.tsx.
import { RARITIES, RARITY_NAMES, type Rarity } from '@/meta/rarity';

// Questi due numeri nascono qui (movimento.ts li riprende in mov.pausaRiflesso e BUDGET.minimoAnimato), così
// questo file resta puro (niente Reanimated) e si usa nei test.
export const PAUSE_RIFLESSO = { epico: 8000, leggendario: 6000, mitico: 6000 } as const;
export const MINIMO_ANIMATO = 48;

export type Presentazione = 'piccola' | 'media' | 'grande';

export interface StileRarita {
  id: Rarity;
  nome: string;
  /** Il materiale, a parole (per accessibilità e per le schede). */
  materiale: string;
  /** Colore della rarità su fondo scuro (testi e filetti), contrasto ≥ 7 su fondo.base. */
  colore: string;
  /** Metallo a quattro stop, a 160°: luce, medio, scuro, rimbalzo (l'ultimo stop torna un po' chiaro). */
  metallo: readonly [string, string, string, string];
  /** Filo chiaro (alto-sinistra) e scuro (basso-destra) del rilievo. */
  filo: { chiaro: string; scuro: string };
  /** Smalto o gemma incastonata (raro: smalto blu; epico: ametista; leggendario: rubino; mitico: corallo). */
  gemma: string | null;
  /** Secondo materiale (epico: porpora; mitico: madreperla), o null. */
  secondo: string | null;
  /** Riflesso statico: opacità della macchia di luce e quanto è netta (0 morbido … 1 netto). */
  riflesso: { opacita: number; nitidezza: number };
  /** Quanti elementi animati (0 comune…raro, 1 epico, 2 leggendario, 3 mitico). */
  movimenti: 0 | 1 | 2 | 3;
  /** Particelle in vetrina (≤ 24 per oggetto). */
  particelle: 0 | 8 | 16;
  /** Pausa tra due passaggi del riflesso animato, o null se il riflesso è statico. */
  pausaRiflesso: number | null;
  presentazione: Presentazione;
  /** Lo svelamento grande con il sipario di velluto (solo mitico). */
  sipario: boolean;
  /** Alone del materiale (solo leggendario e mitico, opacità ≤ 0,25), o null. */
  alone: number | null;
}

export const RARITA: Record<Rarity, StileRarita> = {
  comune: {
    id: 'comune',
    nome: RARITY_NAMES.comune,
    materiale: 'peltro',
    colore: '#B9B2A6',
    metallo: ['#E2DDD3', '#A9A196', '#6E685F', '#9C958A'],
    filo: { chiaro: 'rgba(255,255,255,0.45)', scuro: '#3E3A34' },
    gemma: null,
    secondo: null,
    riflesso: { opacita: 0.22, nitidezza: 0.2 },
    movimenti: 0,
    particelle: 0,
    pausaRiflesso: null,
    presentazione: 'piccola',
    sipario: false,
    alone: null,
  },
  noncomune: {
    id: 'noncomune',
    nome: RARITY_NAMES.noncomune,
    materiale: 'rame e bronzo',
    colore: '#D9895A',
    metallo: ['#F6C9A0', '#C27A4A', '#7A4022', '#B06A3E'],
    filo: { chiaro: 'rgba(255,225,195,0.6)', scuro: '#3E1E0E' },
    gemma: null,
    secondo: null,
    riflesso: { opacita: 0.3, nitidezza: 0.55 },
    movimenti: 0,
    particelle: 0,
    pausaRiflesso: null,
    presentazione: 'piccola',
    sipario: false,
    alone: null,
  },
  raro: {
    id: 'raro',
    nome: RARITY_NAMES.raro,
    materiale: 'argento e smalto blu',
    colore: '#6FA8E8',
    metallo: ['#FFFFFF', '#C9D0D8', '#7D8792', '#AEB7C2'],
    filo: { chiaro: 'rgba(255,255,255,0.75)', scuro: '#3A4048' },
    gemma: '#1E4F99',
    secondo: null,
    riflesso: { opacita: 0.4, nitidezza: 0.7 },
    movimenti: 0,
    particelle: 0,
    pausaRiflesso: null,
    presentazione: 'media',
    sipario: false,
    alone: null,
  },
  epico: {
    id: 'epico',
    nome: RARITY_NAMES.epico,
    materiale: 'argento dorato, ametista e porpora',
    colore: '#B58CE0',
    metallo: ['#FBEFD0', '#D8BC84', '#8C7046', '#C2A672'],
    filo: { chiaro: 'rgba(255,246,220,0.75)', scuro: '#3C2C14' },
    gemma: '#6A2C9E',
    secondo: '#4A1A5E',
    riflesso: { opacita: 0.45, nitidezza: 0.8 },
    movimenti: 1,
    particelle: 0,
    pausaRiflesso: PAUSE_RIFLESSO.epico,
    presentazione: 'grande',
    sipario: false,
    alone: null,
  },
  leggendario: {
    id: 'leggendario',
    nome: RARITY_NAMES.leggendario,
    materiale: 'oro zecchino e gemme',
    colore: '#E8B44A',
    metallo: ['#FFF0BC', '#E2B24A', '#8E6214', '#D19C36'],
    filo: { chiaro: 'rgba(255,248,214,0.85)', scuro: '#4A3008' },
    gemma: '#B0182C',
    secondo: null,
    riflesso: { opacita: 0.55, nitidezza: 0.9 },
    movimenti: 2,
    particelle: 8,
    pausaRiflesso: PAUSE_RIFLESSO.leggendario,
    presentazione: 'grande',
    sipario: false,
    alone: 0.18,
  },
  mitico: {
    id: 'mitico',
    nome: RARITY_NAMES.mitico,
    materiale: 'corallo, madreperla e oro rosa',
    colore: '#EC8FB0',
    metallo: ['#FFE6DA', '#E7A989', '#97573E', '#D49379'],
    filo: { chiaro: 'rgba(255,240,232,0.85)', scuro: '#4A2014' },
    gemma: '#D8485A',
    secondo: '#EDE8F2',
    riflesso: { opacita: 0.6, nitidezza: 0.95 },
    movimenti: 3,
    particelle: 16,
    pausaRiflesso: PAUSE_RIFLESSO.mitico,
    presentazione: 'grande',
    sipario: true,
    alone: 0.24,
  },
};

export const ORDINE_RARITA: readonly Rarity[] = RARITIES;

/** Lo stile di una rarità; un id sconosciuto vale «comune». */
export function rarita(r: Rarity | string | undefined): StileRarita {
  return (r && RARITA[r as Rarity]) || RARITA.comune;
}

/** Un oggetto si anima solo se la sua rarità lo prevede e se è grande almeno 48 punti. */
export function puoAnimare(r: Rarity | string | undefined, misura: number): boolean {
  return rarita(r).movimenti > 0 && misura >= MINIMO_ANIMATO;
}
