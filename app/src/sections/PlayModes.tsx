// Le tre strade del gioco, nella home: la partita veloce (avversari veri, trofei e arene), la
// classificata (avversari del tuo livello, punteggio e leghe; dal livello 10) e il computer
// (allenamento: monete, esperienza e missioni). Poi la scelta del gioco, che dice cosa si vince.
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Sheet } from '@/game/Sheet';
import { BALANCE } from '@/meta/balance';
import { levelInfo, xpForLevel } from '@/meta/levels';
import { useProfile } from '@/meta/profile';
import { LEAGUES, leagueOf, placed, RATING } from '@/meta/rating';
import { GAME_LABEL, LeagueCoin } from '@/ui/competition';
import { Icon, TrophyIcon } from '@/ui/icons';
import { Squish } from '@/ui/kit';
import { CoinIcon } from '@/ui/meta';
import { Bar } from '@/ui/progression';
import { Text } from '@/ui/Text';
import { colors, fonts, gradients, radius, space } from '@/ui/theme';
import { GameTile, ORDER } from './GameTiles';

export type PlayKind = 'quick' | 'ranked' | 'cpu';

const RANKED_LEVEL = BALANCE.matchmaking.rankedLevel;

/** La classificata è aperta (dal livello 10; il Prestigio viene dopo il 100). */
export const rankedOpen = (xp: number) => levelInfo(xp).level >= RANKED_LEVEL || levelInfo(xp).prestige > 0;

/** La lega più alta tra i giochi in cui hai finito la calibrazione (o null). */
function bestLeague(ratings: ReturnType<typeof useProfile.getState>['meta']['ratings']) {
  const done = Object.values(ratings).filter(placed);
  if (!done.length) return null;
  return leagueOf(Math.max(...done.map(r => r.r)));
}

/** I tre ingressi: la partita veloce in grande, sotto la classificata e il computer. */
export function PlayModes({ onPick }: { onPick: (k: PlayKind) => void }) {
  const xp = useProfile(s => s.xp);
  const ratings = useProfile(s => s.meta.ratings);
  const open = rankedOpen(xp);
  const league = bestLeague(ratings);
  const li = levelInfo(xp);
  const need = xpForLevel(RANKED_LEVEL);
  return (
    <View>
      <Squish accessibilityRole="button" accessibilityLabel="Partita veloce: avversari veri, vinci trofei" onPress={() => onPick('quick')} scaleTo={0.97}>
        <View style={styles.play}>
          <LinearGradient
            colors={gradients.sun.colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: radius.pill }]}
          />
          <View style={styles.playShine} />
          <View style={styles.playRow}>
            <TrophyIcon size={30} />
            <View>
              <Text style={styles.playLabel}>Partita veloce</Text>
              <Text style={styles.playSub}>Avversari veri · vinci trofei</Text>
            </View>
          </View>
        </View>
      </Squish>
      <View style={styles.row}>
        <Squish
          accessibilityRole="button"
          accessibilityLabel={
            open
              ? `Classificata: ${league ? league.name : 'punteggio e leghe'}`
              : `Classificata, si apre al livello ${RANKED_LEVEL}. Sei al livello ${li.level}`
          }
          accessibilityHint={open ? undefined : 'Spiega come aprirla'}
          onPress={() => onPick('ranked')}
          outerStyle={{ flex: 1 }}
          style={[styles.mode, !open && styles.modeLocked]}
        >
          <View style={styles.modeIcon}>
            {open ? <LeagueCoin league={league ?? LEAGUES[1]} size={30} dim={!league} /> : <Icon name="lock" size={22} color={colors.textSoft} />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.modeLabel} numberOfLines={1}>
              Classificata
            </Text>
            {open ? (
              <Text style={styles.modeSub} numberOfLines={1}>
                {league ? league.name : 'Leghe e classifiche'}
              </Text>
            ) : (
              <View style={styles.lockRow}>
                <Bar have={Math.min(xp, need)} need={need} height={4} style={{ flex: 1 }} />
                <Text style={styles.lockText}>Liv. {RANKED_LEVEL}</Text>
              </View>
            )}
          </View>
        </Squish>
        <Squish
          accessibilityRole="button"
          accessibilityLabel="Contro il computer: allenamento, monete ed esperienza"
          onPress={() => onPick('cpu')}
          outerStyle={{ flex: 1 }}
          style={styles.mode}
        >
          <View style={styles.modeIcon}>
            <Icon name="play" size={24} color={colors.sky} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.modeLabel} numberOfLines={1}>
              Computer
            </Text>
            <Text style={styles.modeSub} numberOfLines={1}>
              Allenamento
            </Text>
          </View>
        </Squish>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ scelta del gioco */

const TITLES: Record<PlayKind, [string, string]> = {
  quick: ['Partita veloce', 'Contro persone vere della tua arena. Se in 20 secondi non si trova nessuno, il posto lo prende un computer.'],
  ranked: [
    'Classificata',
    'Contro chi ha un punteggio vicino al tuo. Ogni gioco ha la sua lega; a fine stagione la lega più alta vale monete e la sua cornice.',
  ],
  cpu: ['Contro il computer', 'Per allenarti quando vuoi. Si vincono monete ed esperienza e avanzano le missioni, ma niente trofei né lega.'],
};

/** Cosa vale la partita veloce. */
function QuickKey() {
  const q = BALANCE.trophies.quick;
  const c = BALANCE.trophies.quickCpu;
  const cells: [string, string, string][] = [
    ['Contro persone', `+${q.win}`, `−${q.loss} se perdi`],
    ['Con un computer', `+${c.win}`, `−${c.loss} se perdi`],
  ];
  return (
    <View style={styles.key}>
      {cells.map(([who, win, loss]) => (
        <View key={who} style={styles.keyCell}>
          <Text style={styles.keyWho}>{who}</Text>
          <View style={styles.keyRow}>
            <TrophyIcon size={14} />
            <Text style={styles.keyWin}>{win}</Text>
          </View>
          <Text style={styles.keyLoss}>{loss}</Text>
        </View>
      ))}
    </View>
  );
}

/** Il punteggio di ogni gioco, con la sua lega (o la calibrazione). */
function RankedKey() {
  const ratings = useProfile(s => s.meta.ratings);
  return (
    <View style={styles.key}>
      {ORDER.map(g => {
        const r = ratings[g];
        const ok = placed(r);
        const l = leagueOf(r.r);
        return (
          <View key={g} style={styles.keyCell}>
            <Text style={styles.keyWho}>{GAME_LABEL[g]}</Text>
            <View style={styles.keyRow}>
              <LeagueCoin league={l} size={16} dim={!ok} />
              <Text style={styles.keyWin}>{ok ? r.r.toLocaleString('it-IT') : `${r.n}/${RATING.placement}`}</Text>
            </View>
            <Text style={styles.keyLoss}>{ok ? l.coin : 'calibrazione'}</Text>
          </View>
        );
      })}
    </View>
  );
}

function CpuKey() {
  const b = BALANCE;
  return (
    <View style={styles.key}>
      <View style={styles.keyCell}>
        <Text style={styles.keyWho}>Vittoria</Text>
        <View style={styles.keyRow}>
          <CoinIcon size={14} />
          <Text style={styles.keyWin}>+{b.coins.win}</Text>
        </View>
        <Text style={styles.keyLoss}>+{b.xp.win} esperienza</Text>
      </View>
      <View style={styles.keyCell}>
        <Text style={styles.keyWho}>Prima del giorno</Text>
        <View style={styles.keyRow}>
          <CoinIcon size={14} />
          <Text style={styles.keyWin}>+{b.coins.firstWinOfDay}</Text>
        </View>
        <Text style={styles.keyLoss}>vale ovunque</Text>
      </View>
      <View style={styles.keyCell}>
        <Text style={styles.keyWho}>Trofei</Text>
        <View style={styles.keyRow}>
          <TrophyIcon size={14} muted />
          <Text style={styles.keyWin}>0</Text>
        </View>
        <Text style={styles.keyLoss}>solo online</Text>
      </View>
    </View>
  );
}

export function Chooser({ kind, onClose }: { kind: PlayKind; onClose: () => void }) {
  const { width } = useWindowDimensions();
  const w = Math.min(width, 560) - space.xl * 2;
  const [title, sub] = TITLES[kind];
  return (
    <Sheet title={title} sub={sub} onDismiss={onClose}>
      <View style={{ gap: space.m }}>
        {ORDER.map((g, i) => (
          <GameTile key={g} game={g} width={w} index={i} onPick={onClose} kind={kind} />
        ))}
      </View>
      {kind === 'quick' ? <QuickKey /> : kind === 'ranked' ? <RankedKey /> : <CpuKey />}
    </Sheet>
  );
}

/** La classificata ancora chiusa: perché, e quanto manca. */
export function RankedLocked({ onClose, onQuick }: { onClose: () => void; onQuick: () => void }) {
  const xp = useProfile(s => s.xp);
  const li = levelInfo(xp);
  const need = xpForLevel(RANKED_LEVEL);
  return (
    <Sheet
      title="Classificata"
      sub={`Si apre al livello ${RANKED_LEVEL}: prima si impara con la partita veloce. Ogni partita finita dà esperienza, anche quando perdi.`}
      onDismiss={onClose}
    >
      <View style={styles.lockPanel}>
        <View style={styles.lockHead}>
          <Icon name="lock" size={20} color={colors.text} />
          <Text style={styles.lockTitle}>
            Livello {li.level} di {RANKED_LEVEL}
          </Text>
        </View>
        <Bar have={Math.min(xp, need)} need={need} height={10} />
        <Text v="small" style={{ marginTop: space.s }}>
          Ancora {Math.max(0, need - xp).toLocaleString('it-IT')} punti esperienza. In classificata ogni gioco ha il suo punteggio e la sua lega, dalla Lega del
          Tornese a quella dei Re.
        </Text>
      </View>
      <Squish
        accessibilityRole="button"
        accessibilityLabel="Gioca una partita veloce"
        onPress={onQuick}
        scaleTo={0.97}
        style={[styles.play, { marginTop: space.l }]}
      >
        <LinearGradient
          colors={gradients.sun.colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: radius.pill }]}
        />
        <View style={styles.playShine} />
        <View style={styles.playRow}>
          <TrophyIcon size={26} />
          <Text style={styles.playLabel}>Partita veloce</Text>
        </View>
      </Squish>
    </Sheet>
  );
}

const styles = StyleSheet.create({
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
  playRow: { flexDirection: 'row', alignItems: 'center', gap: space.m },
  playLabel: { fontFamily: fonts.display, fontSize: 26, lineHeight: 30, color: colors.ink, letterSpacing: -0.6 },
  playSub: { fontFamily: fonts.semi, fontSize: 12.5, lineHeight: 16, color: colors.ink, opacity: 0.72 },
  row: { flexDirection: 'row', gap: space.m, marginTop: space.m },
  mode: {
    height: 64,
    borderRadius: radius.l,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s,
    paddingLeft: space.m,
    paddingRight: space.m,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.panelLine,
  },
  modeLocked: { backgroundColor: 'rgba(40,12,74,0.28)' },
  modeIcon: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  modeLabel: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 19, color: colors.text },
  modeSub: { fontFamily: fonts.semi, fontSize: 12, lineHeight: 16, color: colors.textSoft, marginTop: 1 },
  lockRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5, height: 14 },
  lockText: { fontFamily: fonts.semi, fontSize: 11.5, lineHeight: 14, color: colors.textSoft },
  key: { flexDirection: 'row', gap: space.s, marginTop: space.l },
  keyCell: { flex: 1, alignItems: 'center', paddingVertical: space.s, paddingHorizontal: 4, borderRadius: radius.m, backgroundColor: 'rgba(255,255,255,0.08)' },
  keyWho: { fontFamily: fonts.semi, fontSize: 11.5, lineHeight: 14, color: colors.textSoft, textAlign: 'center' },
  keyRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  keyWin: { fontFamily: fonts.display, fontSize: 16, lineHeight: 20, color: colors.text, fontVariant: ['tabular-nums'] },
  keyLoss: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 14, color: colors.textFaint, marginTop: 1, textAlign: 'center' },
  lockPanel: { padding: space.l, borderRadius: radius.l, backgroundColor: 'rgba(255,255,255,0.08)', gap: space.s },
  lockHead: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  lockTitle: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 20, color: colors.text },
});
