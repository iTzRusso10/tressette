// Amici: giocare insieme, cercare e aggiungere giocatori, le richieste, chi è online, le rivalità.
// Niente chat: ci si parla al tavolo con le reazioni veloci.
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Share, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ARENAS, arenaByTrophies } from '@/meta/arenas';
import { addFriendByCode, type Friend } from '@/meta/friends';
import { useProfile } from '@/meta/profile';
import { isOnline, searchPlayers, seenText, sendFriendRequest, type PlayerCard, type RequestResult } from '@/meta/social';
import { answerRequest, refreshSocial, useSocial } from '@/state/social';
import { PlayerAvatar } from '@/ui/avatar';
import { sfx } from '@/ui/feedback';
import { Icon, TrophyIcon } from '@/ui/icons';
import { Button, Squish } from '@/ui/kit';
import { dur } from '@/ui/motion';
import { SignInPanel } from '@/ui/SignIn';
import { Text } from '@/ui/Text';
import { colors, fonts, radius, space } from '@/ui/theme';
import { MiniCard } from './GameTiles';
import { Panel, SectionScroll, SectionTitle } from './parts';

function PlayTogether() {
  return (
    <Panel style={styles.together}>
      <View style={styles.fan} pointerEvents="none">
        <MiniCard c={30} w={40} style={{ position: 'absolute', left: 0, top: 8, transform: [{ rotate: '-12deg' }] }} />
        <MiniCard c={16} w={40} style={{ position: 'absolute', left: 22, top: 0, transform: [{ rotate: '0deg' }] }} />
        <MiniCard c={22} w={40} style={{ position: 'absolute', left: 44, top: 8, transform: [{ rotate: '12deg' }] }} />
      </View>
      <Text v="title" style={{ marginTop: space.m }}>
        Gioca con gli amici
      </Text>
      <Text v="body" style={{ marginTop: 2, textAlign: 'center' }}>
        Crea una stanza e invita fino a tre amici: dalla lista qui sotto, con un link o con il codice. I posti liberi li prende il computer.
      </Text>
      <Button label="Crea o entra in una stanza" onPress={() => router.push('/online')} style={{ marginTop: space.l, alignSelf: 'stretch' }} />
    </Panel>
  );
}

const openPlayer = (id: string) => router.push({ pathname: '/giocatore/[id]', params: { id } });
const pubOf = (p: unknown) => (p ?? {}) as { avatar?: string; frame?: string; arena?: number };

/** Una persona: avatar con cornice, nome, una riga sotto, e a destra quello che serve. */
function PersonRow({ id, name, photo, pub, sub, subColor, right }: { id: string; name: string; photo: string | null; pub: unknown; sub: string; subColor?: string; right?: React.ReactNode }) {
  const p = pubOf(pub);
  return (
    <Squish accessibilityRole="button" accessibilityLabel={`${name}. ${sub}. Apri il profilo`} onPress={() => openPlayer(id)} scaleTo={0.98}>
      <View style={styles.person}>
        <PlayerAvatar avatar={p.avatar} photo={photo} name={name} frame={p.frame} size={46} />
        <View style={{ flex: 1 }}>
          <Text v="label" numberOfLines={1}>
            {name}
          </Text>
          <Text v="small" numberOfLines={1} style={subColor ? { color: subColor } : undefined}>
            {sub}
          </Text>
        </View>
        {right ?? <Icon name="chevron" size={18} color={colors.textFaint} />}
      </View>
    </Squish>
  );
}

function FriendRow({ f }: { f: Friend }) {
  const online = isOnline(f.last_seen);
  const arena = pubOf(f.pub).arena;
  const where = arena !== undefined ? ARENAS[Math.min(ARENAS.length - 1, arena)]?.name : arenaByTrophies(f.cups ?? 0).name;
  return (
    <PersonRow
      id={f.id}
      name={f.name}
      photo={f.avatar}
      pub={f.pub}
      sub={online ? `Online adesso · ${where}` : `${seenText(f.last_seen)} · ${where}`}
      subColor={online ? colors.mint : undefined}
      right={
        <View style={styles.cups}>
          <TrophyIcon size={16} />
          <Text style={styles.cupsText}>{(f.cups ?? 0).toLocaleString('it-IT')}</Text>
        </View>
      }
    />
  );
}

const REQUEST_TEXT: Record<RequestResult, string> = {
  sent: 'Richiesta mandata',
  friends: 'Ora siete amici',
  already: 'Già mandata',
  self: 'Sei tu',
  notfound: 'Non trovato',
  limit: 'Troppe richieste oggi',
  error: 'Riprova',
};

/** Cerca un giocatore per nome (almeno tre lettere) e mandagli una richiesta di amicizia. */
function Search() {
  const [q, setQ] = useState('');
  const [found, setFound] = useState<{ q: string; list: (PlayerCard & { friend: boolean })[] } | null>(null);
  const query = q.trim();
  // Si mostrano solo i risultati della ricerca che corrisponde a quello che c'è scritto adesso.
  const res = query.length >= 3 && found?.q === query ? found.list : null;
  const [sent, setSent] = useState<Record<string, RequestResult>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (query.length < 3) return;
    // Si cerca quando smetti di scrivere, non a ogni lettera.
    timer.current = setTimeout(() => {
      searchPlayers(query)
        .then(list => setFound({ q: query, list }))
        .catch(() => setFound({ q: query, list: [] }));
    }, 400);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query]);
  const add = async (id: string) => {
    const r = await sendFriendRequest(id);
    if (r === 'sent' || r === 'friends') sfx('pts');
    setSent(s => ({ ...s, [id]: r }));
    if (r === 'friends') void refreshSocial();
  };
  return (
    <View style={{ marginTop: space.l }}>
      <View style={styles.searchBox}>
        <Icon name="search" size={18} color={colors.textSoft} />
        <TextInput
          value={q}
          onChangeText={v => setQ(v.slice(0, 24))}
          placeholder="Cerca un giocatore per nome"
          placeholderTextColor="rgba(255,255,255,0.55)"
          autoCorrect={false}
          autoCapitalize="none"
          style={styles.searchInput}
          accessibilityLabel="Cerca un giocatore per nome"
        />
        {q ? (
          <Squish accessibilityRole="button" accessibilityLabel="Cancella la ricerca" onPress={() => setQ('')} hitSlop={8}>
            <Icon name="close" size={18} color={colors.textSoft} />
          </Squish>
        ) : null}
      </View>
      {q.trim().length > 0 && q.trim().length < 3 ? <Text v="small" style={styles.hint}>Scrivi almeno tre lettere.</Text> : null}
      {res ? (
        <Animated.View entering={FadeIn.duration(dur.enter)} style={{ gap: space.s, marginTop: space.s }}>
          {res.length === 0 ? (
            <Text v="small" style={styles.hint}>
              Nessun giocatore con questo nome.
            </Text>
          ) : (
            res.map(p => (
              <PersonRow
                key={p.id}
                id={p.id}
                name={p.name}
                photo={p.photo}
                pub={p.pub}
                sub={`${arenaByTrophies(p.cups).name} · ${p.cups.toLocaleString('it-IT')} trofei`}
                right={
                  p.friend || sent[p.id] ? (
                    <Text v="small" style={{ color: colors.mint }}>
                      {p.friend ? 'Amico' : REQUEST_TEXT[sent[p.id]]}
                    </Text>
                  ) : (
                    <Button kind="secondary" label="Aggiungi" onPress={() => add(p.id)} style={{ minHeight: 40, paddingHorizontal: 14 }} />
                  )
                }
              />
            ))
          )}
        </Animated.View>
      ) : null}
    </View>
  );
}

function Requests() {
  const requests = useSocial(s => s.requests);
  if (!requests.length) return null;
  return (
    <View>
      <Text style={styles.listTitle}>Richieste di amicizia</Text>
      <View style={{ gap: space.s }}>
        {requests.map(r => (
          <PersonRow
            key={r.id}
            id={r.id}
            name={r.name}
            photo={r.photo}
            pub={r.pub}
            sub="Vuole diventare tuo amico"
            right={
              <View style={styles.reqButtons}>
                <Squish accessibilityRole="button" accessibilityLabel={`Accetta ${r.name}`} onPress={() => answerRequest(r.id, true)} style={styles.accept}>
                  <Icon name="check" size={18} color={colors.ink} stroke={2.6} />
                </Squish>
                <Squish accessibilityRole="button" accessibilityLabel={`Rifiuta ${r.name}`} onPress={() => answerRequest(r.id, false)} style={styles.decline}>
                  <Icon name="close" size={16} color={colors.text} stroke={2.2} />
                </Squish>
              </View>
            }
          />
        ))}
      </View>
    </View>
  );
}

function Rivals() {
  const rivals = useSocial(s => s.rivals);
  if (!rivals.length) return null;
  return (
    <View>
      <Text style={styles.listTitle}>Le tue sfide</Text>
      <View style={{ gap: space.s }}>
        {rivals.slice(0, 5).map(r => (
          <PersonRow
            key={r.id}
            id={r.id}
            name={r.name}
            photo={r.photo}
            pub={r.pub}
            sub={`${r.games} ${r.games === 1 ? 'sfida' : 'sfide'} online`}
            right={
              <Text style={[styles.h2h, r.myWins > r.theirWins ? { color: colors.mint } : r.myWins < r.theirWins ? { color: colors.coral } : null]}>
                {r.myWins}–{r.theirWins}
              </Text>
            }
          />
        ))}
      </View>
    </View>
  );
}

export function Amici({ active }: { active: boolean }) {
  const account = useProfile(s => s.account);
  const friendCode = useProfile(s => s.friendCode);
  const friends = useSocial(s => s.friends);
  const error = useSocial(s => s.error);
  const [code, setCode] = useState('');
  const [addMsg, setAddMsg] = useState<string | null>(null);

  useEffect(() => {
    if (active && account) void refreshSocial();
  }, [active, account]);

  const add = async () => {
    setAddMsg(null);
    const r = await addFriendByCode(code);
    setAddMsg(r === 'ok' ? 'Amico aggiunto.' : r === 'self' ? 'È il tuo codice.' : r === 'notfound' ? 'Nessun giocatore con questo codice.' : 'Non riesco a collegarmi, riprova.');
    if (r === 'ok') {
      sfx('pts');
      setCode('');
      void refreshSocial();
    }
  };

  // Prima chi è online, poi chi si è visto da poco.
  const sorted = friends ? [...friends].sort((a, b) => Number(isOnline(b.last_seen)) - Number(isOnline(a.last_seen))) : null;
  const online = sorted?.filter(f => isOnline(f.last_seen)).length ?? 0;

  return (
    <SectionScroll>
      <SectionTitle title="Amici" sub="Gioca con loro, sfidali e confronta i trofei." />
      <PlayTogether />
      {account ? (
        <>
          <Search />
          <Requests />
          <Text style={styles.listTitle}>{sorted?.length ? `I tuoi amici · ${online ? `${online} online` : 'nessuno online'}` : 'I tuoi amici'}</Text>
          <View style={{ gap: space.s }}>
            {sorted === null ? (
              <ActivityIndicator color={colors.text} style={{ marginTop: space.l }} />
            ) : sorted.length === 0 ? (
              <View style={styles.empty}>
                <Icon name="friends" size={28} color={colors.textSoft} />
                <Text v="body" style={{ textAlign: 'center' }}>
                  {error
                    ? 'Non riesco a caricare gli amici. Controlla la connessione.'
                    : 'Cerca i tuoi amici per nome o aggiungili con il loro codice. Se accedi con Facebook compaiono anche gli amici che giocano.'}
                </Text>
              </View>
            ) : (
              sorted.map(f => <FriendRow key={f.id} f={f} />)
            )}
          </View>
          <Rivals />
          <Text style={styles.listTitle}>Con il codice</Text>
          <Panel style={styles.codeBox}>
            <View style={{ flex: 1 }}>
              <Text v="small" style={{ color: colors.textSoft }}>
                Il tuo codice amico
              </Text>
              <Text style={styles.code}>{friendCode ?? '······'}</Text>
            </View>
            <Button
              kind="secondary"
              label="Condividi"
              onPress={() => Share.share({ message: `Aggiungimi su Napoletane con il codice ${friendCode ?? ''}` }).catch(() => {})}
              style={{ minHeight: 44, paddingHorizontal: 16 }}
            />
          </Panel>
          <View style={styles.addRow}>
            <TextInput
              value={code}
              onChangeText={v =>
                setCode(
                  v
                    .replace(/[^a-zA-Z0-9]/g, '')
                    .slice(0, 8)
                    .toUpperCase(),
                )
              }
              placeholder="Codice di un amico"
              placeholderTextColor="rgba(255,255,255,0.45)"
              autoCapitalize="characters"
              autoCorrect={false}
              style={styles.input}
              accessibilityLabel="Codice di un amico"
            />
            <Button label="Aggiungi" onPress={add} disabled={code.length < 4} style={{ minHeight: 50, paddingHorizontal: 18 }} />
          </View>
          {addMsg ? (
            <Text v="small" style={{ marginTop: space.xs }}>
              {addMsg}
            </Text>
          ) : null}
        </>
      ) : (
        <View style={{ marginTop: space.l }}>
          <SignInPanel
            title="Trova i tuoi amici"
            body="Con un account cerchi gli amici per nome, vedi chi è online, li inviti al tavolo, tieni il conto delle sfide e ritrovi i progressi su ogni telefono."
          />
        </View>
      )}
    </SectionScroll>
  );
}

const styles = StyleSheet.create({
  together: { alignItems: 'center' },
  fan: { width: 84, height: 72 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s,
    height: 50,
    paddingHorizontal: space.l,
    borderRadius: radius.pill,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassLine,
  },
  searchInput: { flex: 1, height: 48, fontFamily: fonts.medium, fontSize: 16, color: colors.text },
  hint: { marginTop: space.xs, paddingHorizontal: space.s },
  person: { flexDirection: 'row', alignItems: 'center', gap: space.m, padding: space.m, borderRadius: radius.l, backgroundColor: colors.panel },
  reqButtons: { flexDirection: 'row', gap: 6 },
  accept: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' },
  decline: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  h2h: { fontFamily: fonts.display, fontSize: 17, lineHeight: 21, color: colors.text, fontVariant: ['tabular-nums'] },
  codeBox: { flexDirection: 'row', alignItems: 'center', gap: space.m },
  code: { fontFamily: fonts.display, fontSize: 26, lineHeight: 32, letterSpacing: 3, color: colors.sun },
  addRow: { flexDirection: 'row', gap: space.s, marginTop: space.m, alignItems: 'center' },
  input: {
    flex: 1,
    height: 50,
    borderRadius: radius.pill,
    paddingHorizontal: space.l,
    fontFamily: fonts.semi,
    fontSize: 16,
    letterSpacing: 2,
    color: colors.text,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassLine,
  },
  listTitle: { fontFamily: fonts.semi, fontSize: 13.5, lineHeight: 18, color: colors.textSoft, marginTop: space.xl, marginBottom: space.s },
  cups: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cupsText: { fontFamily: fonts.display, fontSize: 15, lineHeight: 19, color: colors.text, fontVariant: ['tabular-nums'] },
  empty: { alignItems: 'center', gap: space.s, padding: space.l, borderRadius: radius.l, backgroundColor: 'rgba(255,255,255,0.06)' },
});
