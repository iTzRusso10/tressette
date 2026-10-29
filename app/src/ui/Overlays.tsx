import { usePathname } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInUp, SlideOutUp } from 'react-native-reanimated';
import { dur, ease } from './motion';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Confetti } from '@/game/Confetti';
import { useAdSim } from '@/meta/ads';
import { achievementById } from '@/meta/achievements';
import { ARENAS } from '@/meta/arenas';
import { itemByKey } from '@/meta/catalog';
import { roman } from '@/meta/levels';
import { dismissCelebration, useProfile, type Celebration } from '@/meta/profile';
import { templateById } from '@/meta/events';
import { LEAGUES } from '@/meta/rating';
import { seasonById } from '@/meta/seasons';
import { SETS } from '@/meta/sets';
import { ItemPreview } from './cosmetics';
import { Icon } from './icons';
import { CATEGORY_GLYPH } from './progression';
import { GAME_LABEL, LeagueCoin } from './competition';
import { sfx } from './feedback';
import { ArenaReveal } from './ArenaReveal';
import { InviteBanner } from './InviteBanner';
import { CoinIcon, Emblem, Medal, TIER_NAMES } from './meta';
import { Text } from './Text';
import { colors, fonts, radius } from './theme';

type BannerC = Exclude<Celebration, { k: 'arena' }>;

function bannerSound(c: BannerC) {
  return c.k === 'coins' ? 'coin' : c.k === 'achievement' ? 'trophy' : 'win';
}

/** Una festa alla volta, che scende dall'alto: achievement, livello, missione, oggetto, set… (una nuova arena prende tutto lo schermo). */
function Banner({ c }: { c: BannerC }) {
  const ins = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const w = Math.min(width - 24, 420);
  useEffect(() => {
    sfx(bannerSound(c) as never, { haptic: true });
    const t = setTimeout(() => dismissCelebration(c.cid), c.k === 'achievement' || c.k === 'set' || c.k === 'league' ? 3200 : 2400);
    return () => clearTimeout(t);
  }, [c]);
  let art: ReactNode = null;
  let kicker = '';
  let title = '';
  let coins = 0;
  let secret = false;
  switch (c.k) {
    case 'achievement': {
      const a = achievementById(c.id)!;
      art = <Medal glyph={CATEGORY_GLYPH[a.category]} tier={a.tier} size={54} />;
      // Un segreto scoperto ha la sua festa: lo dice, e il bordo è del colore dei segreti.
      kicker = a.hint ? 'Segreto scoperto!' : `Achievement · ${TIER_NAMES[a.tier]}`;
      title = a.name;
      coins = a.coins;
      if (a.hint) secret = true;
      break;
    }
    case 'league': {
      const l = LEAGUES.find(x => x.id === c.league) ?? LEAGUES[0];
      art = <LeagueCoin league={l} size={54} />;
      kicker = `Nuova lega a ${GAME_LABEL[c.game]}`;
      title = l.name;
      break;
    }
    case 'eventTier': {
      const t = templateById(c.event);
      art = (
        <View style={[styles.levelBig, t && { backgroundColor: t.colors[1] }]}>
          <Icon name="gift" size={26} color={colors.ink} stroke={2.4} />
        </View>
      );
      kicker = t ? t.name : 'Evento';
      title = t ? `${t.tiers[c.index]} ${t.unit}: premio da riscuotere` : 'Traguardo raggiunto';
      break;
    }
    case 'level':
    case 'prestige':
    case 'legend':
      art = (
        <View style={styles.levelBig}>
          <Text style={styles.levelBigText}>{c.k === 'level' ? c.level : roman(c.n)}</Text>
        </View>
      );
      kicker = c.k === 'level' ? 'Nuovo livello' : c.k === 'prestige' ? 'Nuovo grado di Prestigio' : 'Nuovo grado di Leggenda';
      title = c.k === 'level' ? `Sei al livello ${c.level}` : c.k === 'prestige' ? `Prestigio ${c.n}` : `Leggenda ${roman(c.n)}`;
      break;
    case 'item': {
      const i = itemByKey(c.key)!;
      art = <ItemPreview item={i} width={64} height={46} />;
      kicker = 'Nuovo oggetto';
      title = i.name;
      break;
    }
    case 'set': {
      const st = SETS.find(x => x.id === c.id)!;
      art = <Emblem glyph="gem" colors={st.badge.colors} size={50} />;
      kicker = 'Set completato';
      title = st.name;
      coins = st.coins;
      break;
    }
    case 'mission':
      art = (
        <View style={[styles.levelBig, { backgroundColor: colors.mint }]}>
          <Icon name="check" size={26} color={colors.ink} stroke={3} />
        </View>
      );
      kicker = 'Missione completata · premio da riscuotere';
      title = c.text;
      break;
    case 'seasonTier': {
      const season = seasonById(c.season);
      const tier = season?.tiers[c.index];
      art = (
        <View style={styles.levelBig}>
          <Icon name="podium" size={26} color={colors.ink} stroke={2.4} />
        </View>
      );
      kicker = season ? season.name : 'Stagione';
      title = tier ? `Traguardo dei ${tier.points} punti` : 'Traguardo di stagione';
      break;
    }
    case 'coins':
    case 'chapter':
      art = <CoinIcon size={40} />;
      kicker = c.k === 'coins' ? c.why : 'Capitolo completato';
      title = c.k === 'coins' ? `+${c.amount} monete` : '';
      break;
  }
  return (
    <Animated.View
      entering={SlideInUp.duration(dur.enter + 40).easing(ease.in)}
      exiting={SlideOutUp.duration(dur.exit).easing(ease.out)}
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={[styles.banner, { top: ins.top + 8, width: w, left: (width - w) / 2 }, secret && styles.secret]}
    >
      <Animated.View entering={FadeIn.delay(160).duration(dur.enter)}>{art}</Animated.View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.kicker, secret && { color: colors.sky }]} numberOfLines={1}>
          {kicker}
        </Text>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        {coins ? (
          <View style={styles.reward}>
            <CoinIcon size={16} />
            <Text style={styles.rewardText}>+{coins}</Text>
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

/** A simulated rewarded video, until AdMob is connected. */
function AdSim() {
  const { playing, left } = useAdSim();
  if (!playing) return null;
  return (
    <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(160)} style={[StyleSheet.absoluteFill, styles.ad]}>
      <Text style={styles.adTitle}>Video premio</Text>
      <Text style={styles.adSub}>Qui ci sarà la pubblicità. Il premio arriva tra {left}…</Text>
    </Animated.View>
  );
}

export function Overlays() {
  const c = useProfile(s => s.celebrations[0]);
  // A new arena waits until you leave the table: first the end of the match, then the new place.
  const atTable = usePathname() === '/tavolo';
  const { width } = useWindowDimensions();
  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { zIndex: 5000 }]}>
      {c && c.k !== 'arena' ? <Banner key={c.cid} c={c} /> : null}
      {c?.k === 'arena' && !atTable ? <ArenaReveal key={c.cid} arena={ARENAS[c.index]} onClose={() => dismissCelebration(c.cid)} /> : null}
      {c?.k === 'achievement' || c?.k === 'set' || c?.k === 'league' ? <Confetti key={'k' + c.cid} x={width / 2} y={110} count={30} spread={0.7} duration={1600} seed={c.cid} /> : null}
      {!c ? <InviteBanner /> : null}
      <AdSim />
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 12,
    paddingRight: 18,
    borderRadius: radius.l,
    backgroundColor: colors.shadeStrong,
    borderWidth: 1,
    borderColor: colors.glassLine,
    boxShadow: '0px 16px 36px rgba(30,6,56,0.5)',
  },
  secret: { borderColor: colors.sky, borderWidth: 1.5, boxShadow: '0px 0px 30px rgba(156,203,255,0.45)' },
  kicker: { fontFamily: fonts.semi, fontSize: 12, lineHeight: 15, color: colors.sun },
  title: { fontFamily: fonts.display, fontSize: 18, lineHeight: 23, color: colors.text },
  reward: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  rewardText: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 16, color: colors.text },
  levelBig: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.sun, alignItems: 'center', justifyContent: 'center' },
  levelBigText: { fontFamily: fonts.display, fontSize: 24, lineHeight: 28, color: colors.ink },
  ad: { backgroundColor: 'rgba(10,2,20,0.92)', alignItems: 'center', justifyContent: 'center', padding: 32 },
  adTitle: { fontFamily: fonts.display, fontSize: 26, lineHeight: 32, color: colors.text },
  adSub: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, color: colors.textSoft, textAlign: 'center', marginTop: 8 },
});
