import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSettings } from '@/state/settings';
import { BackButton, Screen, Section, Toggle } from '@/ui/kit';
import { Text } from '@/ui/Text';
import { colors, fonts, space } from '@/ui/theme';

export default function Settings() {
  const s = useSettings();
  return (
    <Screen>
      <View style={styles.top}>
        <BackButton />
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text v="h1" accessibilityRole="header">
          Impostazioni
        </Text>

        <Section title="Il tuo nome" note="Lo vedono gli altri giocatori. Al tavolo tu sei sempre «Tu».">
          <TextInput
            value={s.name}
            onChangeText={name => s.set({ name: name.slice(0, 16) })}
            placeholder="Tu"
            placeholderTextColor={colors.salvia}
            maxLength={16}
            autoCorrect={false}
            style={styles.input}
            accessibilityLabel="Il tuo nome"
          />
        </Section>

        <Section title="Al tavolo">
          <View style={styles.group}>
            <Toggle label="Suoni" value={s.sound} onChange={sound => s.set({ sound })} />
            <Toggle label="Vibrazione" sub="Quando giochi, prendi punti o vinci." value={s.haptics} onChange={haptics => s.set({ haptics })} />
            <Toggle label="Partita veloce" sub="Animazioni e turni del computer più rapidi." value={s.fast} onChange={fast => s.set({ fast })} />
          </View>
        </Section>

        <Section title="Regole di Tressette">
          <View style={styles.group}>
            <Toggle label="Accusi" sub="Napoletana, tris e quattro di Assi, Due e Tre." value={s.accusi} onChange={accusi => s.set({ accusi })} />
            <Toggle label="Cappotto a perdere" sub="Chi prende tutti i punti della mano, ultima compresa, vince subito." value={s.cappotto} onChange={cappotto => s.set({ cappotto })} />
          </View>
        </Section>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { height: 52, justifyContent: 'center', paddingHorizontal: space.l },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: space.xl, paddingBottom: space.xxxl },
  input: {
    height: 52,
    borderRadius: 14,
    paddingHorizontal: space.l,
    fontFamily: fonts.ui,
    fontSize: 17,
    color: colors.marmo,
    backgroundColor: 'rgba(242,236,224,0.05)',
    borderWidth: 1,
    borderColor: colors.linea,
  },
  group: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.lineaTenue },
});
