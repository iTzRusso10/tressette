import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { ARENA_SIZE, arenaFloor, arenaOf, arenaProgress, ARENAS, LAST_ARENA, type Arena } from '@/meta/arenas';
import { useProfile } from '@/meta/profile';
import { TROPHIES } from '@/meta/progress';
import { itemById } from '@/meta/shop';
import { ArenaScene } from '@/ui/ArenaScene';
import { BackPreview, TablePreview } from '@/ui/cosmetics';
import { Icon, TrophyIcon } from '@/ui/icons';
import { Choice } from '@/ui/kit';
import { Badge, CoinIcon } from '@/ui/meta';
import { Text } from '@/ui/Text';
import { colors, fonts, radius, space } from '@/ui/theme';
import { Pips, SectionTitle } from './parts';

type View_ = 'arene' | 'medaglie';

function Reward({ arena, small }: { arena: Arena; small?: boolean }) {
  const felt = itemById(arena.felt);
  const back = arena.back ? itemById(arena.back) : null;
  const tw = small ? 64 : 84;
  return (
    <View style={styles.rewards}>
      <View style={styles.reward}>
        <TablePreview felt={arena.felt} pattern="nessuno" width={tw} height={Math.round(tw * 0.66)} />
        <Text style={styles.rewardText} numberOfLines={1}>
          {felt?.name}
        </Text>
      </View>
      {back ? (
        <View style={styles.reward}>
          <BackPreview id={back.id} width={Math.round(tw * 0.42)} />
          <Text style={styles.rewardText} numberOfLines={1}>
            Dorso
          </Text>
        </View>
      ) : null}
      {arena.coins ? (
        <View style={styles.reward}>
          <View style={[styles.coinBox, { height: Math.round(tw * 0.66) }]}>
            <CoinIcon size={small ? 22 : 28} />
          </View>
          <Text style={styles.rewardText}>+{arena.coins.toLocaleString('it-IT')}</Text>
        </View>
      ) : null}
    </View>
  );
}

function ArenaStop({ arena, cups, best, width }: { arena: Arena; cups: number; best: number; width: number }) {
  const current = arenaOf(cups).index === arena.index;
  const reached = arenaOf(best).index >= arena.index;
  const { have } = arenaProgress(cups);
  const h = current ? 150 : 110;
  return (
    <View style={[styles.stop, { width }, current && styles.stopCurrent]}>
      <View style={{ height: h }}>
        <ArenaScene id={arena.id} width={width} height={h} dim={!reached} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: reached ? 'rgba(28,8,52,0.25)' : 'rgba(20,4,40,0.35)' }]} />
        <View style={styles.stopHead}>
          <View style={[styles.chip, current && { backgroundColor: colors.sun }]}>
            <Text style={[styles.chipText, current && { color: colors.ink }]}>{current ? 'Sei qui' : `Arena ${arena.index + 1}`}</Text>
          </View>
          <Text style={styles.stopName}>{arena.name}</Text>
          <Text style={styles.stopDesc} numberOfLines={2}>
            {arena.desc}
          </Text>
        </View>
        {!reached ? (
          <View style={styles.lock}>
            <Icon name="lock" size={16} color={colors.text} />
            <TrophyIcon size={16} />
            <Text style={styles.lockText}>{arenaFloor(arena.index)}</Text>
          </View>
        ) : !current ? (
          <View style={[styles.lock, { backgroundColor: 'rgba(124,242,210,0.25)' }]}>
            <Icon name="check" size={16} color={colors.mint} stroke={2.6} />
          </View>
        ) : null}
      </View>
      <View style={styles.stopFoot}>
        {current ? (
          <View style={styles.progress}>
            <Pips have={Math.min(have, ARENA_SIZE)} size={Math.min(26, (width - 60) / 8 - 6)} />
            <Text style={styles.progressText}>
              {arena.index === LAST_ARENA && have >= ARENA_SIZE ? `Leggenda: ${cups} trofei` : `${have} su ${ARENA_SIZE} trofei`}
            </Text>
          </View>
        ) : null}
        {arena.index > 0 ? <Reward arena={arena} small={!current} /> : <Text v="small">Il primo tavolo: il panno smeraldo.</Text>}
      </View>
    </View>
  );
}

/** The road of the arenas, from the first to the Reggia, opened at the one you are in. */
function Road({ width }: { width: number }) {
  const cups = useProfile(s => s.cups);
  const best = useProfile(s => s.bestCups);
  const ref = useRef<ComponentRef<typeof ScrollView>>(null);
  const ys = useRef<number[]>([]);
  const current = arenaOf(cups).index;
  const [placed, setPlaced] = useState(false);
  useEffect(() => {
    if (placed) return;
    const t = setTimeout(() => {
      const y = ys.current[current];
      if (y !== undefined && current > 0) ref.current?.scrollTo({ y: Math.max(0, y - 90), animated: false });
      setPlaced(true);
    }, 60);
    return () => clearTimeout(t);
  }, [current, placed]);
  return (
    <ScrollView ref={ref} contentContainerStyle={[styles.road, { width: width + 40 }]} showsVerticalScrollIndicator={false}>
      <RoadHeader />
      {ARENAS.map(a => (
        <View key={a.id} onLayout={e => (ys.current[a.index] = e.nativeEvent.layout.y)}>
          {a.index > 0 ? (
            <View style={styles.link}>
              <View style={styles.linkLine} />
              <View style={styles.linkBadge}>
                <TrophyIcon size={14} muted={best < arenaFloor(a.index)} />
                <Text style={styles.linkText}>{arenaFloor(a.index)}</Text>
              </View>
              <View style={styles.linkLine} />
            </View>
          ) : null}
          <ArenaStop arena={a} cups={cups} best={best} width={width} />
        </View>
      ))}
      <View style={styles.legend}>
        <Icon name="crown" size={26} color={colors.sun} />
        <Text v="title" style={{ textAlign: 'center' }}>
          Leggenda
        </Text>
        <Text v="body" style={{ textAlign: 'center' }}>
          Dopo la Reggia i trofei continuano a contare: sali nella classifica di tutti i giocatori.
        </Text>
      </View>
    </ScrollView>
  );
}

function RoadHeader() {
  return (
    <View style={styles.rules}>
      <Text v="body">Ogni 8 trofei si sale di arena e si vince un tavolo nuovo. Un’arena raggiunta resta tua: non si scende sotto il suo primo trofeo.</Text>
    </View>
  );
}

/** The medals: goals with coins and experience as a prize (they were called trophies before the arenas). */
function Medaglie({ width }: { width: number }) {
  const stats = useProfile(s => s.stats);
  const have = useProfile(s => s.trophies);
  const cols = width > 460 ? 3 : 2;
  const gap = space.m;
  const cw = (width - gap * (cols - 1)) / cols;
  const tierColor = (coins: number) => (coins >= 500 ? '#FFC23D' : coins >= 200 ? '#8FB8FF' : '#FF8FBF');
  const list = TROPHIES.slice().sort((a, b) => {
    const ua = have[a.id] ?? 0;
    const ub = have[b.id] ?? 0;
    if (ua || ub) return ub - ua;
    const [pa, ga] = a.progress(stats);
    const [pb, gb] = b.progress(stats);
    return pb / gb - pa / ga;
  });
  const count = Object.keys(have).length;
  return (
    <ScrollView contentContainerStyle={[styles.road, { width: width + 40 }]} showsVerticalScrollIndicator={false}>
      <Text v="body" style={{ marginBottom: space.m }}>
        {count === 0 ? 'Ogni medaglia vale monete ed esperienza.' : `Ne hai ${count} su ${TROPHIES.length}: ognuna vale monete ed esperienza.`}
      </Text>
      <View style={[styles.grid, { gap }]}>
        {list.map(t => {
          const [p, goal] = t.progress(stats);
          const on = !!have[t.id];
          return (
            <View key={t.id} style={[styles.card, { width: cw }, on && { borderColor: tierColor(t.coins), boxShadow: `0px 0px 18px ${tierColor(t.coins)}55` }]}>
              <Badge glyph={t.glyph} coins={t.coins} size={58} locked={!on} />
              <Text style={styles.name} numberOfLines={2}>
                {t.title}
              </Text>
              <Text style={styles.desc} numberOfLines={3}>
                {t.desc}
              </Text>
              <View style={styles.foot}>
                {on ? (
                  <Text style={styles.done}>Vinta</Text>
                ) : (
                  <View style={{ flex: 1 }}>
                    <View style={styles.track}>
                      <View style={[styles.fill, { width: `${(p / goal) * 100}%` }]} />
                    </View>
                    <Text style={styles.count}>
                      {p}/{goal}
                    </Text>
                  </View>
                )}
                <View style={styles.coins}>
                  <CoinIcon size={14} />
                  <Text style={styles.coinsText}>{t.coins}</Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

export function Trofei({ active: _active }: { active: boolean }) {
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<View_>('arene');
  const colW = Math.min(width, 560) - 40;
  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.head, { width: colW }]}>
        <SectionTitle title="Trofei" />
        <Choice<View_>
          label="Trofei"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'arene', label: 'Arene' },
            { value: 'medaglie', label: 'Medaglie' },
          ]}
        />
      </View>
      {tab === 'arene' ? <Road width={colW} /> : <Medaglie width={colW} />}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { alignSelf: 'center', paddingTop: space.s, paddingBottom: space.m },
  road: { alignSelf: 'center', paddingHorizontal: 20, paddingTop: space.s, paddingBottom: space.xxxl },
  rules: { marginBottom: space.l },
  stop: { borderRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.panelLine },
  stopCurrent: { borderWidth: 2, borderColor: colors.sun, boxShadow: '0px 0px 26px rgba(255,224,102,0.35)' },
  stopHead: { position: 'absolute', left: space.l, top: space.m, right: 70 },
  chip: { alignSelf: 'flex-start', height: 22, paddingHorizontal: 9, borderRadius: 11, backgroundColor: 'rgba(20,4,40,0.6)', justifyContent: 'center' },
  chipText: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 14, color: colors.sun, letterSpacing: 0.4, textTransform: 'uppercase' },
  stopName: {
    fontFamily: fonts.display,
    fontSize: 22,
    lineHeight: 27,
    color: colors.text,
    letterSpacing: -0.5,
    marginTop: 4,
    textShadowColor: 'rgba(20,4,40,0.7)',
    textShadowRadius: 8,
  },
  stopDesc: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, color: colors.text, textShadowColor: 'rgba(20,4,40,0.8)', textShadowRadius: 6 },
  lock: {
    position: 'absolute',
    right: space.m,
    top: space.m,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 15,
    backgroundColor: 'rgba(20,4,40,0.6)',
  },
  lockText: { fontFamily: fonts.display, fontSize: 13, lineHeight: 16, color: colors.text },
  stopFoot: { padding: space.m, gap: space.m },
  progress: { alignItems: 'center', gap: space.s },
  progressText: { fontFamily: fonts.semi, fontSize: 13, lineHeight: 17, color: colors.textSoft },
  rewards: { flexDirection: 'row', alignItems: 'flex-end', gap: space.l },
  reward: { alignItems: 'center', gap: 4 },
  rewardText: { fontFamily: fonts.semi, fontSize: 11, lineHeight: 14, color: colors.textSoft, maxWidth: 96 },
  coinBox: { minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  link: { alignItems: 'center', height: 44, justifyContent: 'center' },
  linkLine: { width: 2, flex: 1, backgroundColor: 'rgba(255,255,255,0.22)' },
  linkBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, height: 20, borderRadius: 10, backgroundColor: 'rgba(20,4,40,0.55)' },
  linkText: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 14, color: colors.text },
  legend: { alignItems: 'center', gap: space.xs, marginTop: space.xl, padding: space.l, borderRadius: radius.xl, borderWidth: 1, borderColor: 'rgba(255,224,102,0.45)', borderStyle: 'dashed' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  card: { padding: space.m, paddingTop: space.l, borderRadius: radius.l, backgroundColor: colors.panel, borderWidth: 1.5, borderColor: colors.panelLine, alignItems: 'center' },
  name: { fontFamily: fonts.bold, fontSize: 14.5, lineHeight: 18, color: colors.text, textAlign: 'center', marginTop: space.s },
  desc: { fontFamily: fonts.medium, fontSize: 11.5, lineHeight: 15, color: colors.textSoft, textAlign: 'center', marginTop: 3, minHeight: 30 },
  foot: { flexDirection: 'row', alignItems: 'center', gap: space.s, alignSelf: 'stretch', marginTop: space.m },
  track: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.18)', overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3, backgroundColor: colors.sun },
  count: { fontFamily: fonts.semi, fontSize: 10.5, lineHeight: 13, color: colors.textFaint, marginTop: 3 },
  done: { flex: 1, fontFamily: fonts.bold, fontSize: 12, lineHeight: 15, color: colors.mint },
  coins: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  coinsText: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 15, color: colors.text },
});
