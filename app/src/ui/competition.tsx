// Pezzi condivisi dal tuo profilo e da quello degli altri giocatori: moneta della lega, statistiche per
// gioco con il punteggio di bravura, vetrina, leghe passate. Tutto parte dal profilo pubblico
// (ledger.ts, `publicOf`), così quello che vedi di te è esattamente quello che vedono gli altri.
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import type { GameId } from '@/engine';
import { achievementById } from '@/meta/achievements';
import { itemByKey } from '@/meta/catalog';
import type { PublicProfile } from '@/meta/ledger';
import { LEAGUES, leagueOf, leagueProgress, RATING, type League } from '@/meta/rating';
import { RARITY_NAMES } from '@/meta/rarity';
import { seasonById } from '@/meta/seasons';
import { ItemPreview } from './cosmetics';
import { Icon } from './icons';
import { Squish } from './kit';
import { Medal } from './meta';
import { Bar, CATEGORY_GLYPH, rarityColor } from './progression';
import { Text } from './Text';
import { colors, fonts, gradients, radius, space } from './theme';

export const GAME_LABEL: Record<GameId, string> = { tressette: 'Tressette', briscola: 'Briscola', scopa: 'Scopa' };
export const GAMES: GameId[] = ['tressette', 'briscola', 'scopa'];
const n = (x: number) => x.toLocaleString('it-IT');

/* ------------------------------------------------------------------ moneta della lega */

/** La moneta del Regno di Napoli che dà il nome alla lega: metallo, bordo zigrinato, iniziale. */
export function LeagueCoin({ league, size = 36, dim }: { league: League; size?: number; dim?: boolean }) {
  const [dark, metal, light] = league.colors;
  const id = `lc${league.id}${dim ? 'd' : ''}`;
  const r = size / 2;
  return (
    <View style={{ width: size, height: size, opacity: dim ? 0.45 : 1 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id={id} cx="35%" cy="30%" r="75%">
            <Stop offset="0" stopColor={light} />
            <Stop offset="0.6" stopColor={metal} />
            <Stop offset="1" stopColor={dark} />
          </RadialGradient>
        </Defs>
        <Circle cx={r} cy={r} r={r - 1} fill={`url(#${id})`} stroke={dark} strokeWidth={1} />
        <Circle cx={r} cy={r} r={r * 0.74} fill="none" stroke={dark} strokeOpacity={0.45} strokeWidth={Math.max(1, size * 0.04)} strokeDasharray={`${size * 0.035} ${size * 0.045}`} />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Text style={{ fontFamily: fonts.display, fontSize: size * 0.42, lineHeight: size * 0.52, color: dark }}>{league.id.slice(0, 1).toUpperCase()}</Text>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ statistiche per gioco */

type GameLine = PublicProfile['games'][GameId];

/** Una riga per gioco: partite, vittorie, serie migliore, punteggio di bravura con la lega. */
export function GameStats({ games }: { games: Partial<PublicProfile['games']> }) {
  return (
    <View style={styles.panel}>
      {GAMES.map((g, i) => {
        const s: GameLine = games[g] ?? { played: 0, won: 0, best: 0, r: RATING.start, n: 0 };
        const placed = s.n >= RATING.placement;
        const league = leagueOf(s.r);
        const prog = leagueProgress(s.r);
        const pct = s.played ? Math.round((s.won / s.played) * 100) : 0;
        const next = LEAGUES[LEAGUES.indexOf(league) + 1];
        return (
          <View
            key={g}
            style={[styles.gameRow, i > 0 && styles.divider]}
            accessible
            accessibilityLabel={`${GAME_LABEL[g]}: ${s.played} partite, ${s.won} vinte, ${pct} per cento. Serie migliore ${s.best}. ${
              placed ? `${league.name}, punteggio ${s.r}` : `In calibrazione, ${s.n} partite su ${RATING.placement}`
            }`}
          >
            <LinearGradient colors={gradients.games[g]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.stripe} />
            <View style={{ flex: 1, gap: 3 }}>
              <View style={styles.gameHead}>
                <Text style={[styles.gameName, styles.fixed]}>{GAME_LABEL[g]}</Text>
                <Text style={styles.gameNums} numberOfLines={1}>
                  {s.played ? `${n(s.played)} partite · ${pct}% vinte` : 'Nessuna partita'}
                </Text>
              </View>
              <View style={styles.gameHead}>
                <Text style={styles.small} numberOfLines={1}>
                  {placed ? league.name : `Calibrazione ${s.n}/${RATING.placement}`}
                </Text>
                <Text style={[styles.small, styles.fixed]} numberOfLines={1}>
                  Serie migliore {s.best}
                </Text>
              </View>
              {placed && prog && next ? <Bar have={prog[0]} need={prog[1]} height={4} color={league.colors[2]} style={{ marginTop: 3 }} /> : null}
            </View>
            <View style={styles.rating}>
              <LeagueCoin league={league} size={34} dim={!placed} />
              <Text style={styles.ratingNum}>{placed ? n(s.r) : '—'}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

/* ------------------------------------------------------------------ vetrina */

/** Un pezzo della vetrina: un oggetto con la sua rarità, o la medaglia di un achievement. */
export function ShowcaseTile({ k, width, height, selected, onPress, label }: { k: string; width: number; height: number; selected?: number; onPress?: () => void; label?: string }) {
  const body = (() => {
    if (k.startsWith('item:')) {
      const item = itemByKey(k.slice(5));
      if (!item) return null;
      return (
        <>
          <View style={[styles.tileArt, { height: height - 50 }]}>
            <ItemPreview item={item} width={width - 12} height={height - 58} />
          </View>
          <Text style={styles.tileName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.tileSub, { color: rarityColor(item.rarity) }]} numberOfLines={1}>
            {RARITY_NAMES[item.rarity]}
          </Text>
        </>
      );
    }
    const a = achievementById(k.slice(4));
    if (!a) return null;
    return (
      <>
        <View style={[styles.tileArt, { height: height - 50 }]}>
          <Medal glyph={CATEGORY_GLYPH[a.category]} tier={a.tier} size={Math.min(width - 24, height - 62)} />
        </View>
        <Text style={styles.tileName} numberOfLines={1}>
          {a.name}
        </Text>
        <Text style={styles.tileSub} numberOfLines={1}>
          {a.hint ? 'Achievement segreto' : 'Achievement'}
        </Text>
      </>
    );
  })();
  const box = (
    <View style={[styles.tile, { width, height }, selected !== undefined && { borderColor: colors.sun, borderWidth: 2 }]}>
      {body}
      {selected !== undefined ? (
        <View style={styles.pick}>
          <Text style={styles.pickText}>{selected + 1}</Text>
        </View>
      ) : null}
    </View>
  );
  if (!onPress) return box;
  return (
    <Squish accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: selected !== undefined }} onPress={onPress} scaleTo={0.96}>
      {box}
    </Squish>
  );
}

/** Le tre cose in vetrina. Sul tuo profilo i posti vuoti invitano a sceglierle. */
export function Showcase({ keys, width, onEdit }: { keys: string[]; width: number; onEdit?: () => void }) {
  const gap = space.s;
  const w = Math.floor((width - gap * 2) / 3);
  const h = Math.round(w * 1.2);
  const slots = onEdit ? [0, 1, 2] : keys.map((_, i) => i);
  if (!slots.length) return null;
  return (
    <View style={{ flexDirection: 'row', gap }}>
      {slots.map(i =>
        keys[i] ? (
          <ShowcaseTile key={keys[i]} k={keys[i]} width={w} height={h} onPress={onEdit} label={onEdit ? 'Cambia la vetrina' : undefined} />
        ) : (
          <Squish key={`vuoto${i}`} accessibilityRole="button" accessibilityLabel="Scegli cosa mettere in vetrina" onPress={onEdit!} scaleTo={0.96}>
            <View style={[styles.tile, styles.empty, { width: w, height: h }]}>
              <Icon name="plus" size={24} color={colors.textSoft} />
              <Text style={[styles.tileSub, { textAlign: 'center' }]}>Aggiungi</Text>
            </View>
          </Squish>
        ),
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ leghe passate */

const seasonLabel = (id: string) => seasonById(id)?.name ?? (id === 'preseason' ? 'Prestagione' : id);

/** Le leghe in cui hai chiuso le stagioni passate, la più recente prima. */
export function LeagueHistory({ leagues }: { leagues: PublicProfile['leagues'] }) {
  if (!leagues.length) return null;
  const list = [...leagues].reverse();
  return (
    <View style={styles.panel}>
      {list.map((l, i) => {
        const league = LEAGUES.find(x => x.id === l.league) ?? LEAGUES[0];
        return (
          <View key={`${l.season}${l.game}`} style={[styles.histRow, i > 0 && styles.divider]}>
            <LeagueCoin league={league} size={30} />
            <View style={{ flex: 1 }}>
              <Text style={styles.gameName}>{league.name}</Text>
              <Text style={styles.small}>
                {GAME_LABEL[l.game]} · {seasonLabel(l.season)}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  panel: { borderRadius: radius.l, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.panelLine, paddingHorizontal: space.m },
  divider: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  gameRow: { flexDirection: 'row', alignItems: 'center', gap: space.m, paddingVertical: space.m },
  stripe: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  gameHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space.s },
  gameName: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 19, color: colors.text },
  gameNums: { flexShrink: 1, fontFamily: fonts.semi, fontSize: 12.5, lineHeight: 16, color: colors.textSoft, fontVariant: ['tabular-nums'] },
  fixed: { flexShrink: 0 },
  small: { flexShrink: 1, fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, color: colors.textFaint, fontVariant: ['tabular-nums'] },
  rating: { alignItems: 'center', width: 52, gap: 2 },
  ratingNum: { fontFamily: fonts.display, fontSize: 14, lineHeight: 18, color: colors.text, fontVariant: ['tabular-nums'] },
  tile: { borderRadius: radius.l, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.panelLine, padding: 6, alignItems: 'center' },
  tileArt: { alignSelf: 'stretch', borderRadius: radius.m, backgroundColor: 'rgba(20,4,40,0.35)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  tileName: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 15, color: colors.text, marginTop: 5, maxWidth: '100%' },
  tileSub: { fontFamily: fonts.semi, fontSize: 10.5, lineHeight: 13, color: colors.textFaint, maxWidth: '100%' },
  empty: { justifyContent: 'center', gap: 4, borderStyle: 'dashed', borderColor: colors.glassLine, backgroundColor: 'rgba(255,255,255,0.05)' },
  pick: { position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.sun, alignItems: 'center', justifyContent: 'center' },
  pickText: { fontFamily: fonts.display, fontSize: 12, lineHeight: 15, color: colors.ink },
  histRow: { flexDirection: 'row', alignItems: 'center', gap: space.m, paddingVertical: space.s + 2 },
});
