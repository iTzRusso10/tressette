import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Platform, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { supabaseConfigured } from '@/lib/supabase';
import { appleAvailable, signIn, signOut, type Provider } from '@/meta/auth';
import { levelOf, levelProgress, xpForLevel } from '@/meta/economy';
import { addFriendByCode, loadFriends, type Friend } from '@/meta/friends';
import { useProfile } from '@/meta/profile';
import { useSettings } from '@/state/settings';
import { sfx } from '@/ui/feedback';
import { BackButton, Button, Glass, Screen, Section, Squish } from '@/ui/kit';
import { CoinPill, LevelAvatar } from '@/ui/meta';
import { Text } from '@/ui/Text';
import { colors, fonts, gradients, radius, space } from '@/ui/theme';
import { LinearGradient } from 'expo-linear-gradient';

const GAME_NAMES = { tressette: 'Tressette', briscola: 'Briscola', scopa: 'Scopa' } as const;

function ProviderLogo({ p }: { p: Provider }) {
  if (p === 'apple')
    return (
      <Svg width={18} height={20} viewBox="0 0 17 20">
        <Path
          d="M14.1 10.6c0-2.4 2-3.6 2.1-3.7-1.2-1.7-3-1.9-3.6-2-1.5-.2-3 .9-3.8.9-.8 0-2-.9-3.3-.9C3.8 5 2.2 6 1.4 7.5c-1.8 3.1-.5 7.6 1.3 10.1.8 1.2 1.8 2.6 3.1 2.5 1.3-.1 1.7-.8 3.3-.8 1.5 0 2 .8 3.3.8 1.4 0 2.2-1.2 3-2.4.9-1.4 1.3-2.7 1.4-2.8-.1 0-2.7-1-2.7-4.3zM11.6 3.4c.7-.8 1.2-2 1-3.1-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.9-1 3 1.1.1 2.2-.6 2.9-1.4z"
          fill="#FFFFFF"
        />
      </Svg>
    );
  if (p === 'google')
    return (
      <Svg width={18} height={18} viewBox="0 0 48 48">
        <Path
          d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
          fill="#FFC107"
        />
        <Path d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" fill="#FF3D00" />
        <Path d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" fill="#4CAF50" />
        <Path d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" fill="#1976D2" />
      </Svg>
    );
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path
        d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12z"
        fill="#FFFFFF"
      />
    </Svg>
  );
}

const PROVIDER_LABEL: Record<Provider, string> = { apple: 'Continua con Apple', google: 'Continua con Google', facebook: 'Continua con Facebook' };

function ProviderButton({ p, onPress, busy }: { p: Provider; onPress: () => void; busy: boolean }) {
  const st = p === 'apple' ? styles.apple : p === 'google' ? styles.google : styles.facebook;
  return (
    <Squish accessibilityRole="button" accessibilityLabel={PROVIDER_LABEL[p]} disabled={busy} onPress={onPress} style={[styles.provider, st]}>
      <ProviderLogo p={p} />
      <Text style={[styles.providerText, p === 'google' && { color: '#1F1F1F' }]}>{PROVIDER_LABEL[p]}</Text>
    </Squish>
  );
}

export default function Profilo() {
  const p = useProfile();
  const localName = useSettings(s => s.name.trim());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apple, setApple] = useState(false);
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [code, setCode] = useState('');
  const [addMsg, setAddMsg] = useState<string | null>(null);

  useEffect(() => {
    appleAvailable().then(setApple);
  }, []);

  const refreshFriends = useCallback(() => {
    if (!p.account) return;
    setFriends(null);
    loadFriends()
      .then(setFriends)
      .catch(() => setFriends([]));
  }, [p.account]);
  useFocusEffect(refreshFriends);

  const name = p.account?.name || localName || 'Tu';
  const lvl = levelOf(p.xp);
  const winRate = p.stats.played ? Math.round((p.stats.won / p.stats.played) * 100) : 0;

  const go = async (prov: Provider) => {
    setError(null);
    setBusy(true);
    const r = await signIn(prov);
    setBusy(false);
    if (r === 'unavailable') setError('L’accesso non è ancora attivo in questa versione: manca il collegamento al server.');
    else if (typeof r === 'object') setError(`Accesso non riuscito: ${r.error}`);
  };

  const add = async () => {
    setAddMsg(null);
    const r = await addFriendByCode(code);
    setAddMsg(
      r === 'ok'
        ? 'Amico aggiunto.'
        : r === 'self'
          ? 'È il tuo codice.'
          : r === 'notfound'
            ? 'Nessun giocatore con questo codice.'
            : 'Non riesco a collegarmi, riprova.',
    );
    if (r === 'ok') {
      sfx('pts');
      setCode('');
      refreshFriends();
    }
  };

  return (
    <Screen>
      <View style={styles.top}>
        <BackButton />
        <View style={{ flex: 1 }} />
        <CoinPill coins={p.coins} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.head}>
          {p.account?.avatar ? (
            <View>
              <Image source={{ uri: p.account.avatar }} style={styles.photo} />
              <View style={styles.levelChip}>
                <Text style={styles.levelChipText}>{lvl}</Text>
              </View>
            </View>
          ) : (
            <LevelAvatar name={name} xp={p.xp} size={84} />
          )}
          <View style={{ flex: 1 }}>
            <Text v="h1" numberOfLines={1}>
              {name}
            </Text>
            <Text v="small" style={{ color: colors.textSoft }}>
              Livello {lvl}: {p.xp - xpForLevel(lvl)} su {xpForLevel(lvl + 1) - xpForLevel(lvl)} punti per il prossimo
            </Text>
            <View style={styles.xpTrack}>
              <View style={[styles.xpFill, { width: `${Math.max(4, levelProgress(p.xp) * 100)}%` }]} />
            </View>
          </View>
        </View>

        <View style={styles.record}>
          <Text v="lead">
            {p.stats.played
              ? `${p.stats.played} ${p.stats.played === 1 ? 'partita' : 'partite'}, ${p.stats.won} ${p.stats.won === 1 ? 'vinta' : 'vinte'} (${winRate}%).`
              : 'Ancora nessuna partita: le tue statistiche compaiono qui.'}
          </Text>
          {(Object.keys(GAME_NAMES) as (keyof typeof GAME_NAMES)[]).map(g => {
            const st = p.stats.byGame[g];
            return (
              <View key={g} style={styles.gameRow}>
                <Text v="label" style={styles.gameName}>
                  {GAME_NAMES[g]}
                </Text>
                <View style={styles.bar}>
                  <LinearGradient
                    colors={gradients.games[g]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.barFill, { width: `${st.played ? Math.max(6, (st.won / st.played) * 100) : 0}%` }]}
                  />
                </View>
                <Text v="small" style={styles.gameCount}>
                  {st.won}/{st.played}
                </Text>
              </View>
            );
          })}
          <View style={styles.chips}>
            <View style={styles.chip}>
              <Text style={styles.chipText}>{p.stats.scope} scope</Text>
            </View>
            <View style={styles.chip}>
              <Text style={styles.chipText}>Serie migliore: {p.stats.bestStreak}</Text>
            </View>
            {p.stats.settebelli ? (
              <View style={styles.chip}>
                <Text style={styles.chipText}>{p.stats.settebelli} settebelli</Text>
              </View>
            ) : null}
          </View>
        </View>

        {p.account ? (
          <Section title="Amici">
            <Glass style={styles.codeBox}>
              <View style={{ flex: 1 }}>
                <Text v="small" style={{ color: colors.textSoft }}>
                  Il tuo codice amico
                </Text>
                <Text style={styles.code}>{p.friendCode ?? '······'}</Text>
              </View>
              <Button
                kind="secondary"
                label="Condividi"
                onPress={() => Share.share({ message: `Aggiungimi su Napoletane con il codice ${p.friendCode ?? ''}` }).catch(() => {})}
                style={{ minHeight: 44, paddingHorizontal: 16 }}
              />
            </Glass>
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
            <View style={{ marginTop: space.m, gap: space.s }}>
              {friends === null ? (
                <ActivityIndicator color={colors.text} />
              ) : friends.length === 0 ? (
                <Text v="small">
                  {p.account.provider === 'facebook'
                    ? 'Qui compaiono gli amici di Facebook che giocano a Napoletane, e chi aggiungi con il codice.'
                    : 'Aggiungi gli amici con il loro codice. Se accedi con Facebook compaiono anche i tuoi amici che giocano.'}
                </Text>
              ) : (
                friends.map(f => (
                  <View key={f.id} style={styles.friend}>
                    {f.avatar ? <Image source={{ uri: f.avatar }} style={styles.friendPhoto} /> : <LevelAvatar name={f.name} xp={f.xp} size={40} />}
                    <View style={{ flex: 1 }}>
                      <Text v="label">{f.name}</Text>
                      <Text v="small">
                        Livello {levelOf(f.xp)}
                        {f.via === 'facebook' ? ', da Facebook' : ''}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
            <Button kind="quiet" label="Esci dall’account" onPress={() => signOut()} style={{ marginTop: space.l }} />
          </Section>
        ) : (
          <Section title="Account">
            <Glass style={styles.signIn}>
              <Text v="title">Salva i progressi e gioca con gli amici</Text>
              <Text v="body" style={{ marginTop: space.xs }}>
                Con un account ritrovi monete, trofei e livello su ogni telefono, e vedi gli amici che giocano.
              </Text>
              <View style={{ gap: space.s, marginTop: space.l }}>
                {apple || Platform.OS !== 'android' ? <ProviderButton p="apple" busy={busy} onPress={() => go('apple')} /> : null}
                <ProviderButton p="google" busy={busy} onPress={() => go('google')} />
                <ProviderButton p="facebook" busy={busy} onPress={() => go('facebook')} />
              </View>
              {!supabaseConfigured ? (
                <Text v="small" style={{ marginTop: space.m }}>
                  L’accesso si attiva quando l’app è collegata al server. Intanto i progressi restano su questo telefono.
                </Text>
              ) : null}
              {error ? (
                <Text v="small" style={{ marginTop: space.m, color: colors.coral }}>
                  {error}
                </Text>
              ) : null}
            </Glass>
          </Section>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.l },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 20, paddingBottom: space.xxxl },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.l, marginTop: space.s },
  photo: { width: 84, height: 84, borderRadius: 42, borderWidth: 3, borderColor: colors.sun },
  levelChip: {
    position: 'absolute',
    right: -2,
    bottom: 0,
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.ink,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelChipText: { fontFamily: fonts.display, fontSize: 12, lineHeight: 15, color: '#FFFFFF' },
  xpTrack: { height: 8, borderRadius: 4, backgroundColor: colors.glassStrong, marginTop: 8, overflow: 'hidden' },
  xpFill: { height: 8, borderRadius: 4, backgroundColor: colors.sun },
  record: {
    marginTop: space.xl,
    padding: space.l,
    borderRadius: radius.l,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.panelLine,
    gap: space.m,
  },
  gameRow: { flexDirection: 'row', alignItems: 'center', gap: space.m },
  gameName: { width: 84 },
  bar: { flex: 1, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  barFill: { height: 10, borderRadius: 5 },
  gameCount: { width: 40, textAlign: 'right', color: colors.textSoft },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s, marginTop: space.xs },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.glass },
  chipText: { fontFamily: fonts.semi, fontSize: 12.5, lineHeight: 16, color: colors.text },
  signIn: { padding: space.l, backgroundColor: colors.panel, borderColor: colors.panelLine },
  provider: { height: 52, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  apple: { backgroundColor: '#000000' },
  google: { backgroundColor: '#FFFFFF' },
  facebook: { backgroundColor: '#1877F2' },
  providerText: { fontFamily: fonts.bold, fontSize: 15.5, lineHeight: 20, color: '#FFFFFF' },
  codeBox: { flexDirection: 'row', alignItems: 'center', padding: space.l, gap: space.m, backgroundColor: colors.panel, borderColor: colors.panelLine },
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
  friend: { flexDirection: 'row', alignItems: 'center', gap: space.m, padding: space.s, borderRadius: radius.m, backgroundColor: colors.panel },
  friendPhoto: { width: 40, height: 40, borderRadius: 20 },
});
