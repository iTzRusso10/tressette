// Trofei: la strada delle 30 arene (con la Leggenda dopo l'ultima), gli achievement e i titoli.
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, useWindowDimensions, View } from 'react-native';
import { ACHIEVEMENT_CATEGORIES, ACHIEVEMENTS, type Achievement, type AchievementCategory } from '@/meta/achievements';
import { ARENAS, arenaProgress, blockedArena, CHAPTERS, LAST_ARENA, type Arena } from '@/meta/arenas';
import { BALANCE } from '@/meta/balance';
import { itemByKey } from '@/meta/catalog';
import { roman } from '@/meta/levels';
import { chooseTitle, progressOf, useProfile } from '@/meta/profile';
import { legendOf, reqProgress, reqText } from '@/meta/reqs';
import { LEGEND_GIFTS } from '@/meta/rewards';
import { TITLES, type Title } from '@/meta/titles';
import { ArenaScene } from '@/ui/ArenaScene';
import { ItemPreview } from '@/ui/cosmetics';
import { Icon, TrophyIcon } from '@/ui/icons';
import { Choice, Squish } from '@/ui/kit';
import { CoinIcon, Medal, TIER_NAMES } from '@/ui/meta';
import { Bar, CATEGORY_GLYPH, RewardRow } from '@/ui/progression';
import { Text } from '@/ui/Text';
import { colors, fonts, radius, space } from '@/ui/theme';
import { FilterChips, SectionTitle } from './parts';

type Tab = 'arene' | 'achievement' | 'titoli';

const n = (x: number) => x.toLocaleString('it-IT');
const arenaName = (k: number) => ARENAS[k - 1]?.name ?? '';

/* ================================================================== strada delle arene */

// Altezze fisse: la lista sa dove sta ogni arena e si apre su quella in cui sei, senza salti.
const CHAPTER_H = 72;
const ARENA_H = 252;
const CURRENT_H = 312;
const LEGEND_H = 268;

type Row = { k: 'chapter'; n: number } | { k: 'arena'; arena: Arena } | { k: 'legend' };

const ROWS: Row[] = [...CHAPTERS.flatMap(c => [{ k: 'chapter', n: c.n } as Row, ...ARENAS.filter(a => a.chapter.n === c.n).map(arena => ({ k: 'arena', arena }) as Row)]), { k: 'legend' }];

function rowHeight(r: Row, current: number) {
  if (r.k === 'chapter') return CHAPTER_H;
  if (r.k === 'legend') return LEGEND_H;
  return r.arena.index === current ? CURRENT_H : ARENA_H;
}

function ArenaStop({ arena, width }: { arena: Arena; width: number }) {
  const p = useProfile();
  const current = p.meta.arena === arena.index;
  const reached = p.meta.arena >= arena.index;
  const req = arena.requires ? reqProgress(arena.requires, p) : null;
  const sceneH = current ? 150 : 118;
  const { have, need } = arenaProgress(p.cups, arena.index);
  const next = ARENAS[arena.index + 1];
  const blocked = blockedArena(p);
  return (
    <View style={[styles.stop, { width, height: (current ? CURRENT_H : ARENA_H) - space.m }, current && styles.stopCurrent]}>
      <View style={{ height: sceneH }}>
        <ArenaScene id={arena.id} width={width} height={sceneH} dim={!reached} />
        <LinearGradient colors={['rgba(20,4,40,0.74)', 'rgba(20,4,40,0)']} start={{ x: 0, y: 0 }} end={{ x: 0.8, y: 0.95 }} style={StyleSheet.absoluteFill} />
        <View style={styles.stopHead}>
          <View style={[styles.chip, current && { backgroundColor: colors.sun }]}>
            <Text style={[styles.chipText, current && { color: colors.ink }]}>{current ? 'Sei qui' : `Arena ${arena.n}`}</Text>
          </View>
          <Text style={styles.stopName} numberOfLines={1}>
            {arena.name}
          </Text>
          <Text style={styles.stopDesc} numberOfLines={2}>
            {arena.desc}
          </Text>
        </View>
        <View style={[styles.corner, reached && !current && { backgroundColor: 'rgba(124,242,210,0.25)' }]}>
          {reached ? (
            current ? (
              <TrophyIcon size={16} />
            ) : (
              <Icon name="check" size={16} color={colors.mint} stroke={2.6} />
            )
          ) : (
            <>
              <Icon name="lock" size={15} color={colors.text} />
              <TrophyIcon size={15} />
            </>
          )}
          {!reached || current ? <Text style={styles.cornerText}>{n(current ? p.cups : arena.threshold)}</Text> : null}
        </View>
      </View>
      <View style={styles.stopFoot}>
        {current ? (
          <View style={{ gap: 6 }}>
            <Bar have={have} need={need} />
            <Text style={styles.footText} numberOfLines={1}>
              {blocked
                ? `Hai i trofei per ${blocked.name}: manca un requisito`
                : next
                  ? `${n(Math.max(0, need - have))} trofei per ${next.name}`
                  : `${n(Math.max(0, need - have))} trofei al prossimo grado di Leggenda`}
            </Text>
          </View>
        ) : null}
        {arena.requires && req ? (
          <View style={styles.reqRow}>
            <Icon name={req[0] >= req[1] ? 'check' : 'lock'} size={14} color={req[0] >= req[1] ? colors.mint : colors.sun} stroke={2.4} />
            <Text style={styles.reqText} numberOfLines={1}>
              {reqText(arena.requires, arenaName)} {req[0] < req[1] ? `(${n(req[0])}/${n(req[1])})` : ''}
            </Text>
          </View>
        ) : null}
        {arena.index === 0 ? (
          <Text v="small">Si comincia da qui, con la sponda di vetro e il panno smeraldo.</Text>
        ) : (
          <RewardRow reward={arena.reward} extraCoins={arena.chapterEnd ? BALANCE.coins.chapter : 0} size={50} />
        )}
      </View>
    </View>
  );
}

function ChapterHead({ num }: { num: number }) {
  const c = CHAPTERS[num - 1];
  const arena = useProfile(s => s.meta.arena);
  const last = ARENAS.filter(a => a.chapter.n === num).at(-1)!;
  const done = arena >= last.index;
  return (
    <View style={styles.chapter}>
      <Text style={styles.chapterKicker}>Capitolo {roman(num)}</Text>
      <View style={styles.chapterRow}>
        <Text style={styles.chapterName}>{c.name}</Text>
        <View style={[styles.chapterPrize, done && { borderColor: 'rgba(124,242,210,0.5)' }]}>
          {done ? <Icon name="check" size={13} color={colors.mint} stroke={2.6} /> : <CoinIcon size={14} />}
          <Text style={styles.chapterPrizeText}>{done ? 'Completato' : `+${BALANCE.coins.chapter} a fine capitolo`}</Text>
        </View>
      </View>
    </View>
  );
}

function LegendCard({ width }: { width: number }) {
  const best = useProfile(s => s.bestCups);
  const cups = useProfile(s => s.cups);
  const arena = useProfile(s => s.meta.arena);
  const grade = legendOf(best);
  const there = arena === LAST_ARENA;
  const { have, need } = arenaProgress(cups, LAST_ARENA);
  const gifts = Object.entries(LEGEND_GIFTS).map(([g, k]) => ({ g: Number(g), item: itemByKey(k)! }));
  return (
    <View style={[styles.legend, { width, height: LEGEND_H - space.m }]}>
      <Icon name="crown" size={26} color={colors.sun} />
      <Text v="title" style={{ textAlign: 'center' }}>
        {there && grade > 0 ? `Leggenda ${roman(grade)}` : 'Oltre la Leggenda Vivente'}
      </Text>
      <Text v="small" style={{ textAlign: 'center' }}>
        Dopo l’ultima arena i trofei non si fermano: ogni {BALANCE.trophies.legendStep} trofei sali di un grado di Leggenda ({n(BALANCE.legendCoins)} monete), senza fine.
      </Text>
      {there ? (
        <View style={{ alignSelf: 'stretch', gap: 4, marginTop: 4 }}>
          <Bar have={have} need={need} />
          <Text style={[styles.footText, { textAlign: 'center' }]}>
            {n(need - have)} trofei a Leggenda {roman(grade + 1)} · record {n(best)}
          </Text>
        </View>
      ) : null}
      <View style={styles.legendGifts}>
        {gifts.map(({ g, item }) => (
          <View key={g} style={styles.legendGift}>
            <ItemPreview item={item} width={56} height={40} />
            <Text style={styles.legendGiftText} numberOfLines={1}>
              Grado {roman(g)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Road({ width }: { width: number }) {
  const current = useProfile(s => s.meta.arena);
  const offsets = useMemo(() => {
    const o: number[] = [];
    let y = 0;
    for (const r of ROWS) {
      o.push(y);
      y += rowHeight(r, current);
    }
    return o;
  }, [current]);
  const currentRow = ROWS.findIndex(r => r.k === 'arena' && r.arena.index === current);
  return (
    <FlatList
      data={ROWS}
      keyExtractor={(r, i) => (r.k === 'arena' ? r.arena.id : `${r.k}${i}`)}
      contentContainerStyle={[styles.list, { width: width + 40 }]}
      showsVerticalScrollIndicator={false}
      initialNumToRender={6}
      windowSize={5}
      initialScrollIndex={Math.max(0, currentRow - 1)}
      getItemLayout={(_, i) => ({ length: rowHeight(ROWS[i], current), offset: offsets[i], index: i })}
      ListHeaderComponent={
        <Text v="body" style={styles.intro}>
          Una nuova arena ogni {BALANCE.trophies.arenaStep} trofei. I trofei non si azzerano mai e un’arena raggiunta resta tua: non si scende sotto il suo primo trofeo.
        </Text>
      }
      renderItem={({ item: r }) =>
        r.k === 'chapter' ? <ChapterHead num={r.n} /> : r.k === 'legend' ? <LegendCard width={width} /> : <ArenaStop arena={r.arena} width={width} />
      }
    />
  );
}

/* ================================================================== achievement */

const ACH_H = 92;

function AchievementRow({ a, width }: { a: Achievement; width: number }) {
  const p = useProfile();
  const done = !!p.achievements[a.id];
  const [have, need] = reqProgress(a.req, p);
  const item = a.items?.[0] ? itemByKey(a.items[0]) : undefined;
  return (
    <View style={[styles.ach, { width, height: ACH_H - space.s }, done && { borderColor: 'rgba(255,224,102,0.45)' }]}>
      <Medal glyph={CATEGORY_GLYPH[a.category]} tier={a.tier} size={52} locked={!done} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.achName} numberOfLines={1}>
          {a.name}
        </Text>
        <Text style={styles.achDesc} numberOfLines={2}>
          {reqText(a.req, arenaName)}
        </Text>
        {done ? (
          <Text style={styles.achDone}>Completato · {TIER_NAMES[a.tier]}</Text>
        ) : (
          <View style={styles.achBar}>
            <Bar have={have} need={need} height={6} style={{ flex: 1 }} />
            <Text style={styles.achCount}>
              {n(have)}/{n(need)}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.achPrize}>
        {item ? <ItemPreview item={item} width={40} height={28} /> : null}
        <View style={styles.coins}>
          <CoinIcon size={13} />
          <Text style={styles.coinsText}>{a.coins}</Text>
        </View>
      </View>
    </View>
  );
}

type Cat = AchievementCategory | 'tutti';

function Achievements({ width }: { width: number }) {
  const p = useProfile();
  const [cat, setCat] = useState<Cat>('tutti');
  const count = Object.keys(p.achievements).length;
  const list = useMemo(() => {
    const view = progressOf(p);
    const pick = ACHIEVEMENTS.filter(a => cat === 'tutti' || a.category === cat);
    // Prima quelli quasi fatti, poi gli altri, in fondo i completati.
    const score = (a: Achievement) => {
      if (p.achievements[a.id]) return 2;
      const [h, nn] = reqProgress(a.req, view);
      return 1 - h / nn;
    };
    return cat === 'tutti' ? pick.slice().sort((x, y) => score(x) - score(y)) : pick.slice().sort((x, y) => (p.achievements[x.id] ? 1 : 0) - (p.achievements[y.id] ? 1 : 0));
  }, [p, cat]);
  const byTier = (['bronzo', 'argento', 'oro', 'platino'] as const).map(t => [t, ACHIEVEMENTS.filter(a => a.tier === t && p.achievements[a.id]).length, ACHIEVEMENTS.filter(a => a.tier === t).length] as const);
  return (
    <FlatList
      data={list}
      keyExtractor={a => a.id}
      contentContainerStyle={[styles.list, { width: width + 40 }]}
      showsVerticalScrollIndicator={false}
      initialNumToRender={10}
      getItemLayout={(_, i) => ({ length: ACH_H, offset: ACH_H * i, index: i })}
      ListHeaderComponent={
        <View style={{ gap: space.m, marginBottom: space.m }}>
          <View style={styles.achSummary}>
            <Text style={styles.achBig}>
              {count}
              <Text style={styles.achOf}> / {ACHIEVEMENTS.length}</Text>
            </Text>
            <View style={styles.tiers}>
              {byTier.map(([t, h, tot]) => (
                <View key={t} style={styles.tier}>
                  <Medal glyph="star" tier={t} size={26} />
                  <Text style={styles.tierText}>
                    {h}/{tot}
                  </Text>
                </View>
              ))}
            </View>
          </View>
          <FilterChips<Cat>
            label="Categoria"
            value={cat}
            onChange={setCat}
            options={[{ value: 'tutti', label: 'Tutti' }, ...ACHIEVEMENT_CATEGORIES.map(c => ({ value: c.id, label: c.name }))]}
          />
        </View>
      }
      renderItem={({ item }) => <AchievementRow a={item} width={width} />}
    />
  );
}

/* ================================================================== titoli */

const TITLE_H = 76;

function TitleRow({ t, width }: { t: Title; width: number }) {
  const p = useProfile();
  const [have, need] = reqProgress(t.req, p);
  const owned = have >= need;
  const inUse = p.meta.title === t.id;
  return (
    <Squish
      accessibilityRole="button"
      accessibilityLabel={owned ? (inUse ? `${t.name}, in uso` : `Usa il titolo ${t.name}`) : `${t.name}, bloccato: ${reqText(t.req, arenaName)}`}
      accessibilityState={{ disabled: !owned, selected: inUse }}
      disabled={!owned || inUse}
      onPress={() => chooseTitle(t.id)}
      scaleTo={0.98}
      style={[styles.title, { width, height: TITLE_H - space.s }, inUse && styles.titleOn]}
    >
      <View style={[styles.titleIcon, owned && { backgroundColor: 'rgba(255,224,102,0.18)' }]}>
        <Icon name={owned ? 'crown' : 'lock'} size={20} color={owned ? colors.sun : colors.textFaint} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={[styles.titleName, !owned && { color: colors.textSoft }]} numberOfLines={1}>
          {t.name}
        </Text>
        {owned ? (
          <Text style={styles.titleReq} numberOfLines={1}>
            {reqText(t.req, arenaName)}
          </Text>
        ) : t.req.k === 'event' ? (
          <Text style={styles.titleReq} numberOfLines={2}>
            {reqText(t.req)}
          </Text>
        ) : (
          <View style={styles.achBar}>
            <Text style={[styles.titleReq, { flex: 1 }]} numberOfLines={1}>
              {reqText(t.req, arenaName)}
            </Text>
            <Text style={styles.achCount}>
              {n(have)}/{n(need)}
            </Text>
          </View>
        )}
      </View>
      {owned ? <Text style={[styles.titleUse, inUse && { color: colors.ink, backgroundColor: colors.sun }]}>{inUse ? 'In uso' : 'Usa'}</Text> : null}
    </Squish>
  );
}

function Titles({ width }: { width: number }) {
  const p = useProfile();
  const list = useMemo(() => {
    const view = progressOf(p);
    return TITLES.slice().sort((a, b) => {
      const [ha, na] = reqProgress(a.req, view);
      const [hb, nb] = reqProgress(b.req, view);
      const oa = ha >= na ? 0 : 1;
      const ob = hb >= nb ? 0 : 1;
      return oa - ob || hb / nb - ha / na;
    });
  }, [p]);
  const owned = list.filter(t => {
    const [h, nn] = reqProgress(t.req, p);
    return h >= nn;
  }).length;
  return (
    <FlatList
      data={list}
      keyExtractor={t => t.id}
      contentContainerStyle={[styles.list, { width: width + 40 }]}
      showsVerticalScrollIndicator={false}
      initialNumToRender={10}
      getItemLayout={(_, i) => ({ length: TITLE_H, offset: TITLE_H * i, index: i })}
      ListHeaderComponent={
        <Text v="body" style={styles.intro}>
          Ne hai {owned} su {TITLES.length}. Il titolo che scegli compare sotto il tuo nome nel profilo, nelle classifiche e al tavolo con gli amici.
        </Text>
      }
      renderItem={({ item }) => <TitleRow t={item} width={width} />}
    />
  );
}

/* ================================================================== sezione */

export function Trofei({ active: _active }: { active: boolean }) {
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<Tab>('arene');
  const colW = Math.min(width, 560) - 40;
  const cups = useProfile(s => s.cups);
  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.head, { width: colW }]}>
        <SectionTitle
          title="Trofei"
          right={
            <View style={styles.cupPill} accessibilityLabel={`${cups} trofei`}>
              <TrophyIcon size={20} />
              <Text style={styles.cupText}>{n(cups)}</Text>
            </View>
          }
        />
        <Choice<Tab>
          label="Trofei"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'arene', label: 'Arene' },
            { value: 'achievement', label: 'Achievement' },
            { value: 'titoli', label: 'Titoli' },
          ]}
        />
      </View>
      {tab === 'arene' ? <Road width={colW} /> : tab === 'achievement' ? <Achievements width={colW} /> : <Titles width={colW} />}
    </View>
  );
}


const styles = StyleSheet.create({
  head: { alignSelf: 'center', paddingTop: space.s, paddingBottom: space.m },
  list: { alignSelf: 'center', paddingHorizontal: 20, paddingTop: space.s, paddingBottom: space.xxxl },
  intro: { marginBottom: space.m },
  cupPill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.shade, borderWidth: 1, borderColor: colors.glassLine },
  cupText: { fontFamily: fonts.display, fontSize: 16, lineHeight: 20, color: colors.text, fontVariant: ['tabular-nums'] },
  // arene
  stop: { marginBottom: space.m, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.panelLine },
  stopCurrent: { borderWidth: 2, borderColor: colors.sun, boxShadow: '0px 0px 26px rgba(255,224,102,0.35)' },
  stopHead: { position: 'absolute', left: space.l, top: space.m, right: 92 },
  chip: { alignSelf: 'flex-start', height: 22, paddingHorizontal: 9, borderRadius: 11, backgroundColor: 'rgba(20,4,40,0.6)', justifyContent: 'center' },
  chipText: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 14, color: colors.sun, letterSpacing: 0.4, textTransform: 'uppercase' },
  stopName: { fontFamily: fonts.display, fontSize: 21, lineHeight: 26, color: colors.text, letterSpacing: -0.5, marginTop: 4 },
  stopDesc: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, color: colors.text },
  corner: {
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
  cornerText: { fontFamily: fonts.display, fontSize: 13, lineHeight: 16, color: colors.text, fontVariant: ['tabular-nums'] },
  stopFoot: { flex: 1, paddingHorizontal: space.m, paddingTop: space.m, gap: space.s },
  footText: { fontFamily: fonts.semi, fontSize: 12.5, lineHeight: 16, color: colors.textSoft },
  reqRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reqText: { flex: 1, fontFamily: fonts.semi, fontSize: 12, lineHeight: 16, color: colors.sun },
  chapter: { height: CHAPTER_H, justifyContent: 'center' },
  chapterKicker: { fontFamily: fonts.bold, fontSize: 11.5, lineHeight: 14, color: colors.sun, letterSpacing: 0.6, textTransform: 'uppercase' },
  chapterRow: { flexDirection: 'row', alignItems: 'center', gap: space.s, marginTop: 2 },
  chapterName: { flex: 1, fontFamily: fonts.display, fontSize: 22, lineHeight: 27, color: colors.text, letterSpacing: -0.5 },
  chapterPrize: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 26, paddingHorizontal: 10, borderRadius: 13, borderWidth: 1, borderColor: 'rgba(255,224,102,0.45)' },
  chapterPrizeText: { fontFamily: fonts.semi, fontSize: 11.5, lineHeight: 14, color: colors.text },
  legend: {
    alignItems: 'center',
    gap: space.xs,
    padding: space.l,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,224,102,0.45)',
    backgroundColor: colors.panel,
  },
  legendGifts: { flexDirection: 'row', gap: space.l, marginTop: space.s },
  legendGift: { alignItems: 'center', gap: 3 },
  legendGiftText: { fontFamily: fonts.semi, fontSize: 10.5, lineHeight: 13, color: colors.textSoft },
  // achievement
  achSummary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: space.m, borderRadius: radius.l, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.panelLine },
  achBig: { fontFamily: fonts.display, fontSize: 28, lineHeight: 32, color: colors.text, fontVariant: ['tabular-nums'] },
  achOf: { fontFamily: fonts.semi, fontSize: 15, color: colors.textSoft },
  tiers: { flexDirection: 'row', gap: space.m },
  tier: { alignItems: 'center', gap: 2 },
  tierText: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 14, color: colors.textSoft, fontVariant: ['tabular-nums'] },
  ach: {
    marginBottom: space.s,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
    paddingHorizontal: space.m,
    borderRadius: radius.l,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.panelLine,
  },
  achName: { fontFamily: fonts.bold, fontSize: 14.5, lineHeight: 18, color: colors.text },
  achDesc: { fontFamily: fonts.medium, fontSize: 11.5, lineHeight: 15, color: colors.textSoft },
  achDone: { fontFamily: fonts.bold, fontSize: 11.5, lineHeight: 15, color: colors.mint },
  achBar: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  achCount: { fontFamily: fonts.semi, fontSize: 10.5, lineHeight: 13, color: colors.textFaint, fontVariant: ['tabular-nums'] },
  achPrize: { alignItems: 'center', gap: 4, width: 44 },
  coins: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  coinsText: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 15, color: colors.text, fontVariant: ['tabular-nums'] },
  // titoli
  title: {
    marginBottom: space.s,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
    paddingHorizontal: space.m,
    borderRadius: radius.l,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.panelLine,
  },
  titleOn: { borderColor: colors.sun, borderWidth: 2 },
  titleIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
  titleName: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 19, color: colors.text },
  titleReq: { fontFamily: fonts.medium, fontSize: 11.5, lineHeight: 15, color: colors.textFaint },
  titleUse: {
    fontFamily: fonts.bold,
    fontSize: 12,
    lineHeight: 15,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
});
