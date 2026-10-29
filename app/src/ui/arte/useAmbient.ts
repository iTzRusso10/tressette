// «Lampara»: l'interruttore unico delle animazioni ambientali (docs/tecnologie-grafica.md «Movimento ridotto»).
//
// Export:
// - `useAmbient(attivo = true): boolean`
//     true solo se TUTTE queste sono vere:
//     1. «riduci movimento» del sistema è spento (useReducedMotion di Reanimated; sul web prefers-reduced-motion);
//     2. la schermata che contiene il componente è a fuoco (eventi focus/blur di Expo Router; fuori da una
//        schermata, per esempio in Overlays, vale «a fuoco»);
//     3. l'app è in primo piano (AppState 'active'; sul web segue document.visibilityState);
//     4. la prop `attivo` è true: la usa chi sa che l'elemento non si vede (sezione dell'hub non corrente,
//        elemento fuori dalla lista visibile, miniatura non selezionata in una griglia).
//     Quando torna false le animazioni si fermano con cancelAnimation e tornano al fotogramma di riposo.
// - `useRiduciMovimento(): boolean`  solo il punto 1: per scegliere tra entrata animata e dissolvenza breve.
//
// Budget: nessuno (non anima niente). Usa useSyncExternalStore: nessun setState negli effetti.
import { useCallback, useContext, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { NavigationContext } from 'expo-router/react-navigation';

const iscriviApp = (cb: () => void) => {
  const s = AppState.addEventListener('change', cb);
  return () => s.remove();
};
const statoApp = () => AppState.currentState;
const statoAppServer = () => 'active' as const;

/** La schermata è a fuoco? Fuori da una schermata (nessun navigatore) vale sempre sì. */
function useFuoco(): boolean {
  const nav = useContext(NavigationContext);
  const iscrivi = useCallback(
    (cb: () => void) => {
      if (!nav) return () => {};
      const a = nav.addListener('focus', cb);
      const b = nav.addListener('blur', cb);
      return () => {
        a();
        b();
      };
    },
    [nav],
  );
  const leggi = useCallback(() => (nav ? nav.isFocused() : true), [nav]);
  return useSyncExternalStore(iscrivi, leggi, () => true);
}

export function useRiduciMovimento(): boolean {
  return useReducedMotion();
}

export function useAmbient(attivo = true): boolean {
  const riduci = useReducedMotion();
  const fuoco = useFuoco();
  const app = useSyncExternalStore(iscriviApp, statoApp, statoAppServer);
  return attivo && !riduci && fuoco && app === 'active';
}
