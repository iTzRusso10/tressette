import { create } from 'zustand';

/**
 * Rewarded videos ("guarda un video per raddoppiare"). On the phone this is AdMob, plugged in with
 * `setRewardedProvider` once the AdMob account exists; until then, and on the web, a short simulated
 * video stands in so every flow works the same way.
 */
type Provider = () => Promise<boolean>;
let provider: Provider | null = null;

export function setRewardedProvider(p: Provider | null) {
  provider = p;
}

interface SimState {
  playing: boolean;
  left: number;
}
export const useAdSim = create<SimState>(() => ({ playing: false, left: 0 }));

const SIM_SECONDS = 3;

function simulate(): Promise<boolean> {
  return new Promise(resolve => {
    useAdSim.setState({ playing: true, left: SIM_SECONDS });
    let left = SIM_SECONDS;
    const id = setInterval(() => {
      left--;
      useAdSim.setState({ left });
      if (left <= 0) {
        clearInterval(id);
        useAdSim.setState({ playing: false });
        resolve(true);
      }
    }, 1000);
  });
}

/** Shows a rewarded video; true if it was watched to the end. */
export async function showRewarded(): Promise<boolean> {
  try {
    return provider ? await provider() : await simulate();
  } catch {
    return false;
  }
}
