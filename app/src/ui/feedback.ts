import * as Haptics from 'expo-haptics';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { Platform } from 'react-native';
import { useSettings } from '@/state/settings';

export type Sfx = 'card' | 'deal' | 'sweep' | 'pts' | 'tick' | 'nope' | 'win' | 'scopa';

// Haptics only on what matters to the player: never on every card the computer plays.
const haptic: Partial<Record<Sfx, () => Promise<void>>> = {
  tick: () => Haptics.selectionAsync(),
  nope: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  pts: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  scopa: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  win: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
};

const sources: Record<Sfx, number> = {
  card: require('../../assets/sounds/card.wav'),
  deal: require('../../assets/sounds/deal.wav'),
  sweep: require('../../assets/sounds/sweep.wav'),
  pts: require('../../assets/sounds/pts.wav'),
  tick: require('../../assets/sounds/tick.wav'),
  nope: require('../../assets/sounds/nope.wav'),
  win: require('../../assets/sounds/win.wav'),
  scopa: require('../../assets/sounds/scopa.wav'),
};

const players: Partial<Record<Sfx, AudioPlayer>> = {};
let ready = false;

function init() {
  if (ready) return;
  ready = true;
  // Effects mix with other apps' audio and respect the silent switch.
  setAudioModeAsync({ playsInSilentMode: false }).catch(() => {});
  (Object.keys(sources) as Sfx[]).forEach(k => {
    try {
      const p = createAudioPlayer(sources[k]);
      p.volume = k === 'tick' ? 0.5 : 0.8;
      players[k] = p;
    } catch {
      // No audio on this device: play silently.
    }
  });
}

export function sfx(k: Sfx, opts: { haptic?: boolean } = {}) {
  const s = useSettings.getState();
  if (s.sound) {
    init();
    const p = players[k];
    if (p) {
      try {
        p.seekTo(0);
        p.play();
      } catch {
        // ignore
      }
    }
  }
  if (s.haptics && opts.haptic !== false && Platform.OS !== 'web') haptic[k]?.().catch(() => {});
}
