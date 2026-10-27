import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { supabaseConfigured } from '@/lib/supabase';
import { appleAvailable, signIn, type Provider } from '@/meta/auth';
import { Squish } from './kit';
import { Text } from './Text';
import { colors, fonts, radius, space } from './theme';

function ProviderLogo({ p }: { p: Provider }) {
  if (p === 'apple')
    return (
      <Svg width={18} height={20} viewBox="0 0 17 20">
        <Path
          d="M14.1 10.6c0-2.4 2-3.6 2.1-3.7-1.2-1.7-3-1.9-3.6-2-1.5-.2-3 .9-3.8.9-.8 0-2-.9-3.3-.9C3.8 5 2.2 6 1.4 7.5c-1.8 3.1-.5 7.6 1.3 10.1.8 1.2 1.8 2.6 3.1 2.5 1.3-.1 1.7-.8 3.3-.8 1.5 0 2 .8 3.3.8 1.4 0 2.2-1.2 3-2.4.9-1.4 1.3-2.7 1.4-2.8-.1 0-2.7-1-2.7-4.3zM11.6 3.4c.7-.8 1.2-2 1-3.1-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.9-1 3 1.1.1 2.2-.6 2.9-1.4z"
          fill="#FFFFFF"
        />
      </Svg>
    );
  if (p === 'google')
    return (
      <Svg width={18} height={18} viewBox="0 0 48 48">
        <Path
          d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
          fill="#FFC107"
        />
        <Path d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" fill="#FF3D00" />
        <Path d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" fill="#4CAF50" />
        <Path d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" fill="#1976D2" />
      </Svg>
    );
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path
        d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12z"
        fill="#FFFFFF"
      />
    </Svg>
  );
}

const PROVIDER_LABEL: Record<Provider, string> = { apple: 'Continua con Apple', google: 'Continua con Google', facebook: 'Continua con Facebook' };

function ProviderButton({ p, onPress, busy }: { p: Provider; onPress: () => void; busy: boolean }) {
  const st = p === 'apple' ? styles.apple : p === 'google' ? styles.google : styles.facebook;
  return (
    <Squish accessibilityRole="button" accessibilityLabel={PROVIDER_LABEL[p]} disabled={busy} onPress={onPress} style={[styles.provider, st]}>
      <ProviderLogo p={p} />
      <Text style={[styles.providerText, p === 'google' && { color: '#1F1F1F' }]}>{PROVIDER_LABEL[p]}</Text>
    </Squish>
  );
}

/** Sign in with Apple, Google or Facebook, with the reason to do it. Used in the profile and in Amici. */
export function SignInPanel({ title, body }: { title: string; body: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apple, setApple] = useState(false);
  useEffect(() => {
    appleAvailable().then(setApple);
  }, []);
  const go = async (prov: Provider) => {
    setError(null);
    setBusy(true);
    const r = await signIn(prov);
    setBusy(false);
    if (r === 'unavailable') setError('L’accesso non è ancora attivo in questa versione: manca il collegamento al server.');
    else if (typeof r === 'object') setError(`Accesso non riuscito: ${r.error}`);
  };
  return (
    <View style={styles.signIn}>
      <Text v="title">{title}</Text>
      <Text v="body" style={{ marginTop: space.xs }}>
        {body}
      </Text>
      <View style={{ gap: space.s, marginTop: space.l }}>
        {apple || Platform.OS !== 'android' ? <ProviderButton p="apple" busy={busy} onPress={() => go('apple')} /> : null}
        <ProviderButton p="google" busy={busy} onPress={() => go('google')} />
        <ProviderButton p="facebook" busy={busy} onPress={() => go('facebook')} />
      </View>
      {!supabaseConfigured ? (
        <Text v="small" style={{ marginTop: space.m }}>
          L’accesso si attiva quando l’app è collegata al server. Intanto i progressi restano su questo telefono.
        </Text>
      ) : null}
      {error ? (
        <Text v="small" style={{ marginTop: space.m, color: colors.coral }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  signIn: { padding: space.l, borderRadius: radius.l, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.panelLine },
  provider: { height: 52, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  apple: { backgroundColor: '#000000' },
  google: { backgroundColor: '#FFFFFF' },
  facebook: { backgroundColor: '#1877F2' },
  providerText: { fontFamily: fonts.bold, fontSize: 15.5, lineHeight: 20, color: '#FFFFFF' },
});
