import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { useCallback, useEffect, useState } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GAMES, type Match } from '@/engine';
import { Board } from '@/game/Board';
import { FRONTS } from '@/game/cardImages';
import { Sheet } from '@/game/Sheet';
import { Summary } from '@/game/Summary';
import { useSettings } from '@/state/settings';
import { leaveRoom, useOnline } from '@/online/session';
import { loadSaved, nameOf, netRole, quitMatch, resumeMatch, setPaused, useTable } from '@/state/table';
import { Backdrop, Button, Toggle } from '@/ui/kit';
import { Text } from '@/ui/Text';
import { CARD_RATIO, cardRadius, colors, space } from '@/ui/theme';

type Panel = null | 'pause' | 'last' | 'quit';

function modeText(m: Match) {
  if (m.mode === '2') return 'in due';
  if (m.mode === '4') return 'in quattro a coppie';
  return m.n === 2 ? 'a perdere in due' : 'a perdere in quattro';
}

export default function Tavolo() {
  useKeepAwake();
  const ins = useSafeAreaInsets();
  const m = useTable(s => s.match);
  const summary = useTable(s => s.summary);
  const viewer = useTable(s => s.viewer);
  const sound = useSettings(s => s.sound);
  const haptics = useSettings(s => s.haptics);
  const fast = useSettings(s => s.fast);
  const set = useSettings(s => s.set);
  const [panel, setPanel] = useState<Panel>(null);

  // Opened directly (a reload on the web): pick up the saved match or go back to the menu.
  const closed = useOnline(s => s.closed);
  const hostOnline = useOnline(s => s.hostOnline);
  const role = netRole();
  useEffect(() => {
    if (m || role === 'guest') return;
    loadSaved().then(saved => {
      if (saved) resumeMatch(saved);
      else router.replace('/');
    });
  }, [m, role]);

  const open = (p: Panel) => {
    setPanel(p);
    // Online, friends can't stop the host's table: the pause is only for the host and for local games.
    if (netRole() !== 'guest') setPaused(p !== null);
  };

  // Android back: one step at a time, like the buttons on screen.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (summary) return true;
        if (panel === 'last' || panel === 'quit') {
          setPanel('pause');
          return true;
        }
        open(panel === 'pause' ? null : 'pause');
        return true;
      });
      return () => sub.remove();
    }, [panel, summary]),
  );

  const exit = () => {
    setPanel(null);
    quitMatch();
    leaveRoom();
    router.replace('/');
  };

  if (!m)
    return (
      <View style={[styles.root, styles.center]}>
        <Backdrop />
        <Text v="lead">{closed ? 'La stanza è stata chiusa.' : 'Si distribuiscono le carte…'}</Text>
        {closed ? <Button label="Torna al menu" onPress={exit} style={{ marginTop: space.l }} /> : null}
      </View>
    );
  const last = m.h?.last;

  return (
    <View style={styles.root}>
      <Backdrop />
      <View style={{ flex: 1, paddingTop: ins.top, paddingBottom: ins.bottom, paddingLeft: ins.left, paddingRight: ins.right }}>
        <Board onMenu={() => open('pause')} />
      </View>

      {summary && m.h?.result ? <Summary m={m} viewer={viewer} /> : null}

      {role === 'guest' && (closed || !hostOnline) && !panel ? (
        <Sheet title={closed ? 'La stanza è chiusa' : 'In attesa'} sub={closed ? 'Chi ha creato la stanza ha chiuso la partita.' : 'Chi ha creato la stanza si è disconnesso. Quando torna, la partita riprende da qui.'}>
          <Button kind={closed ? 'primary' : 'secondary'} label={closed ? 'Torna al menu' : 'Esci dalla stanza'} onPress={exit} />
        </Sheet>
      ) : null}

      {panel === 'pause' ? (
        <Sheet title="Pausa" sub={`${GAMES[m.game].name} ${modeText(m)}, mano ${m.handNo}.`} onDismiss={() => open(null)}>
          <View style={{ gap: space.s }}>
            <Button label="Torna al tavolo" onPress={() => open(null)} />
            <Button kind="secondary" label="Ultima presa" sub={last ? `Presa da ${nameOf(m, last.w)}` : 'Ancora nessuna presa'} disabled={!last} onPress={() => setPanel('last')} />
            <Button kind="secondary" label="Come si gioca" onPress={() => router.push({ pathname: '/regole/[game]', params: { game: m.game } })} />
          </View>
          <View style={styles.toggles}>
            <Toggle label="Suoni" value={sound} onChange={v => set({ sound: v })} />
            <Toggle label="Vibrazione" value={haptics} onChange={v => set({ haptics: v })} />
            <Toggle label="Partita veloce" sub="Animazioni e turni del computer più rapidi." value={fast} onChange={v => set({ fast: v })} />
          </View>
          <Button kind="danger" label="Esci dalla partita" onPress={() => setPanel('quit')} style={{ marginTop: space.l }} />
        </Sheet>
      ) : null}

      {panel === 'last' && last ? (
        <Sheet title="Ultima presa" sub={`Presa da ${nameOf(m, last.w)}.`} onDismiss={() => setPanel('pause')}>
          <View style={styles.lastRow}>
            {last.trick.map(e => {
              const w = 70;
              return (
                <View key={e.c} style={styles.lastItem}>
                  <View style={[styles.lastCard, { width: w, height: w * CARD_RATIO, borderRadius: cardRadius(w) }, e.p === last.w && styles.lastWin]}>
                    <Image source={FRONTS[e.c]} style={{ width: w, height: w * CARD_RATIO }} contentFit="fill" transition={null} />
                  </View>
                  <Text v="small" numberOfLines={1} style={{ textAlign: 'center', marginTop: 6 }}>
                    {e.p >= 0 ? (e.p === viewer ? 'Tu' : nameOf(m, e.p)) : 'dal tavolo'}
                  </Text>
                </View>
              );
            })}
          </View>
          <Button label="Chiudi" onPress={() => setPanel('pause')} style={{ marginTop: space.xl }} />
        </Sheet>
      ) : null}

      {panel === 'quit' ? (
        <Sheet
          title={role === 'guest' ? 'Uscire dalla stanza?' : 'Uscire dalla partita?'}
          sub={role === 'guest' ? 'Gli altri continuano: al tuo posto gioca il computer.' : role === 'host' ? 'La partita viene chiusa anche per chi gioca con te.' : 'La partita in corso viene chiusa e non si può riprendere.'}
          onDismiss={() => setPanel('pause')}>
          <View style={{ gap: space.s }}>
            <Button kind="danger" label="Sì, esci" onPress={exit} />
            <Button kind="secondary" label="No, continua a giocare" onPress={() => setPanel('pause')} />
          </View>
        </Sheet>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.velluto },
  center: { alignItems: 'center', justifyContent: 'center', padding: space.xl },
  toggles: { marginTop: space.l, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.lineaTenue },
  lastRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.m, justifyContent: 'center' },
  lastItem: { width: 76, alignItems: 'center' },
  lastCard: { overflow: 'hidden', backgroundColor: colors.marmo },
  lastWin: { borderWidth: 2.5, borderColor: colors.ottoneChiaro },
});
