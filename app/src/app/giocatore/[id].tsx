// Il profilo di un altro giocatore: la stessa vetrina del tuo profilo (ui/profilo/VetrinaProfilo), con solo quello
// che sta nel suo profilo pubblico, più le vostre sfide. Da qui si aggiunge agli amici, si sfida o si toglie.
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { GameId } from '@/engine';
import { useProfile } from '@/meta/profile';
import { duelsWith, publicProfile, removeFriend, sendFriendRequest, type PublicView, type RequestResult } from '@/meta/social';
import { accento, fondo, fontArte, Pulsante, Sala, testo } from '@/ui/arte';
import { sfx } from '@/ui/feedback';
import { Indietro } from '@/ui/profilo/comuni';
import { ProfiloAltro, type Duello } from '@/ui/profilo/ProfiloAltro';
import { Text } from '@/ui/Text';

const REQUEST_TEXT: Record<RequestResult, string> = {
  sent: 'Richiesta mandata: diventate amici quando la accetta.',
  friends: 'Ora siete amici.',
  already: 'Hai già mandato una richiesta.',
  self: 'Sei tu.',
  notfound: 'Giocatore non trovato.',
  limit: 'Hai mandato troppe richieste oggi: riprova domani.',
  error: 'Non riesco a collegarmi, riprova.',
};

/** Le schermate d'attesa e d'errore: la stessa sala, con un messaggio sotto la lampada. */
function Attesa({ children }: { children: React.ReactNode }) {
  const ins = useSafeAreaInsets();
  return (
    <View style={styles.schermo}>
      <Stack.Screen options={{ animation: 'fade' }} />
      <Sala accendi />
      <View style={[styles.barra, { marginTop: ins.top }]}>
        <Indietro />
      </View>
      <View style={styles.centro}>{children}</View>
    </View>
  );
}

export default function Giocatore() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const account = useProfile(s => s.account);
  const [view, setView] = useState<PublicView | null | 'error'>(null);
  const [duels, setDuels] = useState<Duello[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (account && id === account.id) {
      router.replace('/profilo');
      return;
    }
    let live = true;
    Promise.all([publicProfile(id), duelsWith(id).catch(() => [] as Duello[])])
      .then(([v, d]) => {
        if (!live) return;
        setView(v ?? 'error');
        setDuels(d);
      })
      .catch(() => live && setView('error'));
    return () => {
      live = false;
    };
  }, [id, account, version]);

  if (!account)
    return (
      <Attesa>
        <Text style={styles.messaggio}>Per vedere i profili degli altri giocatori entra con un account dal tuo profilo.</Text>
      </Attesa>
    );

  if (view === null)
    return (
      <Attesa>
        <ActivityIndicator color={accento.oro} />
      </Attesa>
    );

  if (view === 'error')
    return (
      <Attesa>
        <Text style={styles.messaggio}>Non riesco a caricare questo profilo. Controlla la connessione.</Text>
        <Pulsante etichetta="Riprova" tipo="secondario" onPress={() => setVersion(v => v + 1)} style={{ marginTop: 18, alignSelf: 'stretch' }} />
      </Attesa>
    );

  const add = async () => {
    setMsg(null);
    const r = await sendFriendRequest(view.id);
    if (r === 'sent' || r === 'friends') sfx('pts');
    setMsg(REQUEST_TEXT[r]);
    if (r === 'friends') setVersion(v => v + 1);
  };
  const remove = async () => {
    await removeFriend(view.id).catch(() => {});
    setVersion(v => v + 1);
  };
  const challenge = (game: GameId) => router.push({ pathname: '/gioca/[game]', params: { game, online: '1', invite: view.id } });

  return (
    <>
      <Stack.Screen options={{ animation: 'fade' }} />
      <ProfiloAltro view={view} duelli={duels} onAggiungi={add} onTogli={remove} onSfida={challenge} messaggio={msg} />
    </>
  );
}

const styles = StyleSheet.create({
  schermo: { flex: 1, backgroundColor: fondo.base },
  barra: { height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  centro: { flex: 1, maxWidth: 520, width: '100%', alignSelf: 'center', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 120 },
  messaggio: { textAlign: 'center', fontFamily: fontArte.sora, fontSize: 16, lineHeight: 24, color: testo.forte },
});
