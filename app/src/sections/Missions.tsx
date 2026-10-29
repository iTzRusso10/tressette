// Le missioni del giorno e della settimana, con la ricompensa e quanto manca alla scadenza.
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { dayOf } from '@/meta/economy';
import { activeMissions, missionProgress } from '@/meta/ledger';
import { daysToWeekEnd } from '@/meta/missions';
import { claim, progressOf, swapDailyMission, useProfile } from '@/meta/profile';
import { sfx } from '@/ui/feedback';
import { Icon } from '@/ui/icons';
import { Squish } from '@/ui/kit';
import { CoinIcon } from '@/ui/meta';
import { Bar } from '@/ui/progression';
import { Text } from '@/ui/Text';
import { colors, fonts, radius, space } from '@/ui/theme';

const ROW_H = 58;

function hoursToMidnight(now: Date) {
  const end = new Date(now);
  end.setHours(24, 0, 0, 0);
  const h = Math.ceil((end.getTime() - now.getTime()) / 3600000);
  return h <= 1 ? 'meno di un’ora' : `${h} ore`;
}

export function Missions({ width }: { width: number }) {
  const p = useProfile();
  const [period, setPeriod] = useState<'daily' | 'weekly'>('daily');
  const now = new Date();
  const day = dayOf(now);
  // Se il giorno è cambiato senza partite, le missioni si mostrano già nuove (lo stato si aggiorna alla prossima azione).
  const list = activeMissions(progressOf(p), day).filter(m => m.def.period === period);
  const freshDay = p.meta.missions.day !== day;
  const doneCount = (per: 'daily' | 'weekly') => activeMissions(progressOf(p), day).filter(m => m.def.period === per && p.meta.missions.done.includes(m.key)).length;
  const left = period === 'daily' ? `Nuove tra ${hoursToMidnight(now)}` : `Scadono tra ${daysToWeekEnd(day)} ${daysToWeekEnd(day) === 1 ? 'giorno' : 'giorni'}`;
  return (
    <View style={[styles.box, { width }]}>
      <View style={styles.head}>
        <Icon name="check" size={18} color={colors.sun} stroke={2.4} />
        <Text style={styles.title}>Missioni</Text>
        <View style={styles.tabs} accessibilityRole="radiogroup" accessibilityLabel="Missioni">
          {(['daily', 'weekly'] as const).map(per => (
            <Squish
              key={per}
              accessibilityRole="radio"
              accessibilityState={{ selected: period === per }}
              accessibilityLabel={per === 'daily' ? 'Del giorno' : 'Della settimana'}
              onPress={() => setPeriod(per)}
              style={[styles.tab, period === per && styles.tabOn]}
            >
              <Text style={[styles.tabText, period === per && { color: colors.ink }]}>
                {per === 'daily' ? 'Oggi' : 'Settimana'} {doneCount(per)}/{per === 'daily' ? 3 : 4}
              </Text>
            </Squish>
          ))}
        </View>
      </View>
      {list.map(({ def, key }) => {
        const done = p.meta.missions.done.includes(key);
        const have = freshDay && period === 'daily' ? 0 : Math.min(def.goal, missionProgress(p, key));
        const claimId = `m:${key}`;
        const toClaim = p.meta.claims.some(c => c.id === claimId);
        // Una missione del giorno si può cambiare una volta al giorno, se non è già fatta.
        const canSwap = period === 'daily' && !done && !(p.meta.missions.swaps[day]?.length ?? 0);
        return (
          <View key={key} style={styles.row} accessibilityLabel={`${def.text} ${done ? (toClaim ? 'Completata, da riscuotere' : 'Completata') : `${have} su ${def.goal}`}. Premio ${def.coins} monete`}>
            <View style={[styles.dot, done && styles.dotDone, toClaim && styles.dotClaim]}>
              {toClaim ? <Icon name="gift" size={13} color={colors.ink} stroke={2.4} /> : done ? <Icon name="check" size={13} color={colors.ink} stroke={3} /> : null}
            </View>
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={[styles.text, done && { color: colors.textFaint }]} numberOfLines={2}>
                {def.text}
              </Text>
              {done ? null : (
                <View style={styles.barRow}>
                  <Bar have={have} need={def.goal} height={5} style={{ flex: 1 }} />
                  <Text style={styles.count}>
                    {have}/{def.goal}
                  </Text>
                </View>
              )}
            </View>
            {canSwap ? (
              <Squish
                accessibilityRole="button"
                accessibilityLabel="Cambia questa missione (una volta al giorno)"
                onPress={() => {
                  if (swapDailyMission(key)) sfx('tick');
                }}
                hitSlop={6}
                style={styles.swap}
              >
                <Icon name="swap" size={16} color={colors.textSoft} />
              </Squish>
            ) : null}
            {toClaim ? (
              <Squish
                accessibilityRole="button"
                accessibilityLabel={`Riscuoti ${def.coins} monete`}
                onPress={() => {
                  if (claim(claimId) > 0) sfx('buy', { haptic: true });
                }}
                style={styles.claim}
              >
                <CoinIcon size={14} />
                <Text style={styles.claimText}>{def.coins}</Text>
              </Squish>
            ) : (
              <View style={[styles.prize, done && { opacity: 0.5 }]}>
                <CoinIcon size={14} />
                <Text style={styles.prizeText}>{def.coins}</Text>
              </View>
            )}
          </View>
        );
      })}
      <Text style={styles.left}>
        {left}
        {period === 'daily' && !(p.meta.missions.swaps[day]?.length ?? 0) ? ' · puoi cambiarne una' : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignSelf: 'center', marginTop: space.l, padding: space.m, paddingBottom: space.s, borderRadius: radius.l, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.panelLine },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: space.s },
  title: { flex: 1, fontFamily: fonts.bold, fontSize: 16, lineHeight: 20, color: colors.text },
  tabs: { flexDirection: 'row', gap: 4, padding: 3, borderRadius: radius.pill, backgroundColor: 'rgba(20,4,40,0.4)' },
  tab: { height: 32, paddingHorizontal: 10, borderRadius: radius.pill, justifyContent: 'center' },
  tabOn: { backgroundColor: '#FFFFFF' },
  tabText: { fontFamily: fonts.semi, fontSize: 12, lineHeight: 15, color: colors.text, fontVariant: ['tabular-nums'] },
  row: { minHeight: ROW_H, flexDirection: 'row', alignItems: 'center', gap: space.m, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', paddingVertical: 6 },
  dot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', alignItems: 'center', justifyContent: 'center' },
  dotDone: { backgroundColor: colors.mint, borderColor: colors.mint },
  dotClaim: { backgroundColor: colors.sun, borderColor: colors.sun },
  text: { fontFamily: fonts.semi, fontSize: 13, lineHeight: 17, color: colors.text },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  count: { fontFamily: fonts.semi, fontSize: 10.5, lineHeight: 13, color: colors.textFaint, fontVariant: ['tabular-nums'], minWidth: 34, textAlign: 'right' },
  prize: { flexDirection: 'row', alignItems: 'center', gap: 3, minWidth: 44, justifyContent: 'flex-end' },
  prizeText: { fontFamily: fonts.bold, fontSize: 12.5, lineHeight: 16, color: colors.text, fontVariant: ['tabular-nums'] },
  swap: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
  claim: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 32, paddingHorizontal: 10, borderRadius: radius.pill, backgroundColor: colors.sun },
  claimText: { fontFamily: fonts.display, fontSize: 13, lineHeight: 16, color: colors.ink, fontVariant: ['tabular-nums'] },
  left: { fontFamily: fonts.medium, fontSize: 11.5, lineHeight: 15, color: colors.textFaint, textAlign: 'center', marginTop: 4 },
});
