import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { GAMES, targetsFor, type GameId, type Level, type Mode } from '@/engine';

export interface GamePrefs {
  mode: Mode;
  target: number;
  /** A perdere: players at the table. */
  perdN: 2 | 4;
}

export interface Settings {
  name: string;
  level: Level;
  games: Record<GameId, GamePrefs>;
  accusi: boolean;
  cappotto: boolean;
  sound: boolean;
  haptics: boolean;
  /** Faster animations and computer turns. */
  fast: boolean;
  /** Online: non mostrare le reazioni veloci degli altri. */
  muteReactions: boolean;
  lastGame: GameId;
  set: (patch: Partial<Omit<Settings, 'set' | 'setGame'>>) => void;
  setGame: (game: GameId, patch: Partial<GamePrefs>) => void;
}

export const useSettings = create<Settings>()(
  persist(
    set => ({
      name: '',
      level: 'medio',
      games: {
        tressette: { mode: '2', target: 21, perdN: 4 },
        briscola: { mode: '2', target: 1, perdN: 4 },
        scopa: { mode: '2', target: 11, perdN: 4 },
      },
      accusi: true,
      cappotto: true,
      sound: true,
      haptics: true,
      fast: false,
      muteReactions: false,
      lastGame: 'tressette',
      set: patch => set(patch),
      setGame: (game, patch) =>
        set(s => {
          const next = { ...s.games[game], ...patch };
          if (!GAMES[game].modes.includes(next.mode)) next.mode = GAMES[game].modes[0];
          const targets = targetsFor(game, next.mode);
          if (!targets.includes(next.target))
            next.target = next.mode === 'perdere' ? 31 : GAMES[game].targets.includes(s.games[game].target) ? s.games[game].target : targets[0];
          if (!targets.includes(next.target)) next.target = targets[0];
          return { games: { ...s.games, [game]: next }, lastGame: game };
        }),
    }),
    {
      name: 'napoletane.impostazioni.v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ set: _s, setGame: _g, ...rest }) => rest,
    },
  ),
);
