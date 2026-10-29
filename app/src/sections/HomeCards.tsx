// Le schede della home sotto il pulsante Gioca: le ricompense da riscuotere e l'evento della settimana.
// Le ricompense restano finché non le riscuoti (anche dopo giorni, anche cambiando telefono se sei
// collegato): nessuna scadenza, nessuna fretta.
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { itemByKey } from '@/meta/catalog';
import { dayOf } from '@/meta/economy';
import { daysLeftIn, daysUntil, eventAt, nextEvent, type EventWindow } from '@/meta/events';
import { eventProgressOf } from '@/meta/ledger';
import { claim, progressOf, useProfile } from '@/meta/profile';
import { isOnline } from '@/meta/social';
import { useSocial } from '@/state/social';
import { PlayerAvatar } from '@/ui/avatar';
import { ItemPreview } from '@/ui/cosmetics';
import { sfx } from '@/ui/feedback';
import { Icon } from '@/ui/icons';
import { Squish } from '@/ui/kit';
import { CoinIcon } from '@/ui/meta';
import { dur } from '@/ui/motion';
import { Bar } from '@/ui/progression';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Filetto, Moneta, Pulsante, raggi, Superficie, accento, fontArte, testo as testoArte, useRiduciMovimento } from '@/ui/arte';
import { scaglioneTutto } from '@/ui/missioni/dati';
import { Busta } from '@/ui/missioni/pezzi';
import { assicuraStratoHub, misuraOra, vola, type Vista } from '@/ui/missioni/voli';
import { useTabs } from './Hub';
import { Text } from '@/ui/Text';
import { colors, fonts, radius, space } from '@/ui/theme';

const n = (x: number) => x.toLocaleString('it-IT');
const WEEKDAYS = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
const MONTHS = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const dateText = (d: string) => {
  const [y, m, g] = d.split('-').map(Number);
  return `${WEEKDAYS[new Date(Date.UTC(y, m - 1, g)).getUTCDay()]} ${g} ${MONTHS[m - 1]}`;
};

/* ------------------------------------------------------------------ da riscuotere */

/**
 * Le ricompense pronte: un vassoio di noce con le buste in fila e «Riscuoti tutto» d'ottone. Al tocco si
 * riscuote tutto in una volta (claim('*'), come prima) e da ogni riga partono le sue monete verso la pillola
 * delle monete in alto, scaglionate (§5.10: ≤ 120 ms l'una, l'ultima entro 1,2 s); il suono una volta sola.
 * Con riduci movimento niente volo.
 */
export function ClaimsCard({ width }: { width: number }) {
  const claims = useProfile(s => s.meta.claims);
  const ins = useSafeAreaInsets();
  const riduci = useRiduciMovimento();
  const { sheet } = useTabs();
  const righe = useRef<(Vista | null)[]>([]);
  const piede = useRef<Vista | null>(null);
  if (!claims.length) return null;
  const coins = claims.reduce((t, c) => t + (c.coins ?? 0), 0);
  const items = claims.flatMap(c => c.items ?? []).map(k => itemByKey(k)).filter(i => !!i);
  const shown = claims.slice(0, 3);
  const altre = claims.slice(shown.length);
  const riscuotiTutto = () => {
    // Le partenze si misurano prima di riscuotere: dopo, il vassoio sparisce.
    const partenze = [
      ...shown.map((c, i) => ({ da: misuraOra(righe.current[i]), coins: c.coins ?? 0 })),
      ...(altre.length ? [{ da: misuraOra(piede.current), coins: altre.reduce((t, c) => t + (c.coins ?? 0), 0) }] : []),
    ].filter(x => x.coins > 0);
    if (riduci || !partenze.length) {
      const preso = claim('*');
      sfx(preso > 0 ? 'coin' : 'buy', { haptic: true });
      return;
    }
    assicuraStratoHub(sheet);
    const passo = scaglioneTutto(partenze.length);
    // Prima partono le monete, poi si riscuote tutto in una volta (claim('*'), come prima).
    partenze.forEach((x, i) => {
      const via = () => vola({ sorgente: x.da, strato: 'hub', coins: x.coins, insets: ins, suono: i === 0 });
      if (i === 0) via();
      else setTimeout(via, i * passo);
    });
    setTimeout(() => claim('*'), 0);
  };
  return (
    <Animated.View entering={FadeIn.duration(dur.enter)} exiting={FadeOut.duration(dur.exit)} style={[styles.claimsBox, { width }]}>
      <Superficie materiale="noce" filetto livello={3} raggio={raggi.superficie} style={styles.claims}>
        <View style={styles.claimsHead}>
          <Busta coins={0} xp={0} stato="riscuotere" larghezza={42} altezza={30} muta />
          <View style={{ flex: 1 }}>
            <Text style={styles.claimsTitle}>Da riscuotere</Text>
            <Text style={styles.claimsSub} numberOfLines={1}>
              {claims.length === 1 ? 'Una ricompensa' : `${claims.length} ricompense`}
              {coins ? ` · ${n(coins)} monete` : ''}
              {items.length ? ` · ${items.length === 1 ? 'un oggetto' : `${items.length} oggetti`}` : ''}
            </Text>
          </View>
        </View>
        <Filetto tipo="ottone" style={{ marginVertical: 2 }} />
        {shown.map((c, i) => {
          const item = c.items?.[0] ? itemByKey(c.items[0]) : undefined;
          return (
            <View
              key={c.id}
              ref={v => {
                righe.current[i] = v;
              }}
              collapsable={false}
              style={styles.claimRow}
            >
              {item ? <ItemPreview item={item} width={34} height={28} /> : <Moneta misura={20} />}
              <Text style={styles.claimWhy} numberOfLines={1}>
                {c.why}
              </Text>
              {c.coins ? <Text style={styles.claimCoins}>+{n(c.coins)}</Text> : null}
            </View>
          );
        })}
        {altre.length ? (
          <View ref={piede} collapsable={false}>
            <Text style={styles.more}>e altre {altre.length}</Text>
          </View>
        ) : null}
        <Pulsante
          testID="riscuoti-tutto-home"
          etichetta="Riscuoti tutto"
          sotto={coins ? `${n(coins)} monete` : undefined}
          suono={null}
          onPress={riscuotiTutto}
          style={{ marginTop: 6 }}
        />
      </Superficie>
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ amici */

/** Chi dei tuoi amici è online adesso, e le richieste di amicizia in attesa. Solo se c'è qualcosa. */
export function FriendsCard({ width, onOpen }: { width: number; onOpen: () => void }) {
  const account = useProfile(s => s.account);
  const friends = useSocial(s => s.friends);
  const requests = useSocial(s => s.requests);
  if (!account || !friends) return null;
  const online = friends.filter(f => isOnline(f.last_seen));
  if (!online.length && !requests.length) return null;
  const shown = online.slice(0, 5);
  return (
    <Squish accessibilityRole="button" accessibilityLabel={`Amici: ${online.length} online${requests.length ? `, ${requests.length} richieste` : ''}`} onPress={onOpen} scaleTo={0.98}>
      <View style={[styles.friends, { width }]}>
        <View style={styles.faces}>
          {shown.map((f, i) => {
            const pub = (f.pub ?? {}) as { avatar?: string; frame?: string };
            return (
              <View key={f.id} style={{ marginLeft: i ? -10 : 0 }}>
                <PlayerAvatar avatar={pub.avatar} photo={f.avatar} name={f.name} frame={pub.frame} size={40} />
                <View style={styles.onDot} />
              </View>
            );
          })}
          {!shown.length ? (
            <View style={styles.reqIcon}>
              <Icon name="friends" size={20} color={colors.ink} />
            </View>
          ) : null}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.friendsTitle} numberOfLines={1}>
            {online.length ? (online.length === 1 ? `${online[0].name} è online` : `${online.length} amici online`) : 'Richieste di amicizia'}
          </Text>
          <Text v="small" numberOfLines={1}>
            {requests.length ? `${requests.length === 1 ? 'Una richiesta' : `${requests.length} richieste`} da guardare` : 'Sfidali in una stanza'}
          </Text>
        </View>
        <Icon name="chevron" size={18} color={colors.textFaint} />
      </View>
    </Squish>
  );
}

/* ------------------------------------------------------------------ evento */

function Tiers({ w, have, reached }: { w: EventWindow; have: number; reached: number[] }) {
  const t = w.template;
  const claims = useProfile(s => s.meta.claims);
  return (
    <View style={styles.tiers}>
      {t.tiers.map((goal, i) => {
        const r = t.rewards[i];
        const item = r.items?.[0] ? itemByKey(r.items[0]) : undefined;
        const done = reached.includes(i) || have >= goal;
        const toClaim = claims.some(c => c.id === `evento:${w.id}:${i}`);
        return (
          <View key={i} style={[styles.tier, done && { borderColor: t.colors[1] }]} accessibilityLabel={`${goal} ${t.unit}: ${item ? item.name : `${r.coins} monete`}${done ? (toClaim ? ', da riscuotere' : ', fatto') : ''}`}>
            <View style={styles.tierArt}>{item ? <ItemPreview item={item} width={40} height={40} /> : <CoinIcon size={24} />}</View>
            <Text style={styles.tierPrize} numberOfLines={1}>
              {item ? (item.slot === 'frame' ? 'Cornice' : item.name) : `+${n(r.coins ?? 0)}`}
            </Text>
            <View style={styles.tierFoot}>
              {done ? <Icon name={toClaim ? 'gift' : 'check'} size={12} color={toClaim ? colors.sun : colors.mint} stroke={2.6} /> : null}
              <Text style={styles.tierGoal}>
                {goal} {t.unit.split(' ')[0]}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

export function EventCard({ width, onPlay }: { width: number; onPlay: () => void }) {
  const p = useProfile();
  const day = dayOf(new Date());
  const now = eventAt(day);
  if (!now) {
    const next = nextEvent(day);
    const t = next.template;
    const last = t.rewards[t.rewards.length - 1];
    const item = last.items?.[0] ? itemByKey(last.items[0]) : undefined;
    const d = daysUntil(next, day);
    return (
      <View style={[styles.event, { width }]}>
        <LinearGradient colors={[t.colors[0], 'rgba(40,12,74,0.6)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={styles.eventIn}>
          <Text style={[styles.kicker, { color: t.colors[1] }]}>Prossimo evento · {d === 1 ? 'domani' : `tra ${d} giorni`}</Text>
          <Text style={styles.eventName}>{t.name}</Text>
          <Text v="small" style={{ color: colors.textSoft }}>
            Da {dateText(next.start)} a {dateText(next.end)}. {t.desc}
          </Text>
          {item ? (
            <View style={styles.nextPrize}>
              <ItemPreview item={item} width={44} height={44} />
              <Text v="small" style={{ flex: 1 }}>
                Premio finale: la cornice «{item.name}», che si vince solo con questo evento.
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  }
  const t = now.template;
  const mine = p.meta.event.id === now.id;
  const have = mine ? eventProgressOf(progressOf(p)) : 0;
  const reached = mine ? p.meta.event.tiers : [];
  const top = t.tiers[t.tiers.length - 1];
  const left = daysLeftIn(now, day);
  const done = have >= top;
  return (
    <View style={[styles.event, { width, borderColor: t.colors[1] }]}>
      <LinearGradient colors={[t.colors[0], 'rgba(40,12,74,0.6)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={styles.eventIn}>
        <View style={styles.eventTop}>
          <Text style={[styles.kicker, { color: t.colors[1] }]}>Evento · {left === 1 ? 'ultimo giorno' : `ancora ${left} giorni`}</Text>
          <Icon name="calendar" size={16} color={t.colors[1]} />
        </View>
        <Text style={styles.eventName}>{t.name}</Text>
        <Text v="small" style={{ color: colors.textSoft }}>
          {t.desc} Fino a {dateText(now.end)}.
        </Text>
        <View style={styles.eventBar}>
          <Bar have={Math.min(have, top)} need={top} height={8} color={t.colors[1]} style={{ flex: 1 }} />
          <Text style={styles.eventCount}>
            {n(Math.min(have, top))}/{n(top)}
          </Text>
        </View>
        <Text style={styles.eventUnit}>{done ? 'Evento completato: bravo!' : `${t.unit} da quando è cominciato`}</Text>
        <Tiers w={now} have={have} reached={reached} />
        {!done ? (
          <Squish
            accessibilityRole="button"
            accessibilityLabel={t.game ? `Gioca a ${t.game}` : 'Gioca'}
            onPress={() => (t.game ? router.push({ pathname: '/gioca/[game]', params: { game: t.game } }) : onPlay())}
            scaleTo={0.97}
            style={[styles.eventPlay, { backgroundColor: t.colors[1] }]}
          >
            <Text style={styles.eventPlayText}>{t.game ? `Gioca a ${t.game === 'tressette' ? 'Tressette' : t.game === 'briscola' ? 'Briscola' : 'Scopa'}` : 'Gioca'}</Text>
          </Squish>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  claimsBox: { alignSelf: 'center', marginTop: space.l },
  claims: { padding: space.m, paddingHorizontal: space.l, gap: space.s },
  claimsHead: { flexDirection: 'row', alignItems: 'center', gap: space.m },
  claimsTitle: { fontFamily: fontArte.bodoni, fontSize: 21, lineHeight: 25, color: accento.oro },
  claimsSub: { fontFamily: fontArte.soraSemi, fontSize: 12.5, lineHeight: 16, color: testoArte.forte, opacity: 0.86 },
  claimRow: { flexDirection: 'row', alignItems: 'center', gap: space.s, minHeight: 30, paddingLeft: 2 },
  claimWhy: { flex: 1, fontFamily: fontArte.sora, fontSize: 13, lineHeight: 17, color: testoArte.forte },
  claimCoins: { fontFamily: fontArte.soraBold, fontSize: 14, lineHeight: 18, color: accento.oro, fontVariant: ['tabular-nums'] },
  more: { fontFamily: fontArte.sora, fontSize: 12, lineHeight: 15, color: testoArte.medio, paddingLeft: 2 },
  event: { alignSelf: 'center', marginTop: space.l, borderRadius: radius.l, overflow: 'hidden', borderWidth: 1.5, borderColor: colors.panelLine },
  eventIn: { padding: space.l, gap: 4 },
  eventTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kicker: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 15, textTransform: 'uppercase', letterSpacing: 0.4 },
  eventName: { fontFamily: fonts.display, fontSize: 22, lineHeight: 27, color: colors.text, letterSpacing: -0.4 },
  eventBar: { flexDirection: 'row', alignItems: 'center', gap: space.s, marginTop: space.s },
  eventCount: { fontFamily: fonts.display, fontSize: 14, lineHeight: 18, color: colors.text, fontVariant: ['tabular-nums'], minWidth: 44, textAlign: 'right' },
  eventUnit: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, color: colors.textFaint },
  tiers: { flexDirection: 'row', gap: space.s, marginTop: space.s },
  tier: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: space.s, borderRadius: radius.m, backgroundColor: 'rgba(20,4,40,0.35)', borderWidth: 1, borderColor: 'transparent' },
  tierArt: { height: 42, alignItems: 'center', justifyContent: 'center' },
  tierPrize: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 15, color: colors.text, maxWidth: '90%' },
  tierFoot: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  tierGoal: { fontFamily: fonts.semi, fontSize: 11, lineHeight: 14, color: colors.textFaint, fontVariant: ['tabular-nums'] },
  eventPlay: { height: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', marginTop: space.m },
  eventPlayText: { fontFamily: fonts.display, fontSize: 15, lineHeight: 19, color: colors.ink },
  friends: { alignSelf: 'center', marginTop: space.l, flexDirection: 'row', alignItems: 'center', gap: space.m, padding: space.m, borderRadius: radius.l, backgroundColor: colors.panel, borderWidth: 1, borderColor: 'rgba(124,242,210,0.45)' },
  faces: { flexDirection: 'row', alignItems: 'center' },
  onDot: { position: 'absolute', right: 2, bottom: 2, width: 11, height: 11, borderRadius: 6, backgroundColor: colors.mint, borderWidth: 2, borderColor: '#2A0E4A' },
  reqIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' },
  friendsTitle: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 19, color: colors.text },
  nextPrize: { flexDirection: 'row', alignItems: 'center', gap: space.m, marginTop: space.s },
});
