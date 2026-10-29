// L'accesso dentro il profilo «Lampara»: lo stesso SignInPanel (stesse funzioni di meta/auth: Apple solo dove c'è,
// Google, Facebook, il messaggio d'errore e quello del server non collegato), ma su un pannello di cuoio sotto la
// lampada invece che sul vetro viola. I pulsanti dei tre servizi restano nei colori dei loro marchi, come chiedono
// le loro regole. SignIn.tsx (usato anche da Amici) non cambia.
//
// Export: `Accesso` { titolo, testo }
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { supabaseConfigured } from '@/lib/supabase';
import { appleAvailable, signIn, type Provider } from '@/meta/auth';
import { Squish } from '../kit';
import { Text } from '../Text';
import { fontArte, stato, Superficie, testo, tipografia } from '../arte';

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

const ETICHETTA: Record<Provider, string> = { apple: 'Continua con Apple', google: 'Continua con Google', facebook: 'Continua con Facebook' };
const FONDO: Record<Provider, string> = { apple: '#000000', google: '#FFFFFF', facebook: '#1877F2' };

function Servizio({ p, onPress, occupato }: { p: Provider; onPress: () => void; occupato: boolean }) {
  return (
    <Squish accessibilityRole="button" accessibilityLabel={ETICHETTA[p]} disabled={occupato} onPress={onPress} style={[styles.servizio, { backgroundColor: FONDO[p] }]}>
      <ProviderLogo p={p} />
      <Text style={[styles.servizioTesto, p === 'google' && { color: '#1F1F1F' }]}>{ETICHETTA[p]}</Text>
    </Squish>
  );
}

export function Accesso({ titolo, testo: t }: { titolo: string; testo: string }) {
  const [occupato, setOccupato] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [apple, setApple] = useState(false);
  useEffect(() => {
    appleAvailable().then(setApple);
  }, []);
  const vai = async (p: Provider) => {
    setErrore(null);
    setOccupato(true);
    const r = await signIn(p);
    setOccupato(false);
    if (r === 'unavailable') setErrore('L’accesso non è ancora attivo in questa versione: manca il collegamento al server.');
    else if (typeof r === 'object') setErrore(`Accesso non riuscito: ${r.error}`);
  };
  return (
    <Superficie materiale="cuoio" livello={2} raggio={14} style={styles.pannello}>
      <Text style={[tipografia.titoloSezione, { fontSize: 20, lineHeight: 26 }]}>{titolo}</Text>
      <Text style={styles.testo}>{t}</Text>
      <View style={styles.servizi}>
        {apple || Platform.OS !== 'android' ? <Servizio p="apple" occupato={occupato} onPress={() => vai('apple')} /> : null}
        <Servizio p="google" occupato={occupato} onPress={() => vai('google')} />
        <Servizio p="facebook" occupato={occupato} onPress={() => vai('facebook')} />
      </View>
      {!supabaseConfigured ? <Text style={styles.nota}>L’accesso si attiva quando l’app è collegata al server. Intanto i progressi restano su questo telefono.</Text> : null}
      {errore ? <Text style={[styles.nota, { color: stato.errore }]}>{errore}</Text> : null}
    </Superficie>
  );
}

const styles = StyleSheet.create({
  pannello: { padding: 18 },
  testo: { marginTop: 6, fontFamily: fontArte.sora, fontSize: 14, lineHeight: 21, color: testo.forte },
  servizi: { gap: 10, marginTop: 16 },
  servizio: { height: 50, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '0px 2px 3px rgba(8,3,4,0.5), 5px 14px 22px rgba(8,3,4,0.35)' },
  servizioTesto: { fontFamily: fontArte.soraBold, fontSize: 15.5, lineHeight: 20, color: '#FFFFFF' },
  nota: { marginTop: 12, fontFamily: fontArte.sora, fontSize: 13, lineHeight: 18, color: testo.medio },
});
