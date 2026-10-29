// Le reazioni veloci al tavolo online: il pulsante, il vassoio con le frasi pronte e le bolle accanto ai
// nomi. Le bolle sono piccole, non toccano niente e spariscono da sole; chi vuole le silenzia.
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import type { Match } from '@/engine';
import { reactionById, REACTIONS } from '@/meta/reactions';
import { sendReaction } from '@/online/session';
import { setMuted, setTray, useReactions } from '@/state/reactions';
import { useSettings } from '@/state/settings';
import { sfx } from '@/ui/feedback';
import { Icon } from '@/ui/icons';
import { IconButton } from '@/ui/kit';
import { dur } from '@/ui/motion';
import { Text } from '@/ui/Text';
import { colors, fonts, radius } from '@/ui/theme';
import { sideOf, TAG_H, TAG_W, type Geometry } from './layout';

const BUBBLE_W = 180;

/** Le bolle delle reazioni, ognuna vicino al nome di chi l'ha mandata. */
export function ReactionBubbles({ g, m, viewer }: { g: Geometry; m: Match; viewer: number }) {
  const bubbles = useReactions(s => s.bubbles);
  return (
    <>
      {Object.entries(bubbles).map(([k, b]) => {
        const seat = Number(k);
        if (seat >= m.n) return null;
        const r = reactionById(b.id);
        if (!r) return null;
        const side = sideOf(m, viewer, seat);
        const t = g.tags[side];
        const tagLeft = t.a === 'l' ? t.x : t.a === 'r' ? t.x - TAG_W : t.x - TAG_W / 2;
        // Tu e chi sta di fronte: sopra e sotto il nome, verso il centro. Ai lati: sopra il nome.
        const pos =
          side === 'b'
            ? { left: tagLeft, bottom: g.H - t.y + 6, alignItems: 'flex-start' as const }
            : side === 't'
              ? { left: t.x - BUBBLE_W / 2, top: t.y + TAG_H + 6, alignItems: 'center' as const }
              : side === 'l'
                ? { left: tagLeft, top: t.y - 36, alignItems: 'flex-start' as const }
                : { left: tagLeft + TAG_W - BUBBLE_W, top: t.y - 36, alignItems: 'flex-end' as const };
        return (
          <Animated.View
            key={`${seat}-${b.n}`}
            entering={FadeIn.duration(dur.enter)}
            exiting={FadeOut.duration(dur.exit)}
            pointerEvents="none"
            style={[styles.bubbleWrap, { width: BUBBLE_W }, pos]}
            accessibilityLiveRegion="polite"
          >
            <View style={styles.bubble}>
              <Text allowFontScaling={false} style={styles.bubbleText} numberOfLines={1}>
                {r.text}
              </Text>
            </View>
          </Animated.View>
        );
      })}
    </>
  );
}

/** Il pulsante delle reazioni (solo online), accanto al menu. */
export function ReactionButton() {
  const open = useReactions(s => s.tray);
  return (
    <IconButton label={open ? 'Chiudi le reazioni' : 'Reazioni veloci'} onPress={() => setTray(!open)}>
      <Icon name="smile" size={20} stroke={1.8} color={open ? colors.sun : colors.text} />
    </IconButton>
  );
}

/** Il vassoio con le frasi pronte e il silenzio per gli altri: sopra il tuo nome, vicino al pollice. */
export function ReactionTray({ g }: { g: Geometry }) {
  const open = useReactions(s => s.tray);
  const muted = useReactions(s => s.muted);
  const always = useSettings(s => s.muteReactions);
  const [wait, setWait] = useState(false);
  if (!open) return null;
  const w = Math.min(g.colW - 24, 360);
  const pick = (id: string) => {
    if (sendReaction(id)) {
      sfx('tick');
      setWait(false);
      setTray(false);
    } else setWait(true);
  };
  return (
    <Animated.View entering={FadeIn.duration(dur.quick)} exiting={FadeOut.duration(dur.exit)} style={[styles.tray, { left: g.cx - g.colW / 2 + 12, bottom: g.H - g.tags.b.y + 8, width: w }]}>
      <View style={styles.chips}>
        {REACTIONS.map(r => (
          <Pressable key={r.id} accessibilityRole="button" accessibilityLabel={r.text} onPress={() => pick(r.id)} style={({ pressed }) => [styles.chip, pressed && { opacity: 0.7 }]}>
            <Text allowFontScaling={false} style={styles.chipText}>
              {r.text}
            </Text>
          </Pressable>
        ))}
      </View>
      {wait ? (
        <Text allowFontScaling={false} style={styles.wait}>
          Aspetta un attimo prima della prossima.
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: muted || always }}
        accessibilityLabel="Silenzia le reazioni degli altri in questa partita"
        onPress={() => setMuted(!muted)}
        disabled={always}
        style={styles.mute}
      >
        <Icon name={muted || always ? 'eyeOff' : 'eye'} size={16} color={colors.textSoft} />
        <Text allowFontScaling={false} style={styles.muteText}>
          {always ? 'Reazioni degli altri silenziate nelle impostazioni' : muted ? 'Reazioni degli altri silenziate' : 'Silenzia le reazioni degli altri'}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bubbleWrap: { position: 'absolute', zIndex: 700 },
  bubble: {
    maxWidth: BUBBLE_W,
    paddingHorizontal: 12,
    height: 30,
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: '#FFFFFF',
    boxShadow: '0px 6px 16px rgba(30,6,56,0.35)',
  },
  bubbleText: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 16, color: colors.ink },
  tray: {
    position: 'absolute',
    zIndex: 3000,
    padding: 10,
    gap: 8,
    borderRadius: radius.l,
    backgroundColor: colors.shadeStrong,
    borderWidth: 1,
    borderColor: colors.glassLine,
    boxShadow: '0px 14px 30px rgba(30,6,56,0.45)',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { height: 36, paddingHorizontal: 12, borderRadius: radius.pill, justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' },
  chipText: { fontFamily: fonts.semi, fontSize: 13, lineHeight: 16, color: colors.text },
  wait: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 15, color: colors.sun },
  mute: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36 },
  muteText: { flex: 1, fontFamily: fonts.medium, fontSize: 12, lineHeight: 15, color: colors.textSoft },
});
