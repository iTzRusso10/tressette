import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Share, StyleSheet, TextInput, View } from 'react-native';
import { arenaByTrophies } from '@/meta/arenas';
import { levelLabel } from '@/meta/levels';
import { addFriendByCode, loadFriends, type Friend } from '@/meta/friends';
import { useProfile } from '@/meta/profile';
import { sfx } from '@/ui/feedback';
import { Icon, TrophyIcon } from '@/ui/icons';
import { Button } from '@/ui/kit';
import { LevelAvatar } from '@/ui/meta';
import { SignInPanel } from '@/ui/SignIn';
import { Text } from '@/ui/Text';
import { colors, fonts, radius, space } from '@/ui/theme';
import { MiniCard } from './GameTiles';
import { Panel, SectionScroll, SectionTitle } from './parts';

function PlayTogether() {
  return (
    <Panel style={styles.together}>
      <View style={styles.fan} pointerEvents="none">
        <MiniCard c={30} w={40} style={{ position: 'absolute', left: 0, top: 8, transform: [{ rotate: '-12deg' }] }} />
        <MiniCard c={16} w={40} style={{ position: 'absolute', left: 22, top: 0, transform: [{ rotate: '0deg' }] }} />
        <MiniCard c={22} w={40} style={{ position: 'absolute', left: 44, top: 8, transform: [{ rotate: '12deg' }] }} />
      </View>
      <Text v="title" style={{ marginTop: space.m }}>
        Gioca con gli amici
      </Text>
      <Text v="body" style={{ marginTop: 2, textAlign: 'center' }}>
        Crea una stanza e invita fino a tre amici con un link o un codice. I posti liberi li prende il computer.
      </Text>
      <Button label="Crea o entra in una stanza" onPress={() => router.push('/online')} style={{ marginTop: space.l, alignSelf: 'stretch' }} />
    </Panel>
  );
}

function FriendRow({ f }: { f: Friend }) {
  const cups = f.cups ?? 0;
  return (
    <View style={styles.friend}>
      {f.avatar ? <Image source={{ uri: f.avatar }} style={styles.friendPhoto} /> : <LevelAvatar name={f.name} xp={f.xp} size={44} />}
      <View style={{ flex: 1 }}>
        <Text v="label" numberOfLines={1}>
          {f.name}
        </Text>
        <Text v="small" numberOfLines={1}>
          {levelLabel(f.xp)}, {arenaByTrophies(cups).name}
          {f.via === 'facebook' ? ', da Facebook' : ''}
        </Text>
      </View>
      <View style={styles.cups}>
        <TrophyIcon size={18} />
        <Text style={styles.cupsText}>{cups}</Text>
      </View>
    </View>
  );
}

export function Amici({ active }: { active: boolean }) {
  const account = useProfile(s => s.account);
  const friendCode = useProfile(s => s.friendCode);
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [code, setCode] = useState('');
  const [addMsg, setAddMsg] = useState<string | null>(null);

  const [version, setVersion] = useState(0);
  const refresh = () => setVersion(v => v + 1);
  useEffect(() => {
    if (!active || !account) return;
    let live = true;
    loadFriends()
      .then(list => live && setFriends(list.slice().sort((a, b) => (b.cups ?? 0) - (a.cups ?? 0))))
      .catch(() => live && setFriends([]));
    return () => {
      live = false;
    };
  }, [active, account, version]);

  const add = async () => {
    setAddMsg(null);
    const r = await addFriendByCode(code);
    setAddMsg(
      r === 'ok' ? 'Amico aggiunto.' : r === 'self' ? 'È il tuo codice.' : r === 'notfound' ? 'Nessun giocatore con questo codice.' : 'Non riesco a collegarmi, riprova.',
    );
    if (r === 'ok') {
      sfx('pts');
      setCode('');
      refresh();
    }
  };

  return (
    <SectionScroll>
      <SectionTitle title="Amici" sub="Gioca con loro e confronta i trofei." />
      <PlayTogether />
      {account ? (
        <>
          <Panel style={styles.codeBox}>
            <View style={{ flex: 1 }}>
              <Text v="small" style={{ color: colors.textSoft }}>
                Il tuo codice amico
              </Text>
              <Text style={styles.code}>{friendCode ?? '······'}</Text>
            </View>
            <Button
              kind="secondary"
              label="Condividi"
              onPress={() => Share.share({ message: `Aggiungimi su Napoletane con il codice ${friendCode ?? ''}` }).catch(() => {})}
              style={{ minHeight: 44, paddingHorizontal: 16 }}
            />
          </Panel>
          <View style={styles.addRow}>
            <TextInput
              value={code}
              onChangeText={v =>
                setCode(
                  v
                    .replace(/[^a-zA-Z0-9]/g, '')
                    .slice(0, 8)
                    .toUpperCase(),
                )
              }
              placeholder="Codice di un amico"
              placeholderTextColor="rgba(255,255,255,0.45)"
              autoCapitalize="characters"
              autoCorrect={false}
              style={styles.input}
              accessibilityLabel="Codice di un amico"
            />
            <Button label="Aggiungi" onPress={add} disabled={code.length < 4} style={{ minHeight: 50, paddingHorizontal: 18 }} />
          </View>
          {addMsg ? (
            <Text v="small" style={{ marginTop: space.xs }}>
              {addMsg}
            </Text>
          ) : null}
          <Text style={styles.listTitle}>I tuoi amici</Text>
          <View style={{ gap: space.s }}>
            {friends === null ? (
              <ActivityIndicator color={colors.text} style={{ marginTop: space.l }} />
            ) : friends.length === 0 ? (
              <View style={styles.empty}>
                <Icon name="friends" size={28} color={colors.textSoft} />
                <Text v="body" style={{ textAlign: 'center' }}>
                  {account.provider === 'facebook'
                    ? 'Qui compaiono gli amici di Facebook che giocano a Napoletane, e chi aggiungi con il codice.'
                    : 'Aggiungi gli amici con il loro codice. Se accedi con Facebook compaiono anche i tuoi amici che giocano.'}
                </Text>
              </View>
            ) : (
              friends.map(f => <FriendRow key={f.id} f={f} />)
            )}
          </View>
        </>
      ) : (
        <View style={{ marginTop: space.l }}>
          <SignInPanel
            title="Trova i tuoi amici"
            body="Con un account vedi gli amici che giocano, li aggiungi con un codice, confronti i trofei e ritrovi i progressi su ogni telefono."
          />
        </View>
      )}
    </SectionScroll>
  );
}

const styles = StyleSheet.create({
  together: { alignItems: 'center' },
  fan: { width: 84, height: 72 },
  codeBox: { flexDirection: 'row', alignItems: 'center', gap: space.m, marginTop: space.l },
  code: { fontFamily: fonts.display, fontSize: 26, lineHeight: 32, letterSpacing: 3, color: colors.sun },
  addRow: { flexDirection: 'row', gap: space.s, marginTop: space.m, alignItems: 'center' },
  input: {
    flex: 1,
    height: 50,
    borderRadius: radius.pill,
    paddingHorizontal: space.l,
    fontFamily: fonts.semi,
    fontSize: 16,
    letterSpacing: 2,
    color: colors.text,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassLine,
  },
  listTitle: { fontFamily: fonts.semi, fontSize: 13.5, lineHeight: 18, color: colors.textSoft, marginTop: space.xl, marginBottom: space.s },
  friend: { flexDirection: 'row', alignItems: 'center', gap: space.m, padding: space.m, borderRadius: radius.l, backgroundColor: colors.panel },
  friendPhoto: { width: 44, height: 44, borderRadius: 22 },
  cups: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cupsText: { fontFamily: fonts.display, fontSize: 16, lineHeight: 20, color: colors.text, fontVariant: ['tabular-nums'] },
  empty: { alignItems: 'center', gap: space.s, padding: space.l, borderRadius: radius.l, backgroundColor: 'rgba(255,255,255,0.06)' },
});
