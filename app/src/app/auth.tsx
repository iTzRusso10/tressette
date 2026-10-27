import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import { Screen } from '@/ui/kit';
import { Text } from '@/ui/Text';

// On the web the provider sends the popup back here: hand the result to the page that opened it.
WebBrowser.maybeCompleteAuthSession();

export default function AuthReturn() {
  useEffect(() => {
    const t = setTimeout(() => router.replace('/profilo'), 800);
    return () => clearTimeout(t);
  }, []);
  return (
    <Screen style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Text v="lead">Accesso in corso…</Text>
    </Screen>
  );
}
