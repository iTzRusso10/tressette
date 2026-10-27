import mobileAds, { AdEventType, RewardedAd, RewardedAdEventType, TestIds } from 'react-native-google-mobile-ads';
import { Platform } from 'react-native';
import { setRewardedProvider } from './ads';

/** Your AdMob rewarded unit ids, in app/.env. Until they are set, Google's test ads show. */
const UNIT = (Platform.OS === 'ios' ? process.env.EXPO_PUBLIC_ADMOB_REWARDED_IOS : process.env.EXPO_PUBLIC_ADMOB_REWARDED_ANDROID) || TestIds.REWARDED;

let ad: RewardedAd | null = null;
let loaded = false;

function prepare() {
  ad = RewardedAd.createForAdRequest(UNIT);
  loaded = false;
  ad.addAdEventListener(RewardedAdEventType.LOADED, () => (loaded = true));
  ad.load();
}

/** Starts AdMob and keeps a rewarded video ready. */
export function initAds() {
  mobileAds()
    .initialize()
    .then(() => {
      prepare();
      setRewardedProvider(
        () =>
          new Promise<boolean>(resolve => {
            const cur = ad;
            if (!cur || !loaded) {
              resolve(false);
              return;
            }
            let earned = false;
            const offs = [
              cur.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => (earned = true)),
              cur.addAdEventListener(AdEventType.CLOSED, () => {
                offs.forEach(f => f());
                prepare();
                resolve(earned);
              }),
              cur.addAdEventListener(AdEventType.ERROR, () => {
                offs.forEach(f => f());
                prepare();
                resolve(false);
              }),
            ];
            cur.show().catch(() => {
              offs.forEach(f => f());
              resolve(false);
            });
          }),
      );
    })
    .catch(() => {
      // No ads on this device: the simulated video stays.
    });
}
