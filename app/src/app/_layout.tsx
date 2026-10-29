import { Sora_400Regular, Sora_500Medium, Sora_600SemiBold, Sora_700Bold, Sora_800ExtraBold } from '@expo-google-fonts/sora';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initAds } from '@/meta/admob';
import { initAuth } from '@/meta/auth';
import { startPresence } from '@/state/social';
import { Overlays } from '@/ui/Overlays';
import { colors } from '@/ui/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ duration: 300, fade: true });
SystemUI.setBackgroundColorAsync(colors.night).catch(() => {});
initAuth();
initAds();
startPresence();

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  // Feels like an app: no page bounce, no text selection, no double-tap zoom, no long-press menu.
  const st = document.createElement('style');
  st.textContent = `html,body{background:${colors.night};overscroll-behavior:none;touch-action:manipulation;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent}`;
  document.head.appendChild(st);
  const vp = document.querySelector('meta[name=viewport]');
  vp?.setAttribute('content', 'width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover');
  document.addEventListener('contextmenu', e => e.preventDefault());
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Sora_400Regular,
    Sora_500Medium,
    Sora_600SemiBold,
    Sora_700Bold,
    Sora_800ExtraBold,
  });
  const ready = loaded || !!error;

  useEffect(() => {
    if (ready) SplashScreen.hide();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.night }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.night },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" options={{ animation: 'fade' }} />
          <Stack.Screen name="tavolo" options={{ animation: 'fade', gestureEnabled: false }} />
          <Stack.Screen name="cerca" options={{ animation: 'fade' }} />
        </Stack>
        <Overlays />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
