import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { GAMES, type GameId } from '@/engine';
import { joinRoom, onlineConfigured } from '@/online/session';
import { useSettings } from '@/state/settings';
import { BackButton, Button, Screen, Section } from '@/ui/kit';
import { Text } from '@/ui/Text';
import { colors, fonts, space } from '@/ui/theme';

export default function Online() {
  const name = useSettings(s => s.name);
  const setName = useSettings(s => s.set);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const join = async () => {
    setError(null);
    setBusy(true);
    const r = await joinRoom(code, name.trim() || 'Amico');
    setBusy(false);
    if (r === 'ok') router.replace({ pathname: '/stanza/[code]', params: { code } });
    else if (r === 'nohost') setError(`Nessuna stanza aperta con il codice ${code}. Controlla il numero con chi ti ha invitato.`);
    else setError('Non riesco a collegarmi. Controlla la connessione e riprova.');
  };

  return (
    <Screen>
      <View style={styles.top}>
        <BackButton />
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text v="h1" accessibilityRole="header">
            Gioca con gli amici
          </Text>
          <Text v="body" style={{ marginTop: space.xs }}>
            Uno crea la stanza, gli altri entrano con il codice. I posti liberi li prende il computer.
          </Text>

          {!onlineConfigured ? (
            <View style={styles.notice}>
              <Text v="label">L’online non è ancora attivo in questa versione.</Text>
              <Text v="small" style={{ marginTop: 4 }}>
                Serve il collegamento al server delle stanze. Intanto puoi giocare contro il computer.
              </Text>
            </View>
          ) : null}

          <Section title="Il tuo nome">
            <TextInput
              value={name}
              onChangeText={v => setName({ name: v.slice(0, 16) })}
              placeholder="Come ti chiamano al tavolo"
              placeholderTextColor={colors.salvia}
              maxLength={16}
              autoCorrect={false}
              style={styles.input}
              accessibilityLabel="Il tuo nome"
            />
          </Section>

          <Section title="Entra in una stanza">
            <View style={styles.joinRow}>
              <TextInput
                value={code}
                onChangeText={v => setCode(v.replace(/\D/g, '').slice(0, 4))}
                placeholder="0000"
                placeholderTextColor="rgba(242,236,224,0.25)"
                keyboardType="number-pad"
                maxLength={4}
                style={[styles.input, styles.code]}
                accessibilityLabel="Codice della stanza"
              />
              <Button label="Entra" onPress={join} disabled={!onlineConfigured || code.length !== 4 || busy} style={{ flex: 1 }} />
            </View>
            {error ? (
              <Text v="small" style={{ color: colors.pompeiChiaro, marginTop: space.s }}>
                {error}
              </Text>
            ) : null}
          </Section>

          <Section title="Crea una stanza">
            <View style={{ gap: space.s }}>
              {(['tressette', 'briscola', 'scopa'] as GameId[]).map(g => (
                <Button
                  key={g}
                  kind="secondary"
                  label={GAMES[g].name}
                  disabled={!onlineConfigured}
                  onPress={() => router.push({ pathname: '/gioca/[game]', params: { game: g, online: '1' } })}
                />
              ))}
            </View>
          </Section>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { height: 52, justifyContent: 'center', paddingHorizontal: space.l },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: space.xl, paddingBottom: space.xxxl },
  notice: {
    marginTop: space.l,
    padding: space.l,
    borderRadius: 16,
    backgroundColor: 'rgba(200,161,90,0.10)',
    borderWidth: 1,
    borderColor: colors.linea,
  },
  input: {
    height: 54,
    borderRadius: 14,
    paddingHorizontal: space.l,
    fontFamily: fonts.ui,
    fontSize: 17,
    color: colors.marmo,
    backgroundColor: 'rgba(242,236,224,0.05)',
    borderWidth: 1,
    borderColor: colors.linea,
  },
  joinRow: { flexDirection: 'row', gap: space.s, alignItems: 'center' },
  code: { width: 128, fontFamily: fonts.display, fontSize: 26, letterSpacing: 6, textAlign: 'center' },
});
