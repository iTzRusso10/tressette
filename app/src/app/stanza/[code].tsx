import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native';
import { GAMES, MODE_INFO, type GameId } from '@/engine';
import { isOnline, seenText, sendInvite } from '@/meta/social';
import { refreshSocial, useSocial } from '@/state/social';
import { PlayerAvatar } from '@/ui/avatar';
import { freeSeat, hostStart, joinRoom, leaveRoom, onlineConfigured, roomLink, useOnline } from '@/online/session';
import { useProfile } from '@/meta/profile';
import { useSettings } from '@/state/settings';
import { CoinIcon } from '@/ui/meta';
import { quitMatch } from '@/state/table';
import { BackButton, Button, Screen } from '@/ui/kit';
import { Text } from '@/ui/Text';
import { colors, fonts, radius, seatColors, space } from '@/ui/theme';

/** Gli amici collegati: un tocco e ricevono l'invito nella stanza (vale dieci minuti). */
function InviteFriends({ code, game, mode, invited }: { code: string; game: GameId; mode: string; invited?: string }) {
  const account = useProfile(s => s.account);
  const friends = useSocial(s => s.friends);
  const [sent, setSent] = useState<Record<string, 'ok' | 'err'>>(() => (invited ? { [invited]: 'ok' } : {}));
  useEffect(() => {
    if (account) void refreshSocial();
  }, [account]);
  if (!account || !friends?.length) return null;
  const list = [...friends].sort((a, b) => Number(isOnline(b.last_seen)) - Number(isOnline(a.last_seen))).slice(0, 8);
  const invite = async (id: string) => {
    setSent(s => ({ ...s, [id]: 'ok' }));
    const r = await sendInvite(id, code, game, mode);
    if (r !== 'ok') setSent(s => ({ ...s, [id]: 'err' }));
  };
  return (
    <View style={styles.friends}>
      <Text v="label">Invita un amico</Text>
      {list.map(f => {
        const pub = (f.pub ?? {}) as { avatar?: string; frame?: string };
        const st = sent[f.id];
        return (
          <View key={f.id} style={styles.friend}>
            <PlayerAvatar avatar={pub.avatar} photo={f.avatar} name={f.name} frame={pub.frame} size={40} />
            <View style={{ flex: 1 }}>
              <Text v="label" numberOfLines={1}>
                {f.name}
              </Text>
              <Text v="small" style={isOnline(f.last_seen) ? { color: colors.mint } : undefined}>
                {seenText(f.last_seen)}
              </Text>
            </View>
            {st === 'ok' ? (
              <Text v="small" style={{ color: colors.mint }}>
                Invitato
              </Text>
            ) : (
              <Button kind="secondary" label={st === 'err' ? 'Riprova' : 'Invita'} onPress={() => invite(f.id)} style={{ minHeight: 40, paddingHorizontal: 16 }} />
            )}
          </View>
        );
      })}
    </View>
  );
}

/** The room before the match: the code to share, who is in, and the start. Also opened from an invite link. */
export default function Stanza() {
  const { code, invited } = useLocalSearchParams<{ code: string; invited?: string }>();
  const { role, lobby, online, hostOnline, closed, status, me } = useOnline();
  const name = useSettings(s => s.name);
  const coins = useProfile(s => s.coins);
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
            placeholderTextColor={colors.textFaint}
            maxLength={16}
            autoCorrect={false}
            style={styles.input}
            accessibilityLabel="Il tuo nome"
          />
          <Button label={joining ? 'Mi collego…' : 'Entra nella stanza'} onPress={join} disabled={joining || !name.trim()} style={{ marginTop: space.l }} />
          {error ? (
            <Text v="small" style={{ color: colors.coral, marginTop: space.s }}>
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
        {cfg?.stake ? (
          <View style={styles.stake}>
            <CoinIcon size={20} />
            <Text v="label">Posta {cfg.stake.toLocaleString('it-IT')}: chi vince prende il piatto</Text>
          </View>
        ) : null}
        <Text style={styles.code} accessibilityLabel={`Codice ${code.split('').join(' ')}`}>
          {code}
        </Text>
        {status !== 'online' ? (
          <View style={styles.statusRow}>
            <ActivityIndicator color={colors.sun} />
            <Text v="small">Mi collego…</Text>
          </View>
        ) : null}

        {role === 'host' ? (
          <Button
            kind="secondary"
            label="Invita"
            sub="Manda il link o il codice agli amici"
            onPress={() =>
              Share.share({
                message: `Vieni a giocare a ${cfg ? GAMES[cfg.game].name : 'carte'} con me su Napoletane: ${roomLink(code)} (codice ${code})`,
              }).catch(() => {})
            }
            style={{ marginTop: space.l }}
          />
        ) : null}
        {role === 'host' && cfg && !lobby?.started ? <InviteFriends code={code} game={cfg.game} mode={cfg.mode} invited={invited} /> : null}

        <View style={styles.seats}>
          {(lobby?.seats ?? []).map((s, i) => {
            const isMe = s.peer === me;
            const on = s.type === 'cpu' || isMe || (s.peer ? online.includes(s.peer) : false) || (role === 'guest' && s.type === 'human' && hostOnline);
            const label = s.type === 'cpu' ? 'Posto libero' : s.name + (isMe ? ' (tu)' : '');
            const state = s.type === 'cpu' ? 'gioca il computer' : on ? (s.type === 'human' ? 'ha creato la stanza' : 'è dentro') : 'in attesa…';
            return (
              <View key={i} style={styles.seat}>
                <View style={[styles.dot, { backgroundColor: s.type === 'cpu' ? colors.textFaint : seatColors[i % 4] }]} />
                <View style={{ flex: 1 }}>
                  <Text v="label">{label}</Text>
                  <Text v="small">{state}</Text>
                </View>
                {role === 'host' && s.type === 'remote' ? (
                  <Pressable accessibilityRole="button" accessibilityLabel={`Libera il posto di ${s.name}`} onPress={() => freeSeat(i)} hitSlop={8}>
                    <Text v="small" style={{ color: colors.coral }}>
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
        ) : cfg?.stake && coins < cfg.stake ? (
          <Text v="lead" style={{ marginTop: space.xl, textAlign: 'center' }}>
            Per questa stanza servono {cfg.stake.toLocaleString('it-IT')} monete e ne hai {coins.toLocaleString('it-IT')}. Puoi giocare, ma senza posta.
          </Text>
        ) : (
          <Text v="lead" style={{ marginTop: space.xl, textAlign: 'center' }}>
            {closed
              ? 'La stanza è stata chiusa.'
              : hostOnline
                ? `Aspetta che ${lobby?.host.name ?? 'chi ha creato la stanza'} inizi la partita.`
                : 'Chi ha creato la stanza si è disconnesso. Aspetta che torni.'}
          </Text>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { height: 52, justifyContent: 'center', paddingHorizontal: space.l },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: space.xl, paddingBottom: space.xxxl },
  code: { fontFamily: fonts.display, fontSize: 72, lineHeight: 80, letterSpacing: 10, color: colors.sun, marginTop: space.xs, fontVariant: ['lining-nums'] },
  stake: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: space.s },
  statusRow: { flexDirection: 'row', gap: space.s, alignItems: 'center' },
  input: {
    height: 54,
    borderRadius: radius.pill,
    paddingHorizontal: space.l,
    fontFamily: fonts.medium,
    fontSize: 17,
    color: colors.text,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassLine,
  },
  seats: { marginTop: space.xl, borderTopWidth: 1, borderColor: colors.glassLineSoft },
  seat: { flexDirection: 'row', alignItems: 'center', gap: space.m, paddingVertical: space.m, borderBottomWidth: 1, borderColor: colors.glassLineSoft },
  dot: { width: 10, height: 10, borderRadius: 5 },
  friends: { marginTop: space.xl, gap: space.s },
  friend: { flexDirection: 'row', alignItems: 'center', gap: space.m, paddingVertical: 4 },
});
