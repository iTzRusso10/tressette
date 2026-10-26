import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { createRoom } from '@/online/session';
import { CPU_NAMES, GAMES, MODE_INFO, targetsFor, type GameId, type Level, type Mode, type Seat } from '@/engine';
import { FRONTS } from '@/game/cardImages';
import { useSettings } from '@/state/settings';
import { startMatch } from '@/state/table';
import { BackButton, Button, Choice, Screen, Section, Toggle } from '@/ui/kit';
import { Text } from '@/ui/Text';
import { CARD_RATIO, cardRadius, colors, space } from '@/ui/theme';

const EMBLEM: Record<GameId, number> = { tressette: 12, briscola: 20, scopa: 16 };

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

  const cw = 64;
  return (
    <Screen>
      <View style={styles.top}>
        <BackButton />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <View style={[styles.card, { width: cw, height: cw * CARD_RATIO, borderRadius: cardRadius(cw) }]}>
            <Image source={FRONTS[EMBLEM[game]]} style={{ width: cw, height: cw * CARD_RATIO }} contentFit="fill" transition={null} />
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
              <Text v="label">Si perde a 31</Text>
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
          <View style={styles.toggles}>
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
          </View>
        ) : null}

        {isOnline ? (
          <Button label={busy ? 'Apro la stanza…' : 'Crea la stanza'} sub="Poi inviti gli amici con il codice" onPress={open} disabled={busy} style={{ marginTop: space.xxl }} />
        ) : (
          <Button label="Distribuisci le carte" onPress={play} style={{ marginTop: space.xxl }} />
        )}
        <Button kind="quiet" label={`Come si gioca a ${info.name}`} onPress={() => router.push({ pathname: '/regole/[game]', params: { game } })} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { height: 52, justifyContent: 'center', paddingHorizontal: space.l },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: space.xl, paddingBottom: space.xxl },
  head: { flexDirection: 'row', gap: space.l, alignItems: 'center', marginTop: space.s },
  card: { overflow: 'hidden', backgroundColor: colors.marmo, boxShadow: '0px 8px 18px rgba(0,0,0,0.4)', transform: [{ rotate: '-4deg' }] },
  fixed: {
    minHeight: 46,
    borderRadius: 14,
    paddingHorizontal: 14,
    justifyContent: 'center',
    backgroundColor: 'rgba(200,161,90,0.14)',
    borderWidth: 1,
    borderColor: colors.ottone,
  },
  toggles: { marginTop: space.l, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.lineaTenue },
});
