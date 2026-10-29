// Il tuo profilo come vetrina (docs/direzione-artistica.md §5.15): la sala dell'arena raggiunta, l'avatar con la
// cornice in primo piano, nome, titolo, trofei e arena, la teca con le tre cose esposte, il libro mastro delle
// partite, il medagliere, le leghe passate, la collezione e l'account. È costruito dal profilo pubblico
// (`publicOf`): quello che vedi qui è quello che vedono gli altri (giocatore/[id] usa la stessa VetrinaProfilo),
// più le cose che vedi solo tu (monete, livello in punti, il tavolo in uso, il dettaglio delle medaglie, la
// collezione, l'account).
import { router, Stack, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ACHIEVEMENTS } from '@/meta/achievements';
import { signOut } from '@/meta/auth';
import { itemsOf, keyOf, SLOT_NAMES, SLOTS } from '@/meta/catalog';
import { levelInfo, levelProgress } from '@/meta/levels';
import { publicOf } from '@/meta/ledger';
import { progressOf, useProfile } from '@/meta/profile';
import { SETS } from '@/meta/sets';
import { useSettings } from '@/state/settings';
import { fontArte, Pulsante, Superficie, testo } from '@/ui/arte';
import type { Tier } from '@/ui/meta';
import { ProfileEditor, type EditorTab } from '@/ui/ProfileEditor';
import { TitoloSezione } from '@/ui/profilo/comuni';
import { Accesso } from '@/ui/profilo/Accesso';
import { VetrinaProfilo } from '@/ui/profilo/VetrinaProfilo';
import { Text } from '@/ui/Text';

const TIERS: Tier[] = ['bronzo', 'argento', 'oro', 'platino'];
const PROVIDER = { apple: 'Apple', google: 'Google', facebook: 'Facebook' } as const;

export default function Profilo() {
  const p = useProfile();
  const localName = useSettings(s => s.name.trim());
  const [editor, setEditor] = useState<EditorTab | null>(null);

  const prog = progressOf(p);
  const pub = publicOf(prog);
  const name = p.account?.name || localName || 'Tu';
  const info = levelInfo(p.xp);

  const medaglie = useMemo(() => {
    const out = {} as Record<Tier, { mie: number; tutte: number }>;
    for (const t of TIERS) {
      const tutte = ACHIEVEMENTS.filter(a => a.tier === t);
      out[t] = { mie: tutte.filter(a => p.achievements[a.id]).length, tutte: tutte.length };
    }
    return out;
  }, [p.achievements]);

  const collezione = useMemo(
    () =>
      SLOTS.map(s => {
        const all = itemsOf(s).filter(i => i.price > 0);
        return { posto: s, nome: SLOT_NAMES[s], mie: all.filter(i => p.owned.includes(keyOf(i))).length, tutte: all.length };
      }),
    [p.owned],
  );
  const set = useMemo(() => SETS.map(s => ({ id: s.id, nome: s.name, colori: s.badge.colors, fatto: p.meta.sets.includes(s.id) })), [p.meta.sets]);

  const account = p.account ? (
    <>
      <TitoloSezione occhiello="Account" titolo={`Collegato con ${PROVIDER[p.account.provider as keyof typeof PROVIDER] ?? 'un account'}`} />
      <Superficie materiale="cuoio" livello={2} raggio={12} style={styles.account}>
        <Text style={styles.accountTesto}>Monete, trofei, tavoli e livello sono salvati: li ritrovi su ogni telefono.</Text>
        <View style={styles.accountPulsanti}>
          <Pulsante etichetta="Amici" tipo="secondario" onPress={() => router.dismissTo({ pathname: '/', params: { tab: 'amici' } })} style={{ flex: 1 }} />
          <Pulsante etichetta="Esci dall’account" tipo="terziario" onPress={() => signOut()} style={{ flex: 1 }} />
        </View>
      </Superficie>
    </>
  ) : (
    <>
      <TitoloSezione occhiello="Account" titolo="Salva i progressi" />
      <Accesso titolo="Gioca con gli amici, ovunque" testo="Con un account ritrovi monete, trofei, tavoli e livello su ogni telefono, entri nelle classifiche e vedi gli amici che giocano." />
    </>
  );

  return (
    <>
      <Stack.Screen options={{ animation: 'fade' }} />
      <VetrinaProfilo
        pub={pub}
        nome={name}
        foto={p.account?.avatar}
        trofei={p.cups}
        tuo={{
          monete: p.coins,
          livello: { have: info.have, need: info.need, frazione: levelProgress(p.xp) },
          onAvatar: () => setEditor('avatar'),
          onVetrina: () => setEditor('vetrina'),
          onTitolo: () => router.dismissTo({ pathname: '/', params: { tab: 'trofei' } }),
          onPersonalizza: () => router.push('/personalizza' as Href),
          onTrofei: () => router.dismissTo({ pathname: '/', params: { tab: 'trofei' } }),
          inUso: `item:table:${p.equipped.table}`,
          medaglie,
          collezione,
          set,
          coda: account,
        }}
      />
      {editor ? <ProfileEditor start={editor} onClose={() => setEditor(null)} /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  account: { padding: 16, gap: 14 },
  accountTesto: { fontFamily: fontArte.sora, fontSize: 14, lineHeight: 20, color: testo.forte },
  accountPulsanti: { flexDirection: 'row', gap: 10, alignItems: 'center' },
});
