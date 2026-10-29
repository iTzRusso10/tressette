// «La bacheca del circolo»: riscuotere (docs/direzione-artistica.md §5.10, 5.11, 5.17).
//
// Riscuotere è una ricompensa piccola: monete d'ottone che volano dalla busta al contatore (MoneteInVolo di
// B0, l'ultima arriva a 680 ms), il contatore che conta quando arrivano, e si può toccare subito la busta
// successiva: i voli stanno in uno strato a parte con pointerEvents none, ogni riscossione è indipendente e la
// regola resta quella di sempre (`claim` di profile.ts, una volta sola per id).
//
// Export:
// - `Strato`                 'hub' (la home: il contatore è la pillola delle monete in alto nell'hub) | 'bacheca'
// - `StratoVoli`             { strato } lo strato dei voli, a tutto schermo, non blocca i tocchi
// - `assicuraStratoHub(sheet)`  monta lo strato dell'hub con il `sheet` di useTabs (Hub.tsx), se non c'è già:
//                            così le monete volano sopra tutta la home senza toccare Hub.tsx né Gioca.tsx
// - `registraBusta(strato, claimId, vista)`, `bustaDi(strato, claimId)`  dove sta la busta di una ricompensa (per «Riscuoti tutto»)
// - `vola({ sorgente, strato, coins, insets?, suono?, ritardo? })`  solo il volo (la riscossione l'ha già fatta
//                            chi chiama): per la home, dove «Riscuoti tutto» resta una sola `claim('*')`
// - `riscuoti({ claimId, sorgente, strato, insets?, suono?, riduci? })`  riscuote e fa volare. Restituisce subito.
// - `riscuotiTutto(ids, strato, { insets?, riduci?, ripiego? })`  le buste una dopo l'altra (scaglioneTutto: 120 ms,
//                            meno se sono tante, perché l'ultima moneta arrivi entro 1,2 s); il suono una volta.
//                            Oltre 7 buste le ultime si riscuotono insieme con un solo volo (budget di animazione).
// - `ContatoreMonete`        { strato, testID?, style? } il contatore della bacheca: ContatoreMonete di arte/Testata
//                            con le monete meno quelle ancora in volo; conta quando arrivano (160 ms). Con riduci
//                            movimento non conta: il numero nuovo arriva con una dissolvenza.
// - `contatoreHub(monete, insets)`  dove sta la moneta della pillola nell'hub (dalle misure di Hub.tsx)
//
// Budget: per busta 5 monete animate per 680 ms, poi lo strato si svuota da solo; al massimo 7 voli insieme.
// Nessuna animazione ambientale. Niente Math.random: i voli usano seeded() dentro MoneteInVolo.
import { memo, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ComponentRef, type ReactNode } from 'react';
import { Dimensions, Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { EdgeInsets } from 'react-native-safe-area-context';
import { claim, useProfile } from '@/meta/profile';
import { sfx } from '../feedback';
import { MoneteInVolo } from '../arte/Ricompensa';
import { ContatoreMonete as ContatoreArte } from '../arte/Testata';
import { fineVolo, misuraMoneta, quanteMonete, scaglioneTutto, VOLO } from './dati';

export type Strato = 'hub' | 'bacheca';
/** Una vista misurabile (in RN 0.88 `View` è una funzione: il suo ref è un ReactNativeElement). */
export type Vista = ComponentRef<typeof View>;
type P = { x: number; y: number };

interface Volo {
  id: number;
  strato: Strato;
  da: P;
  a: P;
  coins: number;
  misura: number;
  suono: boolean;
  arrivato: boolean;
}

/* ------------------------------------------------------------------ il piccolo archivio dei voli */

let voli: Volo[] = [];
let seq = 0;
let versione = 0;
const inVolo: Record<Strato, number> = { hub: 0, bacheca: 0 };
const montati: Record<Strato, number> = { hub: 0, bacheca: 0 };
const contatori: Partial<Record<Strato, Vista | null>> = {};
const buste = new Map<string, Vista>();
let stratoHubChiesto = 0;
const ascoltatori = new Set<() => void>();

function avvisa() {
  versione++;
  ascoltatori.forEach(f => f());
}
const iscrivi = (f: () => void) => {
  ascoltatori.add(f);
  return () => {
    ascoltatori.delete(f);
  };
};
const leggi = () => versione;

/** Le monete restano fuori dal contatore finché non arrivano. */
function riserva(strato: Strato, coins: number) {
  if (!coins) return;
  inVolo[strato] = Math.max(0, inVolo[strato] + coins);
  avvisa();
}

function arrivato(id: number) {
  const v = voli.find(x => x.id === id);
  if (!v || v.arrivato) return;
  v.arrivato = true;
  riserva(v.strato, -v.coins);
}

function finito(id: number) {
  arrivato(id);
  voli = voli.filter(x => x.id !== id);
  avvisa();
}

export function registraContatore(strato: Strato, vista: Vista | null) {
  contatori[strato] = vista;
}

/** Le buste per strato: la home e la bacheca possono essere montate insieme (la bacheca sta sopra l'hub). */
export function registraBusta(strato: Strato, claimId: string, vista: Vista | null) {
  const k = `${strato}|${claimId}`;
  if (vista) buste.set(k, vista);
  else buste.delete(k);
}
export const bustaDi = (strato: Strato, claimId: string) => buste.get(`${strato}|${claimId}`) ?? null;

/* ------------------------------------------------------------------ dove arrivano le monete */

/**
 * La moneta della pillola delle monete nella barra dell'hub (Hub.tsx `HubTop`: alta 60, larga al massimo 720,
 * padding 16, gap 8; poi la pillola, gap 8, le impostazioni da 44). La pillola è larga 8 + 22 + 6 + testo + 14.
 */
export function contatoreHub(monete: number, ins: EdgeInsets): P {
  const { width } = Dimensions.get('window');
  const dentro = width - ins.left - ins.right;
  const riga = Math.min(dentro, 720);
  const destra = ins.left + (dentro + riga) / 2 - 16;
  // Sora ExtraBold 16 con cifre tabellari: circa 10 punti per cifra, 4,6 per il punto delle migliaia.
  const tw = [...monete.toLocaleString('it-IT')].reduce((t, c) => t + (c === '.' ? 4.6 : 10.2), 0);
  const pillola = 8 + 22 + 6 + tw + 14 + 2;
  return { x: destra - 44 - 8 - pillola + 1 + 8 + 11, y: ins.top + 30 };
}

type Rett = { x: number; y: number; w: number; h: number } | null;

/**
 * Il rettangolo di una vista sullo schermo. Sul web subito (getBoundingClientRect, che tiene conto delle
 * trasformazioni: measureInWindow dà zero dentro un antenato ruotato, e i biglietti sono storti); sul telefono
 * con measureInWindow, al prossimo giro.
 */
function misura(v: Vista | null | undefined): Rett | Promise<Rett> {
  if (!v) return null;
  const el = v as unknown as { getBoundingClientRect?: () => DOMRect };
  if (Platform.OS === 'web' && typeof el.getBoundingClientRect === 'function') {
    const r = el.getBoundingClientRect();
    return r.width > 0 ? { x: r.left, y: r.top, w: r.width, h: r.height } : null;
  }
  if (typeof v.measureInWindow !== 'function') return null;
  return new Promise<Rett>(res => v.measureInWindow((x, y, w, h) => res(Number.isFinite(x) && w > 0 ? { x, y, w, h } : null)));
}

/** Esegue `f` con il valore: subito se c'è già, appena arriva se è una promessa. */
const quando = <T,>(x: T | Promise<T>, f: (v: T) => void) => (x instanceof Promise ? void x.then(f) : f(x));

/* ------------------------------------------------------------------ volare */

export interface OpzioniVolo {
  /** La vista da cui partono le monete, o la sua misura già presa (prima che la vista cambi o sparisca). */
  sorgente: Vista | null | Rett | Promise<Rett>;
  strato: Strato;
  coins: number;
  insets?: EdgeInsets;
  suono?: boolean;
  /** Le monete sono già riservate da chi chiama (riscuoti). */
  riservate?: boolean;
}

/** Misura una vista adesso (prima di riscuotere: dopo, la vista può cambiare o sparire). */
export const misuraOra = (v: Vista | null | undefined) => misura(v);

const eRett = (x: unknown): x is NonNullable<Rett> => !!x && typeof x === 'object' && 'w' in (x as object) && 'h' in (x as object) && !('measureInWindow' in (x as object));

export function vola({ sorgente, strato, coins, insets, suono = true, riservate = false }: OpzioniVolo) {
  if (!riservate) riserva(strato, coins);
  const pDa = sorgente instanceof Promise || sorgente === null || eRett(sorgente) ? sorgente : misura(sorgente as Vista);
  const pA = strato === 'bacheca' ? misura(contatori.bacheca) : null;
  const parti = (da: Rett, a: Rett) => {
    const monete = useProfile.getState().coins;
    const fine = a ? { x: a.x + 20, y: a.y + a.h / 2 } : strato === 'hub' && insets ? contatoreHub(monete, insets) : null;
    const senzaStrato = montati[strato] === 0 && !(strato === 'hub' && Date.now() - stratoHubChiesto < 1500);
    if (!da || !fine || senzaStrato) {
      riserva(strato, -coins);
      if (suono) sfx('coin');
      return;
    }
    voli = [...voli, { id: ++seq, strato, da: { x: da.x + da.w / 2, y: da.y + da.h / 2 }, a: fine, coins, misura: misuraMoneta(coins), suono, arrivato: false }];
    avvisa();
  };
  quando(pDa, da => quando(pA, a => parti(da, a)));
}

/* ------------------------------------------------------------------ riscuotere */

export interface Riscossione {
  claimId: string;
  sorgente: Vista | null;
  strato: Strato;
  insets?: EdgeInsets;
  /** Il suono «coin» all'arrivo (in «Riscuoti tutto» solo il primo). */
  suono?: boolean;
  /** Riduci movimento: niente volo, il suono subito, il contatore con la dissolvenza. */
  riduci?: boolean;
}

/** Le ricompense appena toccate: un secondo tocco sulla stessa busta, prima che la riscossione arrivi, non vale. */
const inCorso = new Set<string>();

/**
 * Riscuote e fa volare le monete. true se c'era qualcosa da riscuotere. Non aspetta niente.
 * Il volo parte per primo (sul web nello stesso giro del tocco), la riscossione subito dopo (setTimeout 0): così il
 * ridisegno della bacheca non ritarda la partenza delle monete, e la regola resta `claim` di profile.ts.
 */
export function riscuoti({ claimId, sorgente, strato, insets, suono = true, riduci = false }: Riscossione): boolean {
  if (inCorso.has(claimId)) return false;
  const c = useProfile.getState().meta.claims.find(x => x.id === claimId);
  if (!c) return false;
  if (riduci) {
    const preso = claim(claimId);
    if (suono) sfx(preso > 0 ? 'coin' : 'buy');
    return true;
  }
  inCorso.add(claimId);
  const previste = c.coins ?? 0;
  riserva(strato, previste);
  // La busta si misura prima di riscuotere: dopo, può cambiare aspetto.
  if (previste > 0) vola({ sorgente: misura(sorgente), strato, coins: previste, insets, suono, riservate: true });
  setTimeout(() => {
    inCorso.delete(claimId);
    const preso = Math.max(0, claim(claimId));
    // Un doppione pagato in monete (ledger.ts) ne dà di più; una ricompensa sparita nel frattempo, niente.
    const extra = preso - previste;
    if (extra) riserva(strato, extra);
    if (previste === 0 && suono) sfx('buy');
  }, 0);
  return true;
}

/** Al massimo tanti voli in «Riscuoti tutto»; le altre buste volano insieme con l'ultimo. */
const VOLI_MAX = 7;

/**
 * «Riscuoti tutto»: si riscuote tutto subito (una riscossione per id, la stessa regola), e le monete partono dalle
 * buste una dopo l'altra (scaglioneTutto: 120 ms, meno se sono tante: l'ultima arriva entro 1,2 s). Suono una volta.
 */
export function riscuotiTutto(ids: string[], strato: Strato, o: { insets?: EdgeInsets; riduci?: boolean; ripiego?: Vista | null } = {}) {
  const claims = useProfile.getState().meta.claims;
  const lista = ids.map(id => claims.find(c => c.id === id)).filter((c): c is NonNullable<typeof c> => !!c && !inCorso.has(c.id));
  if (!lista.length) return;
  if (o.riduci) {
    for (const c of lista) claim(c.id);
    sfx('coin');
    return;
  }
  // Prima le partenze (misurate adesso), poi la riscossione: un solo ridisegno.
  const singoli = lista.length > VOLI_MAX ? lista.slice(0, VOLI_MAX - 1) : lista;
  const resto = lista.length > VOLI_MAX ? lista.slice(VOLI_MAX - 1) : [];
  const partenze = singoli.map(c => ({ da: misura(bustaDi(strato, c.id) ?? o.ripiego ?? null), coins: c.coins ?? 0 }));
  if (resto.length) partenze.push({ da: misura(o.ripiego ?? bustaDi(strato, resto[0].id)), coins: resto.reduce((t, c) => t + (c.coins ?? 0), 0) });
  const totale = lista.reduce((t, c) => t + (c.coins ?? 0), 0);
  riserva(strato, totale);
  const passo = scaglioneTutto(partenze.length);
  partenze.forEach((x, i) => {
    if (x.coins <= 0) return;
    const via = () => vola({ sorgente: x.da, strato, coins: x.coins, insets: o.insets, suono: i === 0, riservate: true });
    if (i === 0) via();
    else setTimeout(via, i * passo);
  });
  for (const c of lista) inCorso.add(c.id);
  setTimeout(() => {
    let preso = 0;
    for (const c of lista) {
      inCorso.delete(c.id);
      preso += Math.max(0, claim(c.id));
    }
    if (preso - totale) riserva(strato, preso - totale);
  }, 0);
}

/* ------------------------------------------------------------------ lo strato */

export function assicuraStratoHub(sheet: (n: ReactNode | null) => void) {
  if (montati.hub > 0 || Date.now() - stratoHubChiesto < 1500) return;
  stratoHubChiesto = Date.now();
  sheet(<StratoVoli strato="hub" />);
}

export function StratoVoli({ strato }: { strato: Strato }) {
  useSyncExternalStore(iscrivi, leggi, leggi);
  const ref = useRef<Vista>(null);
  const [origine, setOrigine] = useState<P>({ x: 0, y: 0 });
  useEffect(() => {
    montati[strato]++;
    return () => {
      montati[strato]--;
      if (montati[strato] > 0) return;
      // Smontato: le monete che non arriveranno più non restano «in volo» nel contatore.
      for (const v of voli) if (v.strato === strato && !v.arrivato) inVolo[strato] = Math.max(0, inVolo[strato] - v.coins);
      voli = voli.filter(x => x.strato !== strato);
      avvisa();
    };
  }, [strato]);
  const lista = voli.filter(v => v.strato === strato);
  return (
    <View
      ref={ref}
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      onLayout={() =>
        quando(misura(ref.current), r => {
          if (r && (r.x !== origine.x || r.y !== origine.y)) setOrigine({ x: r.x, y: r.y });
        })
      }
    >
      {lista.map(v => (
        <UnVolo key={v.id} v={v} ox={origine.x} oy={origine.y} />
      ))}
    </View>
  );
}

/** Un volo: non si ridisegna quando arriva o parte un altro volo (stesso oggetto `v`, stessa origine). */
const UnVolo = memo(function UnVolo({ v, ox, oy }: { v: Volo; ox: number; oy: number }) {
  const onArrivo = useCallback(() => {
    arrivato(v.id);
    // MoneteInVolo resta montata fino a 800 ms (il tempo di 8 monete): con 5, l'ultima è sul contatore a 638 ms
    // (92% del suo volo, 99,8% della strada) e lì il volo finisce (§5.11: ≤ 700 ms).
    setTimeout(() => finito(v.id), fineVolo(quanteMonete(v.coins)) - VOLO);
  }, [v]);
  const onFine = useCallback(() => finito(v.id), [v]);
  const da = useMemo(() => ({ x: v.da.x - ox, y: v.da.y - oy }), [v, ox, oy]);
  const a = useMemo(() => ({ x: v.a.x - ox, y: v.a.y - oy }), [v, ox, oy]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} testID="volo-monete">
      <MoneteInVolo da={da} a={a} quante={quanteMonete(v.coins)} seme={v.id * 7919} misura={v.misura} suono={v.suono} onArrivo={onArrivo} onFine={onFine} />
    </View>
  );
});

/* ------------------------------------------------------------------ il contatore della bacheca */

/** Il contatore della bacheca: ContatoreMonete di arte (lo stesso del profilo, di personalizza e dell'arena) con il
 *  numero che non conta le monete ancora in volo; i voli lo trovano registrato per strato. */
export function ContatoreMonete({ strato, testID, style }: { strato: Strato; testID?: string; style?: StyleProp<ViewStyle> }) {
  useSyncExternalStore(iscrivi, leggi, leggi);
  const monete = useProfile(s => s.coins);
  return <ContatoreArte monete={monete - inVolo[strato]} etichetta={monete} vistaRef={v => registraContatore(strato, v)} testID={testID} style={style} />;
}

