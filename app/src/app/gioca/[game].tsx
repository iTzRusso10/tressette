import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { createRoom } from '@/online/session';
import { CPU_NAMES, GAMES, MODE_INFO, targetsFor, type GameId, type Level, type Mode, type Seat } from '@/engine';
import { FRONTS } from '@/game/cardImages';
import { useSettings } from '@/state/settings';
import { startMatch } from '@/state/table';
import { BackButton, Button, Choice, Glass, Screen, Section, Toggle } from '@/ui/kit';
import { Text } from '@/ui/Text';
import { CARD_RATIO, cardRadius, colors, radius, shadow, space } from '@/ui/theme';

const FAN: Record<GameId, [number, number, number]> = { tressette: [12, 32, 21], briscola: [20, 3, 29], scopa: [16, 6, 26] };

export default function Setup() {
  const { game: raw, online } = useLocalSearchParams<{ game: string; online?: string }>();
  const isOnline = online === '1';
  const [busy, setBusy] = useState(false);
  const game: GameId = raw === 'briscola' || raw === 'scopa' ? raw : 'tressette';
  const s = useSettings();
  const prefs = s.games[game];
  const info = GAMES[game];
  const perdere = game === 'tressette' && prefs.mode === 'perdere';
  const targets = targetsFor(game, prefs.mode);

  const play = () => {
    const n = prefs.mode === '2' || (perdere && prefs.perdN === 2) ? 2 : 4;
    const seats: Seat[] = [{ name: s.name.trim() || 'Tu', type: 'human' }, ...CPU_NAMES.slice(0, n - 1).map(name => ({ name, type: 'cpu' as const }))];
    s.set({ lastGame: game });
    startMatch({
      game,
      mode: prefs.mode,
      perdN: prefs.perdN,
      seats,
      level: s.level,
      target: prefs.target,
      accusi: s.accusi,
      cappotto: s.cappotto,
    });
    router.replace('/tavolo');
  };

  const open = async () => {
    setBusy(true);
    try {
      const code = await createRoom(
        { game, mode: prefs.mode, perdN: prefs.perdN, target: prefs.target, level: s.level, accusi: s.accusi, cappotto: s.cappotto },
        s.name.trim() || 'Tu',
      );
      router.replace({ pathname: '/stanza/[code]', params: { code } });
    } catch {
      setBusy(false);
    }
  };

  const cw = 50;
  const ch = cw * CARD_RATIO;
  const mini = (c: number, x: number, y: number, r: number) => (
    <View key={c} style={[styles.card, { width: cw, height: ch, borderRadius: cardRadius(cw), left: x, top: y, transform: [{ rotate: `${r}deg` }] }]}>
      <Image source={FRONTS[c]} style={{ width: cw, height: ch }} contentFit="fill" transition={null} />
    </View>
  );
  return (
    <Screen>
      <View style={styles.top}>
        <BackButton />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <View style={{ width: cw * 2.1, height: ch + 14 }} pointerEvents="none">
            {mini(FAN[game][0], 0, 10, -12)}
            {mini(FAN[game][1], cw * 0.5, 2, -1)}
            {mini(FAN[game][2], cw * 1.05, 8, 11)}
          </View>
          <View style={{ flex: 1 }}>
            <Text v="h1" accessibilityRole="header">
              {info.name}
            </Text>
            <Text v="body" style={{ marginTop: space.xs }}>
              {info.desc}
            </Text>
          </View>
        </View>

        <Section title="Modalità" note={MODE_INFO[game][prefs.mode]![1]}>
          <Choice<Mode>
            label="Modalità"
            value={prefs.mode}
            onChange={mode => s.setGame(game, { mode })}
            options={info.modes.map(m => ({ value: m, label: MODE_INFO[game][m]![0] }))}
          />
        </Section>

        {perdere ? (
          <Section title="Giocatori">
            <Choice<2 | 4>
              label="Giocatori"
              value={prefs.perdN}
              onChange={perdN => s.setGame(game, { perdN })}
              options={[
                { value: 2, label: 'In due' },
                { value: 4, label: 'In quattro' },
              ]}
            />
          </Section>
        ) : null}

        {perdere ? (
          <Section title="Punteggio" note="A perdere chi arriva a 31 perde, e vince chi ha meno punti.">
            <View style={styles.fixed}>
              <Text v="label" style={styles.fixedText}>
                Si perde a 31
              </Text>
            </View>
          </Section>
        ) : (
          <Section title={info.tlabel}>
            <Choice<number>
              label={info.tlabel}
              value={prefs.target}
              onChange={target => s.setGame(game, { target })}
              options={targets.map(t => ({ value: t, label: String(t) }))}
            />
          </Section>
        )}

        <Section title="Computer">
          <Choice<Level>
            label="Livello del computer"
            value={s.level}
            onChange={level => s.set({ level })}
            options={[
              { value: 'facile', label: 'Facile' },
              { value: 'medio', label: 'Medio' },
              { value: 'difficile', label: 'Esperto' },
            ]}
          />
        </Section>

        {game === 'tressette' ? (
          <Glass style={styles.toggles}>
            {perdere ? (
              <Toggle
                label="Cappotto"
                sub="Chi prende tutti i punti della mano, ultima compresa, vince subito."
                value={s.cappotto}
                onChange={cappotto => s.set({ cappotto })}
              />
            ) : (
              <Toggle label="Accusi" sub="Napoletana, tris e quattro di Assi, Due e Tre." value={s.accusi} onChange={accusi => s.set({ accusi })} />
            )}
          </Glass>
        ) : null}

        {isOnline ? (
          <Button
            label={busy ? 'Apro la stanza…' : 'Crea la stanza'}
            sub="Poi inviti gli amici con il codice"
            onPress={open}
            disabled={busy}
            style={{ marginTop: space.xxl }}
          />
        ) : (
          <Button label="Distribuisci le carte" onPress={play} style={{ marginTop: space.xxl }} />
        )}
        <Button kind="quiet" label={`Come si gioca a ${info.name}`} onPress={() => router.push({ pathname: '/regole/[game]', params: { game } })} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { height: 56, justifyContent: 'center', paddingHorizontal: space.l },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 20, paddingBottom: space.xxl },
  head: { flexDirection: 'row', gap: space.l, alignItems: 'center', marginTop: space.xs },
  card: { position: 'absolute', overflow: 'hidden', backgroundColor: '#FFFFFF', boxShadow: shadow.card },
  fixed: { height: 48, borderRadius: radius.pill, paddingHorizontal: 18, justifyContent: 'center', backgroundColor: '#FFFFFF', alignSelf: 'flex-start' },
  fixedText: { color: colors.ink },
  toggles: { marginTop: space.xl, paddingHorizontal: space.l, paddingVertical: space.xs },
});
