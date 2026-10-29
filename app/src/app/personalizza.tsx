// «Il tuo tavolo»: la personalizzazione con anteprima (docs/direzione-artistica.md §5.16, pacchetto B3).
// Rotta: /personalizza, con ?posto=table|felt|back|frame|avatar&id=… per arrivarci da un oggetto del negozio, da una
// ricompensa o dal profilo (B2 la apre con posto=avatar e posto=frame).
//
// Un palco sotto la lampada dove si provano INSIEME tavolino, panno, dorso, cornice e avatar. Provare non cambia
// niente: la prova vive solo in questa schermata (stato locale). «Usa» chiama equip (o chooseAvatar per l'avatar);
// «Compra» chiama buyItem e, se va, equip: le stesse funzioni e gli stessi rifiuti del negozio. Gli oggetti «in
// arrivo» si vedono nella griglia ma non si provano.
//
// Composizione: telefono in colonna (palco in alto, fisso; schede; griglia che scorre; barra fissa in basso),
// desktop in due colonne (palco a sinistra, schede e griglia a destra) sopra la stessa Sala.
// Movimento: la luce si accende all'apertura (§5.9), lo scambio dei pezzi è una dissolvenza incrociata da 280 ms,
// «Usa» posa il pezzo e timbra il sigillo «In uso» (§5.10). Si anima solo il pezzo provato per ultimo, secondo la
// sua rarità (≤ 4 elementi), fermo con riduci movimento e quando la schermata non è a fuoco.
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View, type ScrollViewInstance } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AVATARS } from '@/meta/avatars';
import { ITEMS, itemOf, itemsOf, type Item, type Slot } from '@/meta/catalog';
import { dayOf } from '@/meta/economy';
import { buyItem, chooseAvatar, equip, useProfile } from '@/meta/profile';
import { priceOf, todayOffer } from '@/meta/shop';
import { useSettings } from '@/state/settings';
import { Moneta } from '@/ui/arte/Ricompensa';
import { Sala } from '@/ui/arte/materiali';
import { dur } from '@/ui/arte/movimento';
import { fontArte, testo, tipografia } from '@/ui/arte/token';
import { BarraAcquisto } from '@/ui/camerino/BarraAcquisto';
import { altezzaCasella, GrigliaOggetti } from '@/ui/camerino/GrigliaOggetti';
import { daComprare, fonteBreve, NOME_POSTO, ordina, POSTI, postoDa, provabile, statoOggetto, type Posto, type Prova } from '@/ui/camerino/logica';
import { Palco } from '@/ui/camerino/Palco';
import { sfx } from '@/ui/feedback';
import { BackButton, Squish } from '@/ui/kit';
import { CountUp } from '@/ui/meta';
import { Text } from '@/ui/Text';

const n = (x: number) => x.toLocaleString('it-IT');

/** Le schede dei cinque posti: testo inciso su una barra di noce, la scelta su ottone. Larghezza fissa. */
function Schede({ posto, onCambia, larghezza }: { posto: Posto; onCambia: (p: Posto) => void; larghezza: number }) {
  const w = (larghezza - 8) / POSTI.length;
  return (
    <View style={[styles.schede, { width: larghezza }]} accessibilityRole="tablist" testID="fisso-schede">
      {POSTI.map(p => {
        const on = p === posto;
        return (
          <Squish
            key={p}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={NOME_POSTO[p]}
            onPress={() => {
              if (on) return;
              sfx('tick');
              onCambia(p);
            }}
            scaleTo={0.95}
          >
            <View style={[styles.scheda, { width: w }, on && styles.schedaOn]}>
              <Text style={[styles.schedaTesto, on && styles.schedaTestoOn]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                {NOME_POSTO[p]}
              </Text>
            </View>
          </Squish>
        );
      })}
    </View>
  );
}

export default function Personalizza() {
  const params = useLocalSearchParams<{ posto?: string; id?: string }>();
  const { width, height } = useWindowDimensions();
  const ins = useSafeAreaInsets();
  const owned = useProfile(s => s.owned);
  const equipped = useProfile(s => s.equipped);
  const coins = useProfile(s => s.coins);
  const avatarUso = useProfile(s => s.meta.avatar);
  const offerState = useProfile(s => s.meta.offer);
  const foto = useProfile(s => s.account?.avatar ?? null);
  const account = useProfile(s => s.account?.name);
  const locale = useSettings(s => s.name.trim());
  const nome = account || locale || 'Tu';
  const offerta = todayOffer(offerState, dayOf(new Date()), owned, ITEMS);

  // La prova parte da quello che usi; il parametro `id` (se provabile) prende il suo posto.
  const posto0 = postoDa(params.posto) ?? 'felt';
  const [prova, setProva] = useState<Prova>(() => {
    const base: Prova = { ...equipped, avatar: avatarUso };
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    if (id && posto0 !== 'avatar' && provabile(itemOf(posto0 as Slot, id))) base[posto0] = id;
    if (id && posto0 === 'avatar' && AVATARS.some(a => a.id === id)) base.avatar = id;
    return base;
  });
  const [posto, setPosto] = useState<Posto>(posto0);
  const [eroe, setEroe] = useState<Posto | null>(postoDa(params.posto) && params.id ? posto0 : null);
  const [posa, setPosa] = useState<{ posto: Posto | null; n: number }>({ posto: null, n: 0 });
  const [sigilloN, setSigilloN] = useState(0);
  const [messaggio, setMessaggio] = useState<{ testo: string; ok: boolean; n: number } | null>(null);
  const msgN = useRef(0);
  const scroll = useRef<ScrollViewInstance>(null);

  const inUso = (p: Posto) => (p === 'avatar' ? avatarUso : equipped[p]);
  const differisce = POSTI.some(p => prova[p] !== inUso(p));

  const items = useMemo(() => (posto === 'avatar' ? [] : ordina(itemsOf(posto), owned, equipped)), [posto, owned, equipped]);
  const avatars = useMemo(() => AVATARS.filter(a => a.id !== 'foto' || foto), [foto]);

  // Lo stato del pezzo in prova nel posto aperto.
  const pezzo: Item | undefined = posto === 'avatar' ? undefined : itemOf(posto, prova[posto]);
  const statoPezzo = posto === 'avatar' ? (prova.avatar === avatarUso ? 'inUso' : 'tuo') : pezzo ? statoOggetto(pezzo, owned, equipped) : 'inUso';
  const prezzo = pezzo ? (priceOf(pezzo, offerta) ?? pezzo.price) : 0;
  // Il sigillo dice se il pezzo del posto aperto è quello in uso o no.
  const sigilloTesto = prova[posto] === inUso(posto) ? 'In uso' : 'In prova';

  const conti = daComprare(prova, owned, offerta);
  const riepilogo = !differisce
    ? 'Il tuo tavolo, come lo vedono gli altri.'
    : conti.items.length
      ? `${conti.items.length === 1 ? '1 pezzo da comprare' : `${conti.items.length} pezzi da comprare`} · ${n(conti.totale)} monete${conti.daVincere.length ? ` · ${conti.daVincere.length} da vincere` : ''}`
      : conti.daVincere.length
        ? `${conti.daVincere.length === 1 ? '1 pezzo' : `${conti.daVincere.length} pezzi`} da vincere: provali, poi vai a prenderli`
        : 'Tutti pezzi tuoi: usa quelli che ti piacciono.';

  const dici = (testo: string, ok: boolean) => {
    msgN.current += 1;
    setMessaggio({ testo, ok, n: msgN.current });
  };

  const scegli = (id: string) => {
    if (prova[posto] === id) return;
    setProva(p => ({ ...p, [posto]: id }));
    setEroe(posto);
    setSigilloN(k => k + 1);
    setMessaggio(null);
  };

  const usa = () => {
    if (posto === 'avatar') chooseAvatar(prova.avatar);
    else equip(posto, prova[posto]);
    sfx('buy', { haptic: true });
    setPosa(p => ({ posto, n: p.n + 1 }));
    setSigilloN(k => k + 1);
    dici(`${NOME_POSTO[posto]} in uso.`, true);
  };

  const compra = () => {
    if (posto === 'avatar' || !pezzo) return;
    const r = buyItem(posto, pezzo.id);
    if (r.ok) {
      equip(posto, pezzo.id);
      sfx('buy', { haptic: true });
      setPosa(p => ({ posto, n: p.n + 1 }));
      setSigilloN(k => k + 1);
      dici(`Comprato e messo in uso: ${pezzo.name}.`, true);
    } else {
      sfx('nope');
      // gli stessi rifiuti del negozio (Negozio.tsx ItemSheet)
      dici(r.why === 'coins' ? `Non hai abbastanza monete: te ne mancano ${n(prezzo - coins)}.` : r.why === 'owned' ? 'È già tuo.' : 'Non si può comprare.', false);
    }
  };

  const torna = () => {
    setProva({ ...equipped, avatar: avatarUso });
    setEroe(null);
    setSigilloN(k => k + 1);
    setMessaggio(null);
  };

  const cambiaPosto = (p: Posto) => {
    setPosto(p);
    setMessaggio(null);
  };

  // Aprendo una scheda, la griglia mostra la riga del pezzo in prova (arrivando dal negozio può stare in fondo).
  const colW = width >= 900 ? Math.min(520, Math.floor(width * 0.4)) : Math.min(width, 560) - 32;
  useEffect(() => {
    const idx = posto === 'avatar' ? avatars.findIndex(a => a.id === prova.avatar) : items.findIndex(i => i.id === prova[posto]);
    const { cols, h, gap } = altezzaCasella(colW, posto);
    const riga = Math.max(0, Math.floor(Math.max(0, idx) / cols));
    scroll.current?.scrollTo({ y: riga <= 1 ? 0 : (riga - 1) * (h + gap) + h * 0.5, animated: false });
    // solo al cambio di scheda (e all'apertura), non a ogni prova
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posto]);

  /* ---------------- impaginazione: tutte misure fisse, dallo schermo */
  const largo = width >= 900;
  const pad = 16;
  const testa = 52;
  const colonna = colW;
  const palcoW = largo ? Math.min(width - colonna - pad * 4, 700) : Math.min(width, 620) - pad * 2;
  const disponibile = height - ins.top - ins.bottom - testa;
  // Sul telefono basso (667) il palco lascia più spazio alla griglia: almeno una fila intera di caselle.
  const palcoH = largo ? Math.min(disponibile - 24, Math.round(palcoW * 0.86)) : Math.round(Math.max(236, Math.min(disponibile * (height < 760 ? 0.44 : 0.47), palcoW * 0.9)));
  const piccolo = posto === 'frame' || posto === 'avatar';

  const barra = (
    <BarraAcquisto
      stato={statoPezzo === 'arrivo' ? 'vinci' : statoPezzo}
      profilo={posto === 'frame' || posto === 'avatar'}
      prezzo={prezzo}
      monete={coins}
      fonte={pezzo ? fonteBreve(pezzo) : ''}
      differisce={differisce}
      riepilogo={riepilogo}
      messaggio={messaggio}
      onUsa={usa}
      onCompra={compra}
      onTorna={torna}
    />
  );
  const griglia = (w: number) => (
    <Animated.View key={posto} entering={FadeIn.duration(dur.quick)} exiting={FadeOut.duration(dur.exit)}>
      <GrigliaOggetti posto={posto} items={items} avatars={avatars} larghezza={w} prova={prova[posto]} onScegli={scegli} owned={owned} equipped={equipped} offerta={offerta} avatar={prova.avatar} avatarUso={avatarUso} nome={nome} foto={foto} />
    </Animated.View>
  );
  const palco = <Palco prova={prova} nome={nome} eroe={eroe} posto={posto} larghezza={palcoW} altezza={palcoH} posa={posa} sigillo={{ testo: sigilloTesto, n: sigilloN }} piccolo={piccolo} foto={foto} />;

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ animation: 'fade' }} />
      <Sala accendi luce={largo ? { cx: 0.3, cy: 0.42, r: 0.6 } : { cx: 0.5, cy: 0.24, r: 0.9 }} />
      <View style={{ paddingTop: ins.top, flex: 1 }}>
        {/* la testata: indietro, il titolo, le monete */}
        <View style={[styles.testa, { height: testa, paddingHorizontal: pad }]}>
          <BackButton onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
          <View style={styles.titoli}>
            <Text style={tipografia.occhiello}>PERSONALIZZA</Text>
            <Text style={styles.titolo} accessibilityRole="header">
              Il tuo tavolo
            </Text>
          </View>
          <View style={styles.monete} accessibilityLabel={`${coins} monete`} testID="fisso-monete">
            <Moneta misura={20} />
            <CountUp value={coins} style={styles.moneteTesto} />
          </View>
        </View>

        {largo ? (
          <View style={[styles.due, { paddingHorizontal: pad, gap: pad * 2 }]}>
            <View style={styles.sinistra}>{palco}</View>
            <View style={{ width: colonna }}>
              <Schede posto={posto} onCambia={cambiaPosto} larghezza={colonna} />
              <ScrollView ref={scroll} style={{ flex: 1, marginTop: 12 }} contentContainerStyle={{ paddingBottom: 16, paddingTop: 4 }} showsVerticalScrollIndicator={false}>
                {griglia(colonna)}
              </ScrollView>
              <View style={[styles.piedeLargo, { paddingBottom: ins.bottom + 12 }]}>{barra}</View>
            </View>
          </View>
        ) : (
          <View style={{ flex: 1, alignItems: 'center' }}>
            <View style={{ width: palcoW, height: palcoH }}>{palco}</View>
            <View style={{ width: colonna, marginTop: 4 }}>
              <Schede posto={posto} onCambia={cambiaPosto} larghezza={colonna} />
            </View>
            <ScrollView ref={scroll} style={{ flex: 1, alignSelf: 'stretch' }} contentContainerStyle={{ alignItems: 'center', paddingTop: 10, paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
              <View style={{ width: colonna }}>{griglia(colonna)}</View>
            </ScrollView>
            <View style={[styles.piede, { width: '100%', paddingBottom: ins.bottom + 10, paddingHorizontal: pad }]}>
              <View style={{ width: colonna, alignSelf: 'center' }}>{barra}</View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#140C0E' },
  testa: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titoli: { flex: 1 },
  titolo: { fontFamily: fontArte.bodoni, fontSize: 22, lineHeight: 27, color: testo.forte },
  monete: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingLeft: 8,
    paddingRight: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(30,19,22,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(230,195,106,0.3)',
  },
  moneteTesto: { fontFamily: fontArte.soraBold, fontSize: 15, color: testo.forte, fontVariant: ['tabular-nums'], minWidth: 44, textAlign: 'right' },
  due: { flex: 1, flexDirection: 'row', paddingTop: 8, width: '100%', maxWidth: 1280, alignSelf: 'center' },
  sinistra: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  piedeLargo: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(230,195,106,0.25)', paddingTop: 4 },
  schede: { flexDirection: 'row', padding: 4, borderRadius: 12, backgroundColor: '#22140C', borderWidth: 1, borderColor: 'rgba(168,122,80,0.35)', boxShadow: 'inset 0px 2px 4px rgba(8,3,4,0.6)' },
  scheda: { height: 40, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  schedaOn: { backgroundColor: '#C9A15A', boxShadow: '0px 1px 2px rgba(8,3,4,0.55), inset 0px 1px 0px rgba(255,243,200,0.7)' },
  schedaTesto: { fontFamily: fontArte.soraSemi, fontSize: 13, color: testo.medio, paddingHorizontal: 2 },
  schedaTestoOn: { color: testo.inchiostro, fontFamily: fontArte.soraBold, textShadowColor: 'rgba(255,240,200,0.45)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 0 },
  piede: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(230,195,106,0.25)', backgroundColor: 'rgba(20,12,14,0.94)' },
});
