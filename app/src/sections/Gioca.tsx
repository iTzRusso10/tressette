import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type Match } from '@/engine';
import { Sheet } from '@/game/Sheet';
import { canClaim } from '@/meta/economy';
import { ARENAS, arenaProgress, blockedArena, LAST_ARENA } from '@/meta/arenas';
import { BALANCE } from '@/meta/balance';
import { roman } from '@/meta/levels';
import { bonusAvailable, refreshDay, useProfile } from '@/meta/profile';
import { legendOf } from '@/meta/reqs';
import { loadSaved } from '@/state/table';
import { ArenaScene } from '@/ui/ArenaScene';
import { TablePreview } from '@/ui/cosmetics';
import { DailyBonus } from '@/ui/DailyBonus';
import { Icon, TrophyIcon } from '@/ui/icons';
import { Squish } from '@/ui/kit';
import { CoinIcon } from '@/ui/meta';
import { Text } from '@/ui/Text';
import { colors, fonts, gradients, radius, shadow, space } from '@/ui/theme';
import { GameTile, ORDER, ResumeCard } from './GameTiles';
import { useTabs } from './Hub';
import { Bar } from '@/ui/progression';
import { refreshSocial } from '@/state/social';
import { ClaimsCard, EventCard, FriendsCard } from './HomeCards';
import { Missions } from './Missions';
import { SectionScroll } from './parts';

/** The arena you are in: the place, your table, the trophies to the next one. */
function ArenaCard({ width, room }: { width: number; room: number }) {
  const { go } = useTabs();
  const p = useProfile();
  const cups = p.cups;
  const equipped = p.equipped;
  const arena = ARENAS[p.meta.arena];
  const { have, need } = arenaProgress(cups, arena.index);
  const legend = arena.index === LAST_ARENA;
  const blocked = blockedArena(p);
  const next = ARENAS[arena.index + 1];
  // The card takes the height the screen has to spare: a taller sky on tall phones, never cramped on small ones.
  const tw = Math.round(width * 0.66);
  const th = Math.round(tw * 0.56);
  const sceneH = Math.round(Math.max(width * 0.42, Math.min(width * 0.8, room - th * 0.72 - 92)));
  return (
    <Squish accessibilityRole="button" accessibilityLabel={`${arena.name}, arena ${arena.n}. Apri la strada delle arene`} onPress={() => go('trofei')} scaleTo={0.98}>
      <View style={[styles.arena, { width }]}>
        <View style={{ height: sceneH }}>
          <ArenaScene id={arena.id} width={width} height={sceneH} />
          <LinearGradient colors={['rgba(28,8,52,0.55)', 'rgba(28,8,52,0)']} style={[StyleSheet.absoluteFill, { bottom: sceneH * 0.55 }]} />
          <LinearGradient colors={['rgba(28,8,52,0)', 'rgba(28,8,52,0.75)']} style={[StyleSheet.absoluteFill, { top: sceneH * 0.45 }]} />
          <View style={styles.arenaHead}>
            <View style={styles.arenaChip}>
              <Text style={styles.arenaChipText}>Arena {arena.n} · Capitolo {roman(arena.chapter.n)}</Text>
            </View>
            <Text style={styles.arenaName} numberOfLines={1}>
              {arena.name}
            </Text>
          </View>
        </View>
        <View style={[styles.tableWrap, { marginTop: -th * 0.28 }]} pointerEvents="none">
          <TablePreview table={equipped.table} felt={equipped.felt} back={equipped.back} width={tw} height={th} cards />
        </View>
        <View style={styles.road}>
          <View style={styles.roadBar}>
            <TrophyIcon size={20} />
            <Bar have={have} need={need} height={10} style={{ flex: 1 }} />
            <Text style={styles.roadNum}>{cups.toLocaleString('it-IT')}</Text>
          </View>
          <Text style={styles.roadText} numberOfLines={1}>
            {blocked
              ? `${blocked.name}: ti manca un requisito`
              : legend
                ? `Leggenda ${legendOf(p.bestCups) ? roman(legendOf(p.bestCups)) : ''} · ${need - have} trofei al prossimo grado`.replace('  ', ' ')
                : `Ancora ${need - have} trofei per ${next!.name}`}
          </Text>
        </View>
      </View>
    </Squish>
  );
}

/** How many trophies each opponent is worth: shown when you choose the game. */
function TrophyKey() {
  const t = BALANCE.trophies;
  const rows: [string, string, string][] = [
    ['Facile', `+${t.win.facile}`, `${t.loss.facile}`],
    ['Medio', `+${t.win.medio}`, `−${t.loss.medio}`],
    ['Esperto', `+${t.win.difficile}`, `−${t.loss.difficile}`],
    ['Online', `+${t.win.online}`, `−${t.loss.online}`],
  ];
  return (
    <View style={styles.key}>
      {rows.map(([who, win, loss]) => (
        <View key={who} style={styles.keyCell}>
          <Text style={styles.keyWho}>{who}</Text>
          <View style={styles.keyRow}>
            <TrophyIcon size={14} />
            <Text style={styles.keyWin}>{win}</Text>
          </View>
          <Text style={styles.keyLoss}>{loss === '0' ? 'non perdi' : `${loss} se perdi`}</Text>
        </View>
      ))}
    </View>
  );
}

export function Chooser({ onClose }: { onClose: () => void }) {
  const { width } = useWindowDimensions();
  const w = Math.min(width, 560) - space.xl * 2;
  return (
    <Sheet title="Che si gioca?" sub="Vinci per guadagnare trofei: più è forte l’avversario, più ne vinci." onDismiss={onClose}>
      <View style={{ gap: space.m }}>
        {ORDER.map((g, i) => (
          <GameTile key={g} game={g} width={w} index={i} onPick={onClose} />
        ))}
      </View>
      <TrophyKey />
    </Sheet>
  );
}

/** The daily bonus opens by itself once per app launch, when it is there to collect. */
let bonusShown = false;
let socialAt = 0;

export function Gioca({ active }: { active: boolean }) {
  const { width, height } = useWindowDimensions();
  const ins = useSafeAreaInsets();
  const { sheet, go } = useTabs();
  const [saved, setSaved] = useState<Match | null>(null);
  const bonusState = useProfile(s => s.bonus);
  const canBonus = canClaim(bonusState, new Date());
  const colW = Math.min(width, 560) - 40;

  const choose = () => sheet(<Chooser onClose={() => sheet(null)} />);
  const openBonus = () => sheet(<DailyBonus onClose={() => sheet(null)} />);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      loadSaved().then(m => live && setSaved(m));
      return () => {
        live = false;
      };
    }, []),
  );
  // Un giorno nuovo porta missioni nuove (e, a fine stagione, la stagione dopo).
  useEffect(() => {
    if (!active) return;
    refreshDay();
    // Chi è online tra gli amici, al massimo una volta al minuto.
    if (Date.now() - socialAt > 60000) {
      socialAt = Date.now();
      void refreshSocial();
    }
  }, [active]);
  useEffect(() => {
    if (!active) return;
    // Wait for the saved profile to load before deciding.
    const t = setTimeout(() => {
      if (!bonusShown && bonusAvailable()) {
        bonusShown = true;
        openBonus();
      }
    }, 700);
    return () => clearTimeout(t);
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps


  return (
    <>
      <SectionScroll>
        <ArenaCard width={colW} room={height - ins.top - ins.bottom - 60 - 76 - 8 - 92 - 66 - 48 - (saved ? 96 : 0)} />
        {saved ? <ResumeCard m={saved} /> : null}
        <Squish accessibilityRole="button" accessibilityLabel="Gioca: scegli tra Tressette, Briscola e Scopa" onPress={choose} scaleTo={0.97}>
          <View style={styles.play}>
            <LinearGradient colors={gradients.sun.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: radius.pill }]} />
            <View style={styles.playShine} />
            <Text style={styles.playLabel}>Gioca</Text>
            <Text style={styles.playSub}>Tressette, Briscola o Scopa</Text>
          </View>
        </Squish>
        <View style={styles.row}>
          <Squish accessibilityRole="button" accessibilityLabel="Gioca con gli amici" onPress={() => go('amici')} outerStyle={{ flex: 1 }} style={styles.small}>
            <Icon name="friends" size={22} color={colors.mint} />
            <Text style={styles.smallText}>Con gli amici</Text>
          </Squish>
          {canBonus ? (
            <Squish accessibilityRole="button" accessibilityLabel="Bonus del giorno" onPress={openBonus} outerStyle={{ flex: 1 }} style={[styles.small, styles.smallGold]}>
              <CoinIcon size={22} />
              <Text style={styles.smallText}>Bonus del giorno</Text>
            </Squish>
          ) : (
            <Squish
              accessibilityRole="button"
              accessibilityLabel="Come si gioca"
              onPress={() => router.push({ pathname: '/regole/[game]', params: { game: 'tressette' } })}
              outerStyle={{ flex: 1 }}
              style={styles.small}
            >
              <Icon name="sparkle" size={22} color={colors.sky} />
              <Text style={styles.smallText}>Come si gioca</Text>
            </Squish>
          )}
        </View>
        <ClaimsCard width={colW} />
        <FriendsCard width={colW} onOpen={() => go('amici')} />
        <EventCard width={colW} onPlay={choose} />
        <Missions width={colW} />
      </SectionScroll>
    </>
  );
}

const styles = StyleSheet.create({
  arena: {
    alignSelf: 'center',
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: 'rgba(28,8,52,0.75)',
    borderWidth: 1,
    borderColor: colors.glassLine,
    boxShadow: shadow.panel,
  },
  arenaHead: { position: 'absolute', left: space.l, top: space.l, right: space.l, alignItems: 'flex-start' },
  arenaChip: { height: 24, paddingHorizontal: 10, borderRadius: 12, backgroundColor: 'rgba(20,4,40,0.6)', justifyContent: 'center' },
  arenaChipText: { fontFamily: fonts.bold, fontSize: 11.5, lineHeight: 14, color: colors.sun, letterSpacing: 0.4, textTransform: 'uppercase' },
  arenaName: {
    fontFamily: fonts.display,
    fontSize: 28,
    lineHeight: 33,
    color: colors.text,
    letterSpacing: -0.8,
    marginTop: 6,
  },
  tableWrap: { alignItems: 'center' },
  road: { paddingHorizontal: space.l, paddingTop: space.m, paddingBottom: space.l, gap: space.s },
  roadBar: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  roadNum: { fontFamily: fonts.display, fontSize: 15, lineHeight: 19, color: colors.text, fontVariant: ['tabular-nums'], minWidth: 44, textAlign: 'right' },
  roadText: { fontFamily: fonts.semi, fontSize: 13.5, lineHeight: 18, color: colors.textSoft, textAlign: 'center' },
  play: {
    height: 76,
    borderRadius: radius.pill,
    marginTop: space.l,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    boxShadow: '0px 14px 30px rgba(255,194,61,0.45)',
  },
  playShine: { position: 'absolute', left: 0, right: 0, top: 0, height: 34, backgroundColor: 'rgba(255,255,255,0.28)' },
  playLabel: { fontFamily: fonts.display, fontSize: 28, lineHeight: 32, color: colors.ink, letterSpacing: -0.6 },
  playSub: { fontFamily: fonts.semi, fontSize: 12.5, lineHeight: 16, color: colors.ink, opacity: 0.7 },
  row: { flexDirection: 'row', gap: space.m, marginTop: space.m },
  small: {
    height: 54,
    borderRadius: radius.l,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.s,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.panelLine,
  },
  smallGold: { borderColor: 'rgba(255,224,102,0.6)' },
  smallText: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 18, color: colors.text },
  key: { flexDirection: 'row', gap: space.s, marginTop: space.l },
  keyCell: { flex: 1, alignItems: 'center', paddingVertical: space.s, borderRadius: radius.m, backgroundColor: 'rgba(255,255,255,0.08)' },
  keyWho: { fontFamily: fonts.semi, fontSize: 11.5, lineHeight: 14, color: colors.textSoft },
  keyRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  keyWin: { fontFamily: fonts.display, fontSize: 16, lineHeight: 20, color: colors.text },
  keyLoss: { fontFamily: fonts.medium, fontSize: 10, lineHeight: 13, color: colors.textFaint, marginTop: 1 },
});
