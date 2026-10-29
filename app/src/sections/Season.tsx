// La stagione in corso: quanto manca, i tuoi punti, i traguardi con le ricompense, le missioni di
// stagione e il cosmetico speciale. Prima della prima stagione mostra quando comincia.
import { StyleSheet, View } from 'react-native';
import { itemByKey } from '@/meta/catalog';
import { dayOf } from '@/meta/economy';
import { seasonMissionProgress } from '@/meta/ledger';
import { progressOf, useProfile } from '@/meta/profile';
import { daysLeft, nextSeason, seasonAt, type SeasonWindow } from '@/meta/seasons';
import { ItemPreview } from '@/ui/cosmetics';
import { Icon } from '@/ui/icons';
import { CoinIcon } from '@/ui/meta';
import { Bar } from '@/ui/progression';
import { Text } from '@/ui/Text';
import { colors, fonts, radius, space } from '@/ui/theme';

const MONTHS = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const fmt = (d: string) => {
  const [, m, g] = d.split('-').map(Number);
  return `${g} ${MONTHS[m - 1]}`;
};

function Upcoming({ w }: { w: SeasonWindow }) {
  const special = itemByKey(w.season.special)!;
  return (
    <View style={styles.box}>
      <Text style={styles.kicker}>Prossima stagione</Text>
      <Text style={styles.name}>{w.season.name}</Text>
      <Text v="body">
        Comincia il {fmt(w.start)} e dura fino al {fmt(w.end)}. Le partite veloci e classificate valgono punti stagione: i trofei o i punti della lega che vinci o perdi. A fine stagione si azzerano solo quelli, mai trofei e oggetti.
      </Text>
      <View style={styles.special}>
        <ItemPreview item={special} width={84} height={58} />
        <Text v="small" style={{ flex: 1 }}>
          Il suo cosmetico speciale: {special.name}. Non si trova nel negozio.
        </Text>
      </View>
    </View>
  );
}

export function SeasonCard() {
  const p = useProfile();
  const day = dayOf(new Date());
  const now = seasonAt(day);
  if (!now) {
    const next = nextSeason(day);
    return next ? <Upcoming w={next} /> : null;
  }
  const { season } = now;
  // Se la stagione è appena cominciata e non hai ancora giocato, i punti sono zero.
  const mine = p.meta.season.id === season.id ? p.meta.season : null;
  const points = mine?.points ?? 0;
  const top = season.tiers[season.tiers.length - 1].points;
  const left = daysLeft(now, day);
  const view = progressOf(p);
  return (
    <View style={styles.box}>
      <Text style={styles.kicker}>
        Stagione {season.n} · {left === 1 ? 'ultimo giorno' : `ancora ${left} giorni`}
      </Text>
      <Text style={styles.name}>{season.name}</Text>
      <View style={styles.pointsRow}>
        <Text style={styles.points}>{points}</Text>
        <Text v="small" style={{ flex: 1 }}>
          punti stagione · {mine?.matches ?? 0} partite
        </Text>
      </View>
      <Bar have={points} need={top} height={10} />
      <View style={styles.tiers}>
        {season.tiers.map((t, i) => {
          const done = !!mine?.tiers.includes(i);
          const item = t.reward.items?.[0] ? itemByKey(t.reward.items[0]) : undefined;
          return (
            <View key={i} style={[styles.tier, done && styles.tierDone]}>
              {item ? <ItemPreview item={item} width={44} height={30} /> : <CoinIcon size={22} />}
              <Text style={styles.tierPrize} numberOfLines={1}>
                {item ? 'Speciale' : `+${t.reward.coins}`}
              </Text>
              <Text style={styles.tierPts}>{done ? 'Preso' : `${t.points} pt`}</Text>
            </View>
          );
        })}
      </View>
      <Text style={styles.subhead}>Missioni di stagione</Text>
      {season.missions.map(m => {
        const done = !!mine?.missions.includes(m.id);
        const [have, need] = seasonMissionProgress(view, m);
        return (
          <View key={m.id} style={styles.mission}>
            <View style={[styles.dot, done && styles.dotDone]}>{done ? <Icon name="check" size={12} color={colors.ink} stroke={3} /> : null}</View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.missionText}>{m.text}</Text>
              {done ? null : <Bar have={mine ? have : 0} need={need} height={5} />}
            </View>
            <View style={styles.prize}>
              <CoinIcon size={14} />
              <Text style={styles.prizeText}>{m.coins}</Text>
            </View>
          </View>
        );
      })}
      <Text v="small" style={{ marginTop: space.s }}>
        Chiudi la stagione tra i primi 100, i primi 10 o al primo posto per i titoli Finalista, Campione Stagionale e Primo di Stagione (servono almeno 10 partite). Finisce il {fmt(now.end)}.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: space.s, padding: space.l, borderRadius: radius.xl, backgroundColor: colors.panel, borderWidth: 1, borderColor: 'rgba(255,224,102,0.4)' },
  kicker: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 15, color: colors.sun, textTransform: 'uppercase', letterSpacing: 0.4 },
  name: { fontFamily: fonts.display, fontSize: 24, lineHeight: 29, color: colors.text, letterSpacing: -0.5 },
  pointsRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.s },
  points: { fontFamily: fonts.display, fontSize: 32, lineHeight: 36, color: colors.text, fontVariant: ['tabular-nums'] },
  tiers: { flexDirection: 'row', gap: space.s, marginTop: space.xs },
  tier: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: space.s, borderRadius: radius.m, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'transparent' },
  tierDone: { borderColor: 'rgba(124,242,210,0.6)' },
  tierPrize: { fontFamily: fonts.bold, fontSize: 11.5, lineHeight: 14, color: colors.text },
  tierPts: { fontFamily: fonts.semi, fontSize: 10.5, lineHeight: 13, color: colors.textFaint, fontVariant: ['tabular-nums'] },
  subhead: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 18, color: colors.text, marginTop: space.m },
  mission: { flexDirection: 'row', alignItems: 'center', gap: space.m, minHeight: 48 },
  dot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', alignItems: 'center', justifyContent: 'center' },
  dotDone: { backgroundColor: colors.mint, borderColor: colors.mint },
  missionText: { fontFamily: fonts.semi, fontSize: 13, lineHeight: 17, color: colors.text },
  prize: { flexDirection: 'row', alignItems: 'center', gap: 3, minWidth: 48, justifyContent: 'flex-end' },
  prizeText: { fontFamily: fonts.bold, fontSize: 12.5, lineHeight: 16, color: colors.text, fontVariant: ['tabular-nums'] },
  special: { flexDirection: 'row', alignItems: 'center', gap: space.m, marginTop: space.s },
});
