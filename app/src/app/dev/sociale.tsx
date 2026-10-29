// Pagina di sviluppo: le parti sociali con dati di prova (senza server), per controllarle a occhio.
// Si apre da /dev/sociale. Mette un account finto e amici, richieste, inviti e sfide finti.
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import type { PublicProfile } from '@/meta/ledger';
import { useProfile } from '@/meta/profile';
import { useSocial } from '@/state/social';
import { Amici } from '@/sections/Amici';
import { GameRow } from '@/sections/Classifica';
import { FriendsCard } from '@/sections/HomeCards';
import { Text } from '@/ui/Text';
import { colors } from '@/ui/theme';

const ago = (min: number) => new Date(Date.now() - min * 60000).toISOString();
const pub = (avatar: string, frame: string, arena: number): Partial<PublicProfile> => ({ avatar, frame, arena });

function useFake() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    useProfile.setState({ account: { id: '00000000-0000-4000-8000-000000000001', name: 'Giuseppe', provider: 'google', avatar: null } as never, friendCode: 'NAP7Q2' });
    useSocial.setState({
      friends: [
        { id: 'a1', name: 'Carmine', avatar: null, xp: 4000, cups: 1420, via: 'codice', pub: pub('corona', 'alloro', 14), last_seen: ago(1) },
        { id: 'a2', name: 'Assunta', avatar: null, xp: 9000, cups: 2210, via: 'codice', pub: pub('limone', 'maiolica', 22), last_seen: ago(2) },
        { id: 'a3', name: 'Gennaro', avatar: null, xp: 1200, cups: 640, via: 'facebook', pub: pub('vesuvio', 'oro-sottile', 6), last_seen: ago(180) },
        { id: 'a4', name: 'Nunzia', avatar: null, xp: 300, cups: 120, via: 'codice', pub: pub('iniziale', 'semplice', 1), last_seen: ago(60 * 50) },
      ],
      requests: [{ id: 'r1', name: 'Salvatore', photo: null, pub: pub('spada', 'perle', 9), cups: 900 }],
      rivals: [
        { id: 'a1', name: 'Carmine', photo: null, pub: pub('corona', 'alloro', 14), cups: 1420, games: 12, myWins: 7, theirWins: 5, lastAt: ago(30) },
        { id: 'a2', name: 'Assunta', photo: null, pub: pub('limone', 'maiolica', 22), cups: 2210, games: 4, myWins: 1, theirWins: 3, lastAt: ago(300) },
      ],
      invites: [{ id: 'i1', from: { id: 'a1', name: 'Carmine', photo: null, pub: pub('corona', 'alloro', 14), cups: 1420 }, code: '4821', game: 'scopa', mode: '2', at: ago(1) }],
      error: false,
    });
    // Pagina di prova: i dati finti vanno messi prima di mostrare le schede.
    setReady(true); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);
  return ready;
}

const rows = [
  { id: 'x1', name: 'Assunta', photo: null, pub: { avatar: 'limone', frame: 'lega-oncia' }, score: 1534, games: 61, rank: 1, isMe: false },
  { id: 'x2', name: 'Carmine', photo: null, pub: { avatar: 'corona', frame: 'alloro' }, score: 1388, games: 40, rank: 2, isMe: false },
  { id: 'x3', name: 'Ciro', photo: null, pub: { avatar: 'sette', frame: 'stelle' }, score: 1302, games: 33, rank: 3, isMe: false },
  { id: 'x4', name: 'Giuseppe', photo: null, pub: { avatar: 'sole', frame: 'raggi' }, score: 1182, games: 24, rank: 4, isMe: true },
];

export default function DevSociale() {
  const ready = useFake();
  const { width } = useWindowDimensions();
  const colW = Math.min(width, 560) - 40;
  if (!ready) return null;
  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={{ alignItems: 'center', paddingVertical: 20 }}>
        <View style={{ width: colW, gap: 8 }}>
          <Text v="h1">Sociale (prova)</Text>
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
