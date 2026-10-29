// Pagina di sviluppo: le parti sociali con dati di prova (senza server), per controllarle a occhio.
// Si apre da /dev/sociale. Mette un account finto e amici, richieste, inviti e sfide finti.
// Con /dev/sociale?profilo=1 (o ?profilo=amico) apre il profilo pubblico di prova completo di un altro giocatore
// (Assunta: arena 22, cornice leggendaria, vetrina piena, leghe passate), come lo mostra giocatore/[id]: solo i
// dati che stanno in PublicProfile più la riga pubblica (nome, trofei, ultima volta vista) e le vostre sfide.
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import type { PublicProfile } from '@/meta/ledger';
import { useProfile } from '@/meta/profile';
import type { PublicView } from '@/meta/social';
import { useSocial } from '@/state/social';
import { Amici } from '@/sections/Amici';
import { GameRow } from '@/sections/Classifica';
import { FriendsCard } from '@/sections/HomeCards';
import { Button } from '@/ui/kit';
import { ProfiloAltro } from '@/ui/profilo/ProfiloAltro';
import { Text } from '@/ui/Text';
import { colors } from '@/ui/theme';

const ago = (min: number) => new Date(Date.now() - min * 60000).toISOString();
const pub = (avatar: string, frame: string, arena: number): Partial<PublicProfile> => ({ avatar, frame, arena });

/** Il profilo pubblico di prova completo: tutti i campi di PublicProfile, niente di più. */
export const PROFILO_PROVA: PublicProfile = {
  v: 1,
  avatar: 'limone',
  frame: 'gemme',
  title: 're-della-scopa',
  showcase: ['back:sole-nero', 'ach:venti-di-fila', 'table:marmo-di-carrara'].map(k => (k.startsWith('ach:') ? k : `item:${k}`)),
  arena: 21,
  level: 64,
  prestige: 0,
  played: 1284,
  won: 801,
  bestStreak: 21,
  games: {
    tressette: { played: 402, won: 236, best: 12, r: 1418, n: 160 },
    briscola: { played: 371, won: 229, best: 14, r: 1372, n: 140 },
    scopa: { played: 511, won: 336, best: 21, r: 1534, n: 210 },
  },
  achievements: 96,
  secrets: 5,
  sets: 4,
  leagues: [
    { season: 'preseason', game: 'scopa', league: 'ducato' },
    { season: 'stagione-dei-re', game: 'scopa', league: 'oncia' },
    { season: 'stagione-dei-re', game: 'tressette', league: 'piastra' },
    { season: 'stagione-dei-re', game: 'briscola', league: 'ducato' },
  ],
};

const VISTA_PROVA = (amico: boolean): PublicView => ({
  id: 'a2',
  name: 'Assunta',
  photo: null,
  pub: PROFILO_PROVA,
  cups: 2210,
  xp: 182000,
  lastSeen: ago(2),
  friend: amico,
  myWins: 3,
  theirWins: 7,
});

const DUELLI = [
  { game: 'scopa' as const, won: false, lost: true, at: ago(60 * 20) },
  { game: 'scopa' as const, won: true, lost: false, at: ago(60 * 44) },
  { game: 'briscola' as const, won: false, lost: true, at: ago(60 * 70) },
  { game: 'tressette' as const, won: false, lost: true, at: ago(60 * 26 * 3) },
];

function useFake(senzaInviti = false) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    useProfile.setState({ account: { id: '00000000-0000-4000-8000-000000000001', name: 'Giuseppe', provider: 'google', avatar: null } as never, friendCode: 'NAP7Q2' });
    useSocial.setState({
      friends: [
        { id: 'a1', name: 'Carmine', avatar: null, xp: 4000, cups: 1420, via: 'codice', pub: pub('corona', 'alloro', 14), last_seen: ago(1) },
        { id: 'a2', name: 'Assunta', avatar: null, xp: 9000, cups: 2210, via: 'codice', pub: PROFILO_PROVA, last_seen: ago(2) },
        { id: 'a3', name: 'Gennaro', avatar: null, xp: 1200, cups: 640, via: 'facebook', pub: pub('vesuvio', 'oro-sottile', 6), last_seen: ago(180) },
        { id: 'a4', name: 'Nunzia', avatar: null, xp: 300, cups: 120, via: 'codice', pub: pub('iniziale', 'semplice', 1), last_seen: ago(60 * 50) },
      ],
      requests: [{ id: 'r1', name: 'Salvatore', photo: null, pub: pub('spada', 'perle', 9), cups: 900 }],
      rivals: [
        { id: 'a1', name: 'Carmine', photo: null, pub: pub('corona', 'alloro', 14), cups: 1420, games: 12, myWins: 7, theirWins: 5, lastAt: ago(30) },
        { id: 'a2', name: 'Assunta', photo: null, pub: PROFILO_PROVA, cups: 2210, games: 10, myWins: 3, theirWins: 7, lastAt: ago(300) },
      ],
      invites: senzaInviti ? [] : [{ id: 'i1', from: { id: 'a1', name: 'Carmine', photo: null, pub: pub('corona', 'alloro', 14), cups: 1420 }, code: '4821', game: 'scopa', mode: '2', at: ago(1) }],
      error: false,
    });
    // Pagina di prova: i dati finti vanno messi prima di mostrare le schede.
    setReady(true); // eslint-disable-line react-hooks/set-state-in-effect
  }, [senzaInviti]);
  return ready;
}

const rows = [
  { id: 'x1', name: 'Assunta', photo: null, pub: { avatar: 'limone', frame: 'lega-oncia' }, score: 1534, games: 61, rank: 1, isMe: false },
  { id: 'x2', name: 'Carmine', photo: null, pub: { avatar: 'corona', frame: 'alloro' }, score: 1388, games: 40, rank: 2, isMe: false },
  { id: 'x3', name: 'Ciro', photo: null, pub: { avatar: 'sette', frame: 'stelle' }, score: 1302, games: 33, rank: 3, isMe: false },
  { id: 'x4', name: 'Giuseppe', photo: null, pub: { avatar: 'sole', frame: 'raggi' }, score: 1182, games: 24, rank: 4, isMe: true },
];

/** Il profilo di prova a schermo intero; aggiungi, togli e sfida cambiano solo lo stato della pagina. */
function ProfiloProva({ amicoAllInizio }: { amicoAllInizio: boolean }) {
  const [amico, setAmico] = useState(amicoAllInizio);
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <ProfiloAltro
      view={VISTA_PROVA(amico)}
      duelli={amico ? DUELLI : []}
      onAggiungi={() => setMsg('Richiesta mandata: diventate amici quando la accetta.')}
      onTogli={() => setAmico(false)}
      onSfida={() => setMsg('Qui partirebbe la sfida.')}
      messaggio={msg}
    />
  );
}

export default function DevSociale() {
  const { profilo } = useLocalSearchParams<{ profilo?: string }>();
  const ready = useFake(!!profilo);
  const { width } = useWindowDimensions();
  const colW = Math.min(width, 560) - 40;
  if (!ready) return null;
  if (profilo) return <ProfiloProva amicoAllInizio={profilo === 'amico'} />;
  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={{ alignItems: 'center', paddingVertical: 20 }}>
        <View style={{ width: colW, gap: 8 }}>
          <Text v="h1">Sociale (prova)</Text>
          <Button kind="secondary" label="Profilo di prova di un altro" sub="Assunta, arena 22: solo dati pubblici" onPress={() => router.push('/dev/sociale?profilo=amico')} />
          <Text v="label">Classifica di un gioco</Text>
          {rows.map(r => (
            <GameRow key={r.id} r={r} period="stagione" />
          ))}
          <Text v="label" style={{ marginTop: 12 }}>
            Home
          </Text>
        </View>
        <FriendsCard width={colW} onOpen={() => {}} />
        <View style={{ height: 900, width: '100%' }}>
          <Amici active />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: colors.violet } });
