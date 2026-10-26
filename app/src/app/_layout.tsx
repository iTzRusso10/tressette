import { BodoniModa_500Medium, BodoniModa_600SemiBold_Italic, BodoniModa_700Bold } from '@expo-google-fonts/bodoni-moda';
import { Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold } from '@expo-google-fonts/figtree';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '@/ui/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ duration: 300, fade: true });
SystemUI.setBackgroundColorAsync(colors.velluto).catch(() => {});

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  // Feels like an app: no page bounce, no text selection, no double-tap zoom, no long-press menu.
  const st = document.createElement('style');
  st.textContent = `html,body{background:${colors.velluto};overscroll-behavior:none;touch-action:manipulation;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent}`;
  document.head.appendChild(st);
  const vp = document.querySelector('meta[name=viewport]');
  vp?.setAttribute('content', 'width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover');
  document.addEventListener('contextmenu', e => e.preventDefault());
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    BodoniModa_700Bold,
    BodoniModa_600SemiBold_Italic,
    BodoniModa_500Medium,
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
  });
  const ready = loaded || !!error;

  useEffect(() => {
    if (ready) SplashScreen.hide();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.velluto }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.velluto },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" options={{ animation: 'fade' }} />
          <Stack.Screen name="tavolo" options={{ animation: 'fade', gestureEnabled: false }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
