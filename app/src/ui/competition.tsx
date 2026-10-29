// Pezzi condivisi dal tuo profilo, da quello degli altri giocatori e da altre schermate: moneta della lega,
// statistiche per gioco con il punteggio di bravura, vetrina, leghe passate. Tutto parte dal profilo pubblico
// (ledger.ts, `publicOf`), così quello che vedi di te è esattamente quello che vedono gli altri.
//
// GAME_LABEL, GAMES e LeagueCoin li usano anche Classifica, Overlays, InviteBanner e Summary: le firme non
// cambiano. GameStats, ShowcaseTile, Showcase e LeagueHistory sono in «Lampara» (docs/direzione-artistica.md
// §5.15); il profilo vero e proprio sta in ui/profilo/ (VetrinaProfilo, LibroMastro, Vetrina, Medagliere).
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import type { GameId } from '@/engine';
import type { PublicProfile } from '@/meta/ledger';
import { LEAGUES, leagueOf, leagueProgress, RATING, type League } from '@/meta/rating';
import { seasonById } from '@/meta/seasons';
import { accento, conAlfa, fontArte, primitivi, Sigillo, Superficie, testo } from './arte';
import { Squish } from './kit';
import { Esposto, infoEsposto, Teca } from './profilo/Vetrina';
import { Text } from './Text';
import { fonts } from './theme';

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

/** Una riga per gioco su carta avorio: partite, vittorie, serie migliore, punteggio di bravura con la lega. */
export function GameStats({ games }: { games: Partial<PublicProfile['games']> }) {
  return (
    <Superficie materiale="carta" livello={3} raggio={4} style={styles.carta}>
      {GAMES.map((g, i) => {
        const s: GameLine = games[g] ?? { played: 0, won: 0, best: 0, r: RATING.start, n: 0 };
        const placed = s.n >= RATING.placement;
        const league = leagueOf(s.r);
        const prog = leagueProgress(s.r);
        const pct = s.played ? Math.round((s.won / s.played) * 100) : 0;
        const next = LEAGUES[LEAGUES.indexOf(league) + 1];
        const avanti = placed && prog && next ? prog[0] / Math.max(1, prog[1]) : placed ? 1 : s.n / RATING.placement;
        return (
          <View
            key={g}
            style={[styles.gameRow, i > 0 && styles.divider]}
            accessible
            accessibilityLabel={`${GAME_LABEL[g]}: ${s.played} partite, ${s.won} vinte, ${pct} per cento. Serie migliore ${s.best}. ${
              placed ? `${league.name}, punteggio ${s.r}` : `In calibrazione, ${s.n} partite su ${RATING.placement}`
            }`}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.gameName}>{GAME_LABEL[g]}</Text>
              <Text style={styles.small} numberOfLines={1}>
                {s.played ? `${n(s.played)} partite · ${pct}% vinte · serie ${s.best}` : 'Nessuna partita'}
              </Text>
              <View style={styles.binario}>
                <View style={[styles.matita, { width: `${Math.max(2, Math.min(1, avanti) * 100)}%` }]} />
              </View>
            </View>
            <View style={styles.rating}>
              <LeagueCoin league={league} size={34} dim={!placed} />
              <Text style={styles.ratingNum}>{placed ? n(s.r) : `${s.n}/${RATING.placement}`}</Text>
            </View>
          </View>
        );
      })}
    </Superficie>
  );
}

/* ------------------------------------------------------------------ vetrina */

/**
 * Un pezzo che si può esporre, come piccola nicchia di velluto sotto la luce: l'oggetto (o la medaglia), il nome e
 * la rarità scritta. Scelto (`selected` = posto 0, 1, 2): l'anello d'ottone e il sigillo con il numero del posto.
 */
export function ShowcaseTile({ k, width, height, selected, onPress, label }: { k: string; width: number; height: number; selected?: number; onPress?: () => void; label?: string }) {
  const info = infoEsposto(k);
  if (!info) return null;
  const on = selected !== undefined;
  const artH = height - 40;
  const box = (
    <View style={{ width, height }}>
      <View style={[styles.tile, { width, height: artH }, on && styles.tileOn]}>
        <Superficie materiale="velluto" livello={0} raggio={10} style={StyleSheet.absoluteFill} />
        <LinearGradient pointerEvents="none" colors={['rgba(255,217,160,0.30)', 'rgba(255,217,160,0)']} locations={[0, 0.7]} style={StyleSheet.absoluteFill} />
        <View style={{ position: 'absolute', left: 6, right: 6, bottom: 6, top: 8 }}>
          <Esposto k={k} larghezza={width - 12} altezza={artH - 14} proprio />
        </View>
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.tileIncasso]} />
      </View>
      <Text style={[styles.tileName, on && { color: accento.oro }]} numberOfLines={1}>
        {info.nome}
      </Text>
      <Text style={[styles.tileSub, { color: info.colore }]} numberOfLines={1}>
        {info.sotto.split(' · ')[0]}
      </Text>
      {on ? (
        <View style={styles.pick} pointerEvents="none">
          <Sigillo testo={String(selected + 1)} misura={30} seme={selected * 11 + 3} timbro />
        </View>
      ) : null}
    </View>
  );
  if (!onPress) return box;
  return (
    <Squish accessibilityRole="button" accessibilityLabel={label ? `${info.nome}. ${label}` : info.nome} accessibilityState={{ selected: on }} onPress={onPress} scaleTo={0.96}>
      {box}
    </Squish>
  );
}

/** Le tre cose in vetrina, nella teca di noce. Sul tuo profilo (`onEdit`) i posti vuoti invitano a sceglierle. */
export function Showcase({ keys, width, onEdit }: { keys: string[]; width: number; onEdit?: () => void }) {
  if (!onEdit && !keys.length) return null;
  return <Teca chiavi={keys} larghezza={width} proprio={!!onEdit} onCambia={onEdit} />;
}

/* ------------------------------------------------------------------ leghe passate */

const seasonLabel = (id: string) => seasonById(id)?.name ?? (id === 'preseason' ? 'Prestagione' : id);

/** Le leghe in cui hai chiuso le stagioni passate, la più recente prima: monete su un vassoio di velluto. */
export function LeagueHistory({ leagues }: { leagues: PublicProfile['leagues'] }) {
  if (!leagues.length) return null;
  const list = [...leagues].reverse();
  return (
    <Superficie materiale="velluto" livello={2} raggio={12} style={styles.vassoio}>
      {list.map((l, i) => {
        const league = LEAGUES.find(x => x.id === l.league) ?? LEAGUES[0];
        return (
          <View key={`${l.season}${l.game}`} style={[styles.histRow, i > 0 && styles.dividerScuro]}>
            <LeagueCoin league={league} size={34} />
            <View style={{ flex: 1 }}>
              <Text style={styles.histName}>{league.name}</Text>
              <Text style={styles.histSub}>
                {GAME_LABEL[l.game]} · {seasonLabel(l.season)}
              </Text>
            </View>
          </View>
        );
      })}
    </Superficie>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  carta: { paddingHorizontal: 14 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: conAlfa(primitivi.inchiostro.rosso, 0.4) },
  dividerScuro: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,200,210,0.2)' },
  gameRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  gameName: { fontFamily: fontArte.bodoni, fontSize: 20, lineHeight: 24, color: testo.inchiostro },
  small: { fontFamily: fontArte.sora, fontSize: 12.5, lineHeight: 16, color: testo.inchiostroTenue, fontVariant: ['tabular-nums'] },
  binario: { height: 3, marginTop: 5, borderRadius: 1.5, backgroundColor: conAlfa(primitivi.inchiostro.tenue, 0.14), overflow: 'hidden' },
  matita: { height: 3, borderRadius: 1.5, backgroundColor: conAlfa(primitivi.inchiostro.forte, 0.55) },
  rating: { alignItems: 'center', width: 56, gap: 2 },
  ratingNum: { fontFamily: fontArte.soraBold, fontSize: 14, lineHeight: 18, color: testo.inchiostro, fontVariant: ['tabular-nums'] },
  tile: { borderRadius: 10, overflow: 'hidden', borderWidth: 1.5, borderColor: 'transparent' },
  tileOn: { borderColor: primitivi.fogliaOro, boxShadow: '0px 3px 4px rgba(8,3,4,0.5), 8px 24px 36px rgba(8,3,4,0.5)' },
  tileIncasso: { borderRadius: 10, boxShadow: 'inset 0px 3px 6px rgba(8,3,4,0.7)' },
  tileName: { marginTop: 6, fontFamily: fontArte.soraBold, fontSize: 12.5, lineHeight: 16, color: testo.forte, textAlign: 'center' },
  tileSub: { fontFamily: fontArte.soraSemi, fontSize: 12, lineHeight: 15, textAlign: 'center' },
  pick: { position: 'absolute', top: -8, right: -6 },
  vassoio: { paddingHorizontal: 14 },
  histRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  histName: { fontFamily: fontArte.soraBold, fontSize: 15, lineHeight: 19, color: testo.forte },
  histSub: { fontFamily: fontArte.sora, fontSize: 13, lineHeight: 17, color: testo.medio },
});
