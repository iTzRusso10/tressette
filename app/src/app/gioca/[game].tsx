import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { STAKES } from '@/meta/economy';
import { useProfile } from '@/meta/profile';
import { createRoom } from '@/online/session';
import { sendInvite } from '@/meta/social';
import { CPU_NAMES, GAMES, MODE_INFO, targetsFor, type GameId, type Level, type Mode, type Seat } from '@/engine';
import { leagueOf, leagueProgress, placed, RATING } from '@/meta/rating';
import { rulesText } from '@/online/matchmaking';
import { startSearch } from '@/online/search';
import { LeagueCoin } from '@/ui/competition';
import { Bar } from '@/ui/progression';
import { BALANCE } from '@/meta/balance';
import { FRONTS } from '@/game/cardImages';
import { useSettings } from '@/state/settings';
import { startMatch } from '@/state/table';
import { BackButton, Button, Choice, Glass, Screen, Section, Toggle } from '@/ui/kit';
import { Text } from '@/ui/Text';
import { CARD_RATIO, cardRadius, colors, fonts, radius, shadow, space } from '@/ui/theme';

const FAN: Record<GameId, [number, number, number]> = { tressette: [12, 32, 21], briscola: [20, 3, 29], scopa: [16, 6, 26] };

/** Il punteggio del gioco in classificata: la lega, quanto manca alla prossima, o la calibrazione. */
function RankedCard({ game }: { game: GameId }) {
  const r = useProfile(st => st.meta.ratings[game]);
  const ok = placed(r);
  const league = leagueOf(r.r);
  const prog = leagueProgress(r.r);
  return (
    <Glass style={styles.ranked}>
      <LeagueCoin league={league} size={44} dim={!ok} />
      <View style={{ flex: 1 }}>
        <Text v="label">{ok ? league.name : 'In calibrazione'}</Text>
        <Text v="small" style={{ marginTop: 2 }}>
          {ok
            ? `${r.r.toLocaleString('it-IT')} punti${prog ? ` · ${prog[1] - prog[0]} alla lega dopo` : ''}`
            : `${r.n} partite su ${RATING.placement}: poi entri in classifica con la tua lega.`}
        </Text>
        {ok && prog ? <Bar have={prog[0]} need={prog[1]} height={5} style={{ marginTop: 6 }} /> : null}
      </View>
    </Glass>
  );
}

export default function Setup() {
  const { game: raw, online, invite, queue } = useLocalSearchParams<{ game: string; online?: string; invite?: string; queue?: string }>();
  const isOnline = online === '1';
  // La strada: partita veloce e classificata cercano avversari; altrimenti computer o stanza con gli amici.
  const mm = !isOnline && (queue === 'quick' || queue === 'ranked') ? queue : null;
  const [busy, setBusy] = useState(false);
  const [stake, setStake] = useState(0);
  const coins = useProfile(st => st.coins);
  const game: GameId = raw === 'briscola' || raw === 'scopa' ? raw : 'tressette';
  const s = useSettings();
  const prefs = s.games[game];
  const info = GAMES[game];
  const perdere = game === 'tressette' && prefs.mode === 'perdere';
  const targets = targetsFor(game, prefs.mode);

  const play = () => {
    const n = prefs.mode === '2' || (perdere && prefs.perdN === 2) ? 2 : 4;
    const seats: Seat[] = [{ name: s.name.trim() || 'Tu', type: 'human' }, ...CPU_NAMES.slice(0, n - 1).map(name => ({ name, type: 'cpu' as const }))];
    s.set({ lastGame: game });
    startMatch({
      game,
      mode: prefs.mode,
      perdN: prefs.perdN,
      seats,
      level: s.level,
      target: prefs.target,
      accusi: s.accusi,
      cappotto: s.cappotto,
    });
    router.replace('/tavolo');
  };

  const open = async () => {
    setBusy(true);
    try {
      const code = await createRoom(
        { game, mode: prefs.mode, perdN: prefs.perdN, target: prefs.target, level: s.level, accusi: s.accusi, cappotto: s.cappotto, stake },
        s.name.trim() || 'Tu',
      );
      // Aperta dal profilo di un amico («Sfida»): l'invito parte appena la stanza esiste.
      if (invite) void sendInvite(invite, code, game, prefs.mode);
      router.replace({ pathname: '/stanza/[code]', params: invite ? { code, invited: invite } : { code } });
    } catch {
      setBusy(false);
    }
  };

  const search = () => {
    s.set({ lastGame: game });
    void startSearch({ kind: mm!, game, mode: prefs.mode, perdN: prefs.perdN });
    router.replace('/cerca');
  };

  const cw = 50;
  const ch = cw * CARD_RATIO;
  const mini = (c: number, x: number, y: number, r: number) => (
    <View key={c} style={[styles.card, { width: cw, height: ch, borderRadius: cardRadius(cw), left: x, top: y, transform: [{ rotate: `${r}deg` }] }]}>
      <Image source={FRONTS[c]} style={{ width: cw, height: ch }} contentFit="fill" transition={null} />
    </View>
  );
  return (
    <Screen>
      <View style={styles.top}>
        <BackButton />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <View style={{ width: cw * 2.1, height: ch + 14 }} pointerEvents="none">
            {mini(FAN[game][0], 0, 10, -12)}
            {mini(FAN[game][1], cw * 0.5, 2, -1)}
            {mini(FAN[game][2], cw * 1.05, 8, 11)}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>
              {mm === 'quick' ? 'Partita veloce' : mm === 'ranked' ? 'Classificata' : isOnline ? 'Con gli amici' : 'Contro il computer'}
            </Text>
            <Text v="h1" accessibilityRole="header">
              {info.name}
            </Text>
            <Text v="body" style={{ marginTop: space.xs }}>
              {info.desc}
            </Text>
          </View>
        </View>

        <Section title="Modalità" note={MODE_INFO[game][prefs.mode]![1]}>
          <Choice<Mode>
            label="Modalità"
            value={prefs.mode}
            onChange={mode => s.setGame(game, { mode })}
            options={info.modes.map(m => ({ value: m, label: MODE_INFO[game][m]![0] }))}
          />
        </Section>

        {perdere ? (
          <Section title="Giocatori">
            <Choice<2 | 4>
              label="Giocatori"
              value={prefs.perdN}
              onChange={perdN => s.setGame(game, { perdN })}
              options={[
                { value: 2, label: 'In due' },
                { value: 4, label: 'In quattro' },
              ]}
            />
          </Section>
        ) : null}

        {mm ? (
          <Section title="Regole" note="Uguali per tutti i tavoli, così si gioca subito.">
            <View style={styles.fixed}>
              <Text v="label" style={styles.fixedText}>
                {rulesText(mm, game, prefs.mode)}
              </Text>
            </View>
          </Section>
        ) : perdere ? (
          <Section title="Punteggio" note="A perdere chi arriva a 31 perde, e vince chi ha meno punti.">
            <View style={styles.fixed}>
              <Text v="label" style={styles.fixedText}>
                Si perde a 31
              </Text>
            </View>
          </Section>
        ) : (
          <Section title={info.tlabel}>
            <Choice<number>
              label={info.tlabel}
              value={prefs.target}
              onChange={target => s.setGame(game, { target })}
              options={targets.map(t => ({ value: t, label: String(t) }))}
            />
          </Section>
        )}

        {mm === 'ranked' ? (
          <Section title="La tua lega">
            <RankedCard game={game} />
          </Section>
        ) : null}

        {mm ? null : (
          <Section
            title="Computer"
            note={
              isOnline
                ? 'Gioca ai posti che restano liberi.'
                : 'Contro il computer non si vincono trofei né punti della lega: monete, esperienza e missioni sì.'
            }
          >
            <Choice<Level>
              label="Livello del computer"
              value={s.level}
              onChange={level => s.set({ level })}
              options={[
                { value: 'facile', label: 'Facile' },
                { value: 'medio', label: 'Medio' },
                { value: 'difficile', label: 'Esperto' },
              ]}
            />
          </Section>
        )}

        {game === 'tressette' && !mm ? (
          <Glass style={styles.toggles}>
            {perdere ? (
              <Toggle
                label="Cappotto"
                sub="Chi prende tutti i punti della mano, ultima compresa, vince subito."
                value={s.cappotto}
                onChange={cappotto => s.set({ cappotto })}
              />
            ) : (
              <Toggle label="Accusi" sub="Napoletana, tris e quattro di Assi, Due e Tre." value={s.accusi} onChange={accusi => s.set({ accusi })} />
            )}
          </Glass>
        ) : null}

        {isOnline ? (
          <Section
            title="Posta"
            note={
              stake
                ? `Ognuno mette ${stake} monete, chi vince prende il piatto. Hai ${coins.toLocaleString('it-IT')} monete.`
                : 'Partita amichevole, senza monete in gioco.'
            }
          >
            <Choice<number>
              label="Posta"
              value={stake}
              onChange={setStake}
              options={STAKES.map(v => ({ value: v, label: v ? (v >= 1000 ? `${v / 1000}k` : String(v)) : 'Nessuna' }))}
            />
          </Section>
        ) : null}

        {mm ? (
          <Button
            label="Cerca avversari"
            sub={mm === 'quick' ? `Vinci ${BALANCE.trophies.quick.win} trofei, ne perdi ${BALANCE.trophies.quick.loss}` : `Vale per la tua lega a ${info.name}`}
            onPress={search}
            style={{ marginTop: space.xxl }}
          />
        ) : isOnline ? (
          <Button
            label={busy ? 'Apro la stanza…' : 'Crea la stanza'}
            sub="Poi inviti gli amici con il codice"
            onPress={open}
            disabled={busy}
            style={{ marginTop: space.xxl }}
          />
        ) : (
          <Button label="Distribuisci le carte" onPress={play} style={{ marginTop: space.xxl }} />
        )}
        <Button kind="quiet" label={`Come si gioca a ${info.name}`} onPress={() => router.push({ pathname: '/regole/[game]', params: { game } })} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { height: 56, justifyContent: 'center', paddingHorizontal: space.l },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 20, paddingBottom: space.xxl },
  head: { flexDirection: 'row', gap: space.l, alignItems: 'center', marginTop: space.xs },
  card: { position: 'absolute', overflow: 'hidden', backgroundColor: '#FFFFFF', boxShadow: shadow.card },
  fixed: { height: 48, borderRadius: radius.pill, paddingHorizontal: 18, justifyContent: 'center', backgroundColor: '#FFFFFF', alignSelf: 'flex-start' },
  fixedText: { color: colors.ink },
  kicker: { fontFamily: fonts.bold, fontSize: 11.5, lineHeight: 14, color: colors.sun, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 2 },
  ranked: { flexDirection: 'row', alignItems: 'center', gap: space.m, padding: space.l, backgroundColor: colors.panel, borderColor: colors.panelLine },
  toggles: { marginTop: space.xl, paddingHorizontal: space.l, paddingVertical: space.xs, backgroundColor: colors.panel, borderColor: colors.panelLine },
});
