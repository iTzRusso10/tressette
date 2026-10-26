// Native layer for the iOS/Android app. Bundled into www/native.js by scripts/build-www.mjs;
// the web version on GitHub Pages never loads it.
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';
import { KeepAwake } from '@capacitor-community/keep-awake';

const native = Capacitor.isNativePlatform();
const platform = Capacitor.getPlatform();
if (native) {
  document.documentElement.classList.add('native', 'native-' + platform);
  // Light status-bar text on the dark table.
  StatusBar.setStyle({ style: Style.Dark }).catch(() => {});

  // Haptics: only on the events that matter to the player, never on every card the computer plays.
  const fx = {
    tick: () => Haptics.impact({ style: ImpactStyle.Light }),
    nope: () => Haptics.notification({ type: NotificationType.Warning }),
    pts: () => Haptics.impact({ style: ImpactStyle.Medium }),
    win: () => Haptics.notification({ type: NotificationType.Success }),
  };
  window.nativeFx = k => { const f = fx[k]; if (f) f().catch(() => {}); };

  // Keep the screen on while the app is open: the computer's turns and online waits would otherwise let it dim.
  const awake = on => (on ? KeepAwake.keepAwake() : KeepAwake.allowSleep()).catch(() => {});
  awake(true);
  App.addListener('appStateChange', ({ isActive }) => awake(isActive));

  // Android back button: close whatever is open, one step at a time, like the on-screen buttons do.
  const shown = id => { const el = document.getElementById(id); return !!el && !el.hidden; };
  const press = id => { const el = document.getElementById(id); if (el) el.click(); return !!el; };
  App.addListener('backButton', () => {
    if (shown('rules')) return press('rulesClose');
    if (shown('settings')) return press('settingsClose');
    if (shown('lastTrick')) return press('ltClose');
    if (shown('quitAsk')) return press('qaNo');
    if (shown('pause')) return press('pResume');
    if (shown('summary') || shown('curtain') || shown('gwait')) return;
    if (shown('menu')) {
      if (shown('setupView')) return press('backHome');
      return App.minimizeApp();
    }
    press('pauseBtn');
  });
}
