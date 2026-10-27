import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { ALL, legalCards, type Card, type Match, type Signal } from '@/engine';
import { useProfile } from '@/meta/profile';
import { useSettings } from '@/state/settings';
import { canSignal, chooseCapture, clearSelection, tapCard, toggleSignal, useTable, T } from '@/state/table';
import { dur } from '@/ui/motion';
import { Text } from '@/ui/Text';
import { cardRadius, colors, fonts, radius, seatColors, shadow } from '@/ui/theme';
import { backImage, FRONTS } from './cardImages';
import { CardSprite } from './CardSprite';
import { Felt } from './Felt';
import { FxLayer } from './FxLayer';
import { hasDeck, layoutCards, measure, sideOf, TAG_H, type Geometry, type Place } from './layout';
import { Tag } from './Tag';
import { TopBar } from './TopBar';

// With a mouse, one click plays the card; on touch the first tap lifts it.
const directPointer = Platform.OS === 'web' && typeof window !== 'undefined' && !!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;

function statusOf(m: Match, p: number) {
  const h = m.h!;
  if (m.game === 'scopa') {
    const sc = h.scope[p];
    const cards = `${h.capt[p].length} carte`;
    return sc ? `${cards}, ${sc} ${sc === 1 ? 'scopa' : 'scope'}` : cards;
  }
  return `prese ${h.tricks[p]}`;
}

export function Board({ onMenu }: { onMenu: () => void }) {
  const [size, setSize] = useState<{ W: number; H: number } | null>(null);
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (!size || Math.abs(size.W - width) > 0.5 || Math.abs(size.H - height) > 0.5) setSize({ W: width, H: height });
  };
  return (
    <View style={styles.fill} onLayout={onLayout}>
      {size ? <Table W={size.W} H={size.H} onMenu={onMenu} /> : null}
    </View>
  );
}

function Table({ W, H, onMenu }: { W: number; H: number; onMenu: () => void }) {
  const m = useTable(s => s.match)!;
  const event = useTable(s => s.event);
  const awaiting = useTable(s => s.awaiting);
  const thinking = useTable(s => s.thinking);
  const selected = useTable(s => s.selected);
  const choices = useTable(s => s.choices);
  const pendingSig = useTable(s => s.pendingSig);
  const viewer = useTable(s => s.viewer);
  const fast = useSettings(s => s.fast);
  // What the player put on the table in the shop: felt, design and card back.
  const equipped = useProfile(s => s.equipped);
  const backSrc = backImage(equipped.back);
  const h = m.h;

  // The geometry depends only on the screen and the kind of game: it never changes during a hand.
  const g = useMemo(() => measure(m, W, H), [m.game, m.mode, m.n, W, H]); // eslint-disable-line react-hooks/exhaustive-deps

  const slots = useTable(s => s.slots);

  const places = useMemo(() => (h ? layoutCards({ m, viewer, g, selected, slots }) : {}), [m, viewer, g, selected, slots, h]);

  const speed = fast ? 0.55 : 1;
  const duration = dur.card * speed;
  // Mounted in the middle of a deal (the first hand): the cards still start from the deck.
  const [fresh] = useState(() => event?.k === 'deal');
  const shuffle = event?.k === 'deal' ? T.shuffle * speed : 0;
  const dealOrder = event && (event.k === 'deal' || event.k === 'dealRound') ? event.order : null;
  const dealIdx = useMemo(() => {
    const map = new Map<Card, number>();
    dealOrder?.forEach((c, i) => map.set(c, i));
    return map;
  }, [dealOrder]);
  const stepMs = T.dealCard * speed * (event?.k === 'dealRound' ? 1.4 : 1);

  // A new hand is shuffled and dealt from the middle of the table; then what is left goes to the deck.
  const center = { x: g.area.x + g.area.w / 2, y: g.area.y + g.area.h / 2, s: 0.78 };
  const origin = event?.k === 'deal' || !hasDeck(m) ? center : g.deck;
  const myTurn = awaiting === viewer && !!h;
  const legal = myTurn ? new Set(legalCards(m, viewer)) : null;
  const hidden: Place = { x: origin.x, y: origin.y, r: 0, s: origin.s, up: false, z: 0, o: 0 };

  return (
    <View style={styles.fill}>
      <Pressable style={StyleSheet.absoluteFill} onPress={clearSelection} accessible={false} />
      <Felt rect={g.felt} felt={equipped.felt} pattern={equipped.pattern} />
      <View testID="fixed-topbar" style={[styles.topBar, { left: g.cx - g.colW / 2 }]}>
        <TopBar m={m} viewer={viewer} onMenu={onMenu} width={g.colW} />
      </View>

      {h && hasDeck(m) && h.deck.length > 0 && event?.k !== 'deal' ? (
        <View pointerEvents="none" style={[styles.deckCount, { left: g.deck.x - 16, top: g.deck.y + (g.ch * g.deck.s) / 2 - 4 }]}>
          <Text allowFontScaling={false} style={styles.deckCountText}>
            {h.deck.length}
          </Text>
        </View>
      ) : null}

      {h &&
        Array.from({ length: m.n }, (_, p) => {
          const side = sideOf(m, viewer, p);
          return (
            <Tag
              key={p}
              pos={g.tags[side]}
              name={p === viewer ? 'Tu' : m.seats[p].name}
              status={statusOf(m, p)}
              color={seatColors[(p - viewer + m.n) % m.n]}
              active={!h.over && h.turn === p && (thinking === p || awaiting === p)}
              thinking={thinking === p}
              isYou={p === viewer}
            />
          );
        })}

      {ALL.map(c => {
        const place = places[c] ?? hidden;
        const mine = !!h && h.hands[viewer].includes(c);
        const di = dealIdx.get(c);
        return (
          <CardSprite
            key={c}
            c={c}
            place={place}
            cw={g.cw}
            ch={g.ch}
            delay={di === undefined ? 0 : di * stepMs}
            dealKey={m.handNo}
            fresh={fresh}
            shuffle={shuffle}
            half={c % 2 ? 1 : -1}
            origin={origin}
            duration={duration}
            dim={!!legal && mine && !legal.has(c)}
            glow={!!h?.glow?.includes(c) || (selected === c && m.game === 'scopa')}
            lift={selected === c}
            back={backSrc}
            onPress={mine && myTurn ? cc => tapCard(cc, directPointer) : undefined}
          />
        );
      })}

      {canSignal() ? <SignalBar g={g} pending={pendingSig} /> : null}
      {choices && selected !== null ? <Choices g={g} choices={choices} /> : null}
      <FxLayer g={g} m={m} viewer={viewer} />
    </View>
  );
}

function SignalBar({ g, pending }: { g: Geometry; pending: Signal | null }) {
  const sigs: Signal[] = ['Busso', 'Striscio', 'Volo'];
  const right = g.cx + g.colW / 2 - 12;
  const top = g.tags.b.y + (TAG_H - 34) / 2;
  return (
    <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(160)} style={[styles.sigbar, { right: g.W - right, top }]}>
      {sigs.map(s => {
        const on = pending === s;
        return (
          <Pressable
            key={s}
            onPress={() => toggleSignal(s)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={[styles.chip, on && styles.chipOn]}
          >
            <Text allowFontScaling={false} style={[styles.chipText, on && styles.chipTextOn]}>
              {s}
            </Text>
          </Pressable>
        );
      })}
    </Animated.View>
  );
}

/** Scopa: more than one capture is possible with the card you lifted. */
function Choices({ g, choices }: { g: Geometry; choices: Card[][] }) {
  const mw = 34;
  const mh = mw * (575 / 360);
  const w = Math.min(g.colW - 24, 360);
  return (
    <Animated.View
      entering={FadeIn.duration(160)}
      exiting={FadeOut.duration(160)}
      style={[styles.choices, { left: g.cx - w / 2, width: w, bottom: g.H - g.tags.b.y + 8 }]}
    >
      <Text allowFontScaling={false} style={styles.choicesTitle}>
        Cosa prendi?
      </Text>
      <View style={styles.choiceList}>
        {choices.map((opt, i) => (
          <Pressable
            key={i}
            onPress={() => chooseCapture(opt)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.choice, pressed && { opacity: 0.75 }]}
          >
            {opt.map(c => (
              <View key={c} style={{ width: mw, height: mh, borderRadius: cardRadius(mw), overflow: 'hidden' }}>
                <Image source={FRONTS[c]} style={{ width: mw, height: mh }} contentFit="fill" transition={null} />
              </View>
            ))}
          </Pressable>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  topBar: { position: 'absolute', top: 0, zIndex: 700 },
  deckCount: {
    position: 'absolute',
    width: 32,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 90,
    boxShadow: shadow.card,
  },
  deckCountText: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 13, color: colors.ink, fontVariant: ['tabular-nums'] },
  sigbar: { position: 'absolute', flexDirection: 'row', gap: 6, zIndex: 650 },
  chip: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    justifyContent: 'center',
    backgroundColor: colors.shade,
    borderWidth: 1,
    borderColor: colors.glassLine,
  },
  chipOn: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF', boxShadow: '0px 0px 16px rgba(255,255,255,0.5)' },
  chipText: { fontFamily: fonts.semi, fontSize: 12.5, lineHeight: 16, color: colors.text },
  chipTextOn: { color: colors.ink },
  choices: {
    position: 'absolute',
    zIndex: 800,
    padding: 14,
    borderRadius: radius.l,
    backgroundColor: colors.shadeStrong,
    borderWidth: 1,
    borderColor: colors.glassLine,
    boxShadow: '0px 14px 30px rgba(40,8,70,0.45)',
  },
  choicesTitle: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 19, color: colors.text, marginBottom: 10 },
  choiceList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: {
    flexDirection: 'row',
    gap: 4,
    padding: 7,
    borderRadius: radius.s,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassLine,
  },
});
