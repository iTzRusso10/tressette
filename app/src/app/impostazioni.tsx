import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSync } from '@/meta/sync';
import { useSettings } from '@/state/settings';
import { BackButton, Screen, Section, Toggle } from '@/ui/kit';
import { Text } from '@/ui/Text';
import { colors, fonts, radius, space } from '@/ui/theme';

export default function Settings() {
  const s = useSettings();
  const outdated = useSync(x => x.outdated);
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
            placeholderTextColor={colors.textFaint}
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
            <Toggle label="Animazioni rapide" sub="Carte e turni del computer più svelti." value={s.fast} onChange={fast => s.set({ fast })} />
            <Toggle
              label="Silenzia le reazioni"
              sub="Online non vedi le frasi veloci degli altri giocatori."
              value={s.muteReactions}
              onChange={muteReactions => s.set({ muteReactions })}
            />
          </View>
        </Section>

        <Section title="Regole di Tressette">
          <View style={styles.group}>
            <Toggle label="Accusi" sub="Napoletana, tris e quattro di Assi, Due e Tre." value={s.accusi} onChange={accusi => s.set({ accusi })} />
            <Toggle
              label="Cappotto a perdere"
              sub="Chi prende tutti i punti della mano, ultima compresa, vince subito."
              value={s.cappotto}
              onChange={cappotto => s.set({ cappotto })}
            />
          </View>
        </Section>

        {outdated ? (
          <Section
            title="Progressi online"
            note="Il server dei progressi ha regole più vecchie di questa versione dell'app: finché non viene aggiornato, i progressi nuovi restano su questo telefono."
          />
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { height: 52, justifyContent: 'center', paddingHorizontal: space.l },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: space.xl, paddingBottom: space.xxxl },
  input: {
    height: 52,
    borderRadius: radius.pill,
    paddingHorizontal: space.l,
    fontFamily: fonts.medium,
    fontSize: 17,
    color: colors.text,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassLine,
  },
  group: {
    paddingHorizontal: space.l,
    paddingVertical: space.xs,
    borderRadius: radius.l,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassLine,
  },
});
