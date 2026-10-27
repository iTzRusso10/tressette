import * as Haptics from 'expo-haptics';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { Platform } from 'react-native';
import { useSettings } from '@/state/settings';

/**
 * Suoni e vibrazioni. I file stanno in assets/sounds (li prepara scripts/make-sounds.py, provenienza e
 * licenze in assets/sounds/CREDITS.md).
 *
 * - card     carta posata sul panno (4 varianti)
 * - deal     carta distribuita o pescata che arriva in mano (4 varianti)
 * - shuffle  il mazzo mescolato, lungo quanto l'animazione (normale o veloce)
 * - sweep    la presa: le carte raccolte vanno a chi prende (3 varianti)
 * - pts      punti fatti (accuso, settebello, punti della presa)
 * - tick     tocco dell'interfaccia, molto discreto
 * - nope     mossa non valida, gentile
 * - win      partita vinta
 * - scopa    scopa e cappotto
 * - coin     una moneta (3 varianti: suonate in fila fanno il conteggio delle monete)
 * - trophy   un trofeo o una medaglia vinti
 * - arena    una nuova arena sbloccata
 * - buy      acquisto nel negozio (monete sul banco e conferma)
 * - whoosh   un pannello che entra
 */
export type Sfx =
  | 'card'
  | 'deal'
  | 'shuffle'
  | 'sweep'
  | 'pts'
  | 'tick'
  | 'nope'
  | 'win'
  | 'scopa'
  | 'coin'
  | 'trophy'
  | 'arena'
  | 'buy'
  | 'whoosh';

// Haptics only on what matters to the player: never on every card the computer plays.
const haptic: Partial<Record<Sfx, () => Promise<void>>> = {
  tick: () => Haptics.selectionAsync(),
  nope: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  pts: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  scopa: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  win: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  coin: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  trophy: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  arena: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  buy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
};

const files = {
  card1: require('../../assets/sounds/card1.wav'),
  card2: require('../../assets/sounds/card2.wav'),
  card3: require('../../assets/sounds/card3.wav'),
  card4: require('../../assets/sounds/card4.wav'),
  deal1: require('../../assets/sounds/deal1.wav'),
  deal2: require('../../assets/sounds/deal2.wav'),
  deal3: require('../../assets/sounds/deal3.wav'),
  deal4: require('../../assets/sounds/deal4.wav'),
  shuffle: require('../../assets/sounds/shuffle.wav'),
  shuffleFast: require('../../assets/sounds/shuffle-fast.wav'),
  sweep1: require('../../assets/sounds/sweep1.wav'),
  sweep2: require('../../assets/sounds/sweep2.wav'),
  sweep3: require('../../assets/sounds/sweep3.wav'),
  pts: require('../../assets/sounds/pts.wav'),
  tick: require('../../assets/sounds/tick.wav'),
  nope: require('../../assets/sounds/nope.wav'),
  win: require('../../assets/sounds/win.wav'),
  scopa: require('../../assets/sounds/scopa.wav'),
  coin1: require('../../assets/sounds/coin1.wav'),
  coin2: require('../../assets/sounds/coin2.wav'),
  coin3: require('../../assets/sounds/coin3.wav'),
  trophy: require('../../assets/sounds/trophy.wav'),
  arena: require('../../assets/sounds/arena.wav'),
  buy: require('../../assets/sounds/buy.wav'),
  whoosh: require('../../assets/sounds/whoosh.wav'),
} as const;
type File = keyof typeof files;

/**
 * Ogni suono ha le sue varianti e un piccolo gruppo di player ("voci"), una per variante: due suoni
 * ravvicinati (le carte distribuite, le monete) si sovrappongono invece di tagliarsi a vicenda, e
 * cambiare variante non costa un replace(). I file sono già livellati tra loro: niente volumi qui.
 */
const banks: Record<Sfx, { files: File[]; voices: number }> = {
  card: { files: ['card1', 'card2', 'card3', 'card4'], voices: 4 },
  deal: { files: ['deal1', 'deal2', 'deal3', 'deal4'], voices: 4 },
  shuffle: { files: ['shuffle', 'shuffleFast'], voices: 2 },
  sweep: { files: ['sweep1', 'sweep2', 'sweep3'], voices: 3 },
  pts: { files: ['pts'], voices: 1 },
  tick: { files: ['tick'], voices: 2 },
  nope: { files: ['nope'], voices: 1 },
  win: { files: ['win'], voices: 1 },
  scopa: { files: ['scopa'], voices: 1 },
  coin: { files: ['coin1', 'coin2', 'coin3'], voices: 4 },
  trophy: { files: ['trophy'], voices: 1 },
  arena: { files: ['arena'], voices: 1 },
  buy: { files: ['buy'], voices: 1 },
  whoosh: { files: ['whoosh'], voices: 1 },
};

interface Voice {
  file: File;
  player: AudioPlayer;
  /** Fermo all'inizio del file: play() parte subito, senza seekTo. */
  ready: boolean;
  /** Ultima volta che ha suonato, per scegliere la voce libera da più tempo. */
  at: number;
}

const voices: Partial<Record<Sfx, Voice[]>> = {};
const lastFile: Partial<Record<Sfx, File>> = {};
const web = Platform.OS === 'web';
let loaded = false;

/**
 * Crea tutti i player all'avvio dell'app, così il primo suono non aspetta il caricamento.
 * - iOS: la sessione audio resta attiva tra un suono e l'altro (keepAudioSessionActive), invece di
 *   spegnersi 100 ms dopo ogni suono e riaccendersi al successivo.
 * - Android e iOS: a fine suono il player torna subito all'inizio, così il suono dopo è solo un play().
 * - Web: il file si scarica in memoria prima (downloadFirst), e un elemento audio finito riparte da capo da solo.
 */
export function preloadSfx() {
  if (loaded) return;
  loaded = true;
  // Effects mix with other apps' audio and respect the silent switch.
  setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
  (Object.keys(banks) as Sfx[]).forEach(k => {
    const b = banks[k];
    const list: Voice[] = [];
    for (let i = 0; i < b.voices; i++) {
      const file = b.files[i % b.files.length];
      try {
        const player = createAudioPlayer(files[file], { keepAudioSessionActive: true, updateInterval: 1000, downloadFirst: web });
        const v: Voice = { file, player, ready: true, at: 0 };
        if (!web)
          player.addListener('playbackStatusUpdate', st => {
            if (!st.didJustFinish) return;
            // Android: a fine file il player resta "in riproduzione" e riavvolgendo ripartirebbe da solo.
            player.pause();
            player
              .seekTo(0)
              .then(() => (v.ready = true))
              .catch(() => {});
          });
        list.push(v);
      } catch {
        // No audio on this device: play silently.
      }
    }
    voices[k] = list;
  });
}

/** La voce per il prossimo suono: una ferma all'inizio, con un file diverso dall'ultimo. */
function pick(k: Sfx): Voice | undefined {
  let list = voices[k];
  if (!list?.length) return undefined;
  if (k === 'shuffle') {
    const want: File = useSettings.getState().fast ? 'shuffleFast' : 'shuffle';
    list = list.filter(v => v.file === want);
  }
  const free = list.filter(v => v.ready);
  const fresh = free.filter(v => v.file !== lastFile[k]);
  // Tra le due ferme da più tempo, una a caso: varia, e non taglia una voce che sta ancora suonando.
  const pool = (fresh.length ? fresh : free).sort((a, b) => a.at - b.at).slice(0, 2);
  if (pool.length) return pool[Math.floor(Math.random() * pool.length)];
  // Tutte occupate: si riusa quella partita da più tempo.
  return list.reduce((a, b) => (b.at < a.at ? b : a));
}

function play(k: Sfx) {
  preloadSfx();
  const v = pick(k);
  if (!v) return;
  lastFile[k] = v.file;
  v.at = Date.now();
  const p = v.player;
  try {
    if (web) {
      // Sul web seekTo è sincrono (currentTime = 0) e un elemento finito riparte comunque da capo.
      p.seekTo(0);
      p.play();
    } else if (v.ready) {
      v.ready = false;
      p.play();
    } else {
      // Sta ancora suonando: si riavvolge e si riparte, dopo il riavvolgimento.
      p.seekTo(0)
        .then(() => p.play())
        .catch(() => {});
    }
  } catch {
    // ignore
  }
}

export function sfx(k: Sfx, opts: { haptic?: boolean } = {}) {
  const s = useSettings.getState();
  if (s.sound) play(k);
  if (s.haptics && opts.haptic !== false && Platform.OS !== 'web') haptic[k]?.().catch(() => {});
}

/* ------------------------------------------------------------------ suoni a tempo */

const timers = new Set<ReturnType<typeof setTimeout>>();

/**
 * Fa suonare k tra ms millisecondi (per esempio quando una carta atterra). `when`, se c'è, viene
 * controllata al momento: se non vale più (tavolo lasciato, partita ricominciata) il suono salta.
 * Le impostazioni (suoni, vibrazione) si leggono al momento del suono.
 */
export function sfxAfter(k: Sfx, ms: number, opts: { haptic?: boolean; when?: () => boolean } = {}) {
  if (ms <= 0) {
    if (!opts.when || opts.when()) sfx(k, opts);
    return;
  }
  const id = setTimeout(() => {
    timers.delete(id);
    if (!opts.when || opts.when()) sfx(k, opts);
  }, ms);
  timers.add(id);
}

/** Annulla tutti i suoni a tempo non ancora partiti (uscita dal tavolo, nuova partita). */
export function cancelSfx() {
  timers.forEach(clearTimeout);
  timers.clear();
}

preloadSfx();
