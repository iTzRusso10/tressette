import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native';
import { GAMES, MODE_INFO } from '@/engine';
import { freeSeat, hostStart, joinRoom, leaveRoom, onlineConfigured, roomLink, useOnline } from '@/online/session';
import { useSettings } from '@/state/settings';
import { quitMatch } from '@/state/table';
import { BackButton, Button, Screen } from '@/ui/kit';
import { Text } from '@/ui/Text';
import { colors, fonts, seatColors, space } from '@/ui/theme';

/** The room before the match: the code to share, who is in, and the start. Also opened from an invite link. */
export default function Stanza() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { role, lobby, online, hostOnline, closed, status, me } = useOnline();
  const name = useSettings(s => s.name);
  const setName = useSettings(s => s.set);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inRoom = !!role && (role === 'guest' || lobby?.code === code);

  // A friend opened an invite link: join as soon as we know their name.
  const join = async () => {
    setJoining(true);
    setError(null);
    const r = await joinRoom(code, name.trim() || 'Amico');
    setJoining(false);
    if (r === 'nohost') setError(`La stanza ${code} non è aperta. Chiedi a chi ti ha invitato di riaprirla.`);
    else if (r === 'error') setError('Non riesco a collegarmi. Controlla la connessione e riprova.');
  };

  // The host started: everyone goes to the table.
  useEffect(() => {
    if (lobby?.started) router.replace('/tavolo');
  }, [lobby?.started]);

  const leave = () => {
    quitMatch();
    leaveRoom();
    router.replace('/');
  };

  if (!onlineConfigured)
    return (
      <Screen>
        <View style={styles.top}>
          <BackButton onPress={() => router.replace('/')} />
        </View>
        <View style={styles.content}>
          <Text v="h1">Stanza {code}</Text>
          <Text v="body" style={{ marginTop: space.s }}>
            L’online non è ancora attivo in questa versione dell’app.
          </Text>
        </View>
      </Screen>
    );

  if (!inRoom)
    return (
      <Screen>
        <View style={styles.top}>
          <BackButton onPress={() => router.replace('/')} />
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text v="body">Ti hanno invitato al tavolo</Text>
          <Text style={styles.code}>{code}</Text>
          <Text v="label" style={{ marginTop: space.xl, marginBottom: space.s }}>
            Come ti chiami?
          </Text>
          <TextInput
            value={name}
            onChangeText={v => setName({ name: v.slice(0, 16) })}
            placeholder="Il tuo nome"
            placeholderTextColor={colors.salvia}
            maxLength={16}
            autoCorrect={false}
            style={styles.input}
            accessibilityLabel="Il tuo nome"
          />
          <Button label={joining ? 'Mi collego…' : 'Entra nella stanza'} onPress={join} disabled={joining || !name.trim()} style={{ marginTop: space.l }} />
          {error ? (
            <Text v="small" style={{ color: colors.pompeiChiaro, marginTop: space.s }}>
              {error}
            </Text>
          ) : null}
        </ScrollView>
      </Screen>
    );

  const cfg = lobby?.cfg;
  return (
    <Screen>
      <View style={styles.top}>
        <BackButton label="Esci dalla stanza" onPress={leave} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text v="body">{cfg ? `${GAMES[cfg.game].name}, ${MODE_INFO[cfg.game][cfg.mode]![0].toLowerCase()}` : 'Stanza'}</Text>
        <Text style={styles.code} accessibilityLabel={`Codice ${code.split('').join(' ')}`}>
          {code}
        </Text>
        {status !== 'online' ? (
          <View style={styles.statusRow}>
            <ActivityIndicator color={colors.ottoneChiaro} />
            <Text v="small">Mi collego…</Text>
          </View>
        ) : null}

        {role === 'host' ? (
          <Button
            kind="secondary"
            label="Invita"
            sub="Manda il link o il codice agli amici"
            onPress={() => Share.share({ message: `Vieni a giocare a ${cfg ? GAMES[cfg.game].name : 'carte'} con me su Napoletane: ${roomLink(code)} (codice ${code})` }).catch(() => {})}
            style={{ marginTop: space.l }}
          />
        ) : null}

        <View style={styles.seats}>
          {(lobby?.seats ?? []).map((s, i) => {
            const isMe = s.peer === me;
            const on = s.type === 'cpu' || isMe || (s.peer ? online.includes(s.peer) : false) || (role === 'guest' && s.type === 'human' && hostOnline);
            const label = s.type === 'cpu' ? 'Posto libero' : s.name + (isMe ? ' (tu)' : '');
            const state = s.type === 'cpu' ? 'gioca il computer' : on ? (s.type === 'human' ? 'ha creato la stanza' : 'è dentro') : 'in attesa…';
            return (
              <View key={i} style={styles.seat}>
                <View style={[styles.dot, { backgroundColor: s.type === 'cpu' ? colors.salvia : seatColors[i % 4] }]} />
                <View style={{ flex: 1 }}>
                  <Text v="label">{label}</Text>
                  <Text v="small">{state}</Text>
                </View>
                {role === 'host' && s.type === 'remote' ? (
                  <Pressable accessibilityRole="button" accessibilityLabel={`Libera il posto di ${s.name}`} onPress={() => freeSeat(i)} hitSlop={8}>
                    <Text v="small" style={{ color: colors.pompeiChiaro }}>
                      Libera
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </View>
        {cfg?.mode === '4' ? (
          <Text v="small" style={{ marginTop: space.s }}>
            In quattro a coppie il primo amico che entra gioca con te.
          </Text>
        ) : null}

        {role === 'host' ? (
          <Button label="Inizia la partita" onPress={hostStart} disabled={status !== 'online'} style={{ marginTop: space.xl }} />
        ) : (
          <Text v="lead" style={{ marginTop: space.xl, textAlign: 'center' }}>
            {closed ? 'La stanza è stata chiusa.' : hostOnline ? `Aspetta che ${lobby?.host.name ?? 'chi ha creato la stanza'} inizi la partita.` : 'Chi ha creato la stanza si è disconnesso. Aspetta che torni.'}
          </Text>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { height: 52, justifyContent: 'center', paddingHorizontal: space.l },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: space.xl, paddingBottom: space.xxxl },
  code: { fontFamily: fonts.display, fontSize: 72, lineHeight: 80, letterSpacing: 10, color: colors.ottoneChiaro, marginTop: space.xs, fontVariant: ['lining-nums'] },
  statusRow: { flexDirection: 'row', gap: space.s, alignItems: 'center' },
  input: {
    height: 54,
    borderRadius: 14,
    paddingHorizontal: space.l,
    fontFamily: fonts.ui,
    fontSize: 17,
    color: colors.marmo,
    backgroundColor: 'rgba(242,236,224,0.05)',
    borderWidth: 1,
    borderColor: colors.linea,
  },
  seats: { marginTop: space.xl, borderTopWidth: 1, borderColor: colors.lineaTenue },
  seat: { flexDirection: 'row', alignItems: 'center', gap: space.m, paddingVertical: space.m, borderBottomWidth: 1, borderColor: colors.lineaTenue },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
