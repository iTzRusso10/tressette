// L'invito di un amico a una partita: una scheda in alto, ovunque tranne al tavolo e nella stanza.
// «Entra» porta nella stanza; «No» la chiude. Un invito vale dieci minuti (lo controlla il server).
import { router, usePathname } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { SlideInUp, SlideOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { joinRoom } from '@/online/session';
import { useSettings } from '@/state/settings';
import { respondInvite, useSocial } from '@/state/social';
import { PlayerAvatar } from './avatar';
import { GAME_LABEL } from './competition';
import { sfx } from './feedback';
import { Squish } from './kit';
import { dur, ease } from './motion';
import { Text } from './Text';
import { colors, fonts, radius } from './theme';

export function InviteBanner() {
  const inv = useSocial(s => s.invites[0]);
  const path = usePathname();
  const ins = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const name = useSettings(s => s.name.trim());
  const [msg, setMsg] = useState<string | null>(null);
  const busyHere = path === '/tavolo' || path.startsWith('/stanza');
  if (!inv || busyHere) return null;
  const w = Math.min(width - 24, 420);
  const pub = inv.from.pub as { avatar?: string; frame?: string };
  const accept = async () => {
    sfx('tick');
    const code = await respondInvite(inv, true);
    if (!code) return setMsg('L’invito è scaduto.');
    const r = await joinRoom(code, name || 'Amico');
    if (r === 'ok') router.push({ pathname: '/stanza/[code]', params: { code } });
    else setMsg(r === 'nohost' ? 'La stanza è già chiusa.' : 'Non riesco a collegarmi.');
  };
  return (
    <Animated.View
      key={inv.id}
      entering={SlideInUp.duration(dur.enter + 40).easing(ease.in)}
      exiting={SlideOutUp.duration(dur.exit).easing(ease.out)}
      accessibilityLiveRegion="polite"
      style={[styles.card, { top: ins.top + 8, width: w, left: (width - w) / 2 }]}
    >
      <PlayerAvatar avatar={pub.avatar} photo={inv.from.photo} name={inv.from.name} frame={pub.frame} size={48} />
      <View style={{ flex: 1 }}>
        <Text style={styles.kicker}>Invito a giocare</Text>
        <Text style={styles.title} numberOfLines={2}>
          {inv.from.name} ti aspetta a {GAME_LABEL[inv.game] ?? 'carte'}
        </Text>
        {msg ? <Text style={styles.msg}>{msg}</Text> : null}
      </View>
      <View style={styles.actions}>
        <Squish accessibilityRole="button" accessibilityLabel={`Entra nella stanza di ${inv.from.name}`} onPress={accept} style={styles.yes}>
          <Text style={styles.yesText}>Entra</Text>
        </Squish>
        <Squish accessibilityRole="button" accessibilityLabel="Rifiuta l’invito" onPress={() => void respondInvite(inv, false)} style={styles.no}>
          <Text style={styles.noText}>No</Text>
        </Squish>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radius.l,
    backgroundColor: colors.shadeStrong,
    borderWidth: 1.5,
    borderColor: colors.mint,
    boxShadow: '0px 16px 36px rgba(30,6,56,0.5)',
  },
  kicker: { fontFamily: fonts.semi, fontSize: 12, lineHeight: 15, color: colors.mint },
  title: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 19, color: colors.text },
  msg: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 15, color: colors.coral, marginTop: 2 },
  actions: { gap: 6 },
  yes: { height: 36, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' },
  yesText: { fontFamily: fonts.display, fontSize: 14, lineHeight: 18, color: colors.ink },
  no: { height: 32, paddingHorizontal: 16, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  noText: { fontFamily: fonts.semi, fontSize: 13, lineHeight: 16, color: colors.textSoft },
});
