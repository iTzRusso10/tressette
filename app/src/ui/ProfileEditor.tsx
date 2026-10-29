// Il pannello per personalizzare il profilo, in «Lampara» (docs/direzione-artistica.md §5.15, §7 B2): un foglio
// di cuoio scuro che sale dal basso sopra la sala velata. Tre schede:
// - Vetrina: il posto per scegliere le tre cose esposte. In alto la teca com'è adesso (si aggiorna a ogni tocco),
//   sotto i tuoi oggetti più rari e i tuoi achievement come piccole nicchie: tocchi per esporre o togliere, il
//   numero di ceralacca dice il posto.
// - Avatar e Cornice: la scelta rapida di oggi (si salva subito), più il pulsante che porta a /personalizza
//   (la schermata di B3 dove si provano insieme cornice, avatar e tavolo prima di sceglierli).
// Ogni scelta si salva subito (e passa dal server quando sei collegato, con le stesse regole del registro).
import { router, type Href } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ACHIEVEMENTS } from '@/meta/achievements';
import { AVATARS } from '@/meta/avatars';
import { FRAMES, itemByKey, keyOf } from '@/meta/catalog';
import { showcaseOf } from '@/meta/ledger';
import { chooseAvatar, chooseShowcase, equip, progressOf, useProfile } from '@/meta/profile';
import { rarityRank } from '@/meta/rarity';
import { sourcesOf, sourceText } from '@/meta/sources';
import { useSettings } from '@/state/settings';
import { accento, conAlfa, dur, ease, fontArte, LIVELLI, primitivi, Pulsante, rarita, Superficie, testo, tipografia } from './arte';
import { PlayerAvatar } from './avatar';
import { ShowcaseTile } from './competition';
import { sfx } from './feedback';
import { Icon } from './icons';
import { Squish } from './kit';
import { Schede } from './profilo/comuni';
import { Teca } from './profilo/Vetrina';
import { Text } from './Text';

export type EditorTab = 'avatar' | 'cornice' | 'vetrina';

const TIER_RANK = { bronzo: 0, argento: 1, oro: 2, platino: 3 } as const;

/** Il foglio: velo della sala, cuoio scuro con il filo d'ottone in alto. */
function Foglio({ titolo, sotto, children, onChiudi }: { titolo: string; sotto: string; children: ReactNode; onChiudi: () => void }) {
  const ins = useSafeAreaInsets();
  return (
    <View style={[StyleSheet.absoluteFill, styles.radice]}>
      <Animated.View entering={FadeIn.duration(dur.enter)} exiting={FadeOut.duration(dur.exit)} style={[StyleSheet.absoluteFill, { backgroundColor: LIVELLI.sovrapposto.velo }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onChiudi} accessibilityLabel="Chiudi" />
      </Animated.View>
      <Animated.View entering={SlideInDown.duration(dur.enter + 40).easing(ease.in)} exiting={SlideOutDown.duration(dur.exit).easing(ease.out)} accessibilityViewIsModal style={styles.pannello}>
        <Superficie materiale="cuoio" tinta={primitivi.cuoio.medio} impuntura={false} livello={4} raggio={24} style={styles.cuoio}>
          <View style={styles.filoOttone} />
          <View style={styles.maniglia} />
          <ScrollView bounces={false} contentContainerStyle={[styles.dentro, { paddingBottom: ins.bottom + 24 }]} showsVerticalScrollIndicator={false}>
            <View style={styles.testa}>
              <View style={{ flex: 1 }}>
                <Text style={tipografia.titoloSezione} accessibilityRole="header">
                  {titolo}
                </Text>
                <Text style={styles.sotto}>{sotto}</Text>
              </View>
              <Squish accessibilityRole="button" accessibilityLabel="Chiudi il pannello" onPress={onChiudi} scaleTo={0.92} style={styles.chiudi}>
                <Icon name="close" size={18} color={testo.forte} />
              </Squish>
            </View>
            {children}
          </ScrollView>
        </Superficie>
      </Animated.View>
    </View>
  );
}

export function ProfileEditor({ start = 'avatar', onClose }: { start?: EditorTab; onClose: () => void }) {
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<EditorTab>(start);
  const inner = Math.min(width, 560) - 40;
  return (
    <Foglio titolo="Il tuo profilo" sotto="Quello che gli altri vedono di te: in classifica, tra gli amici, nelle sfide." onChiudi={onClose}>
      <Schede<EditorTab>
        etichetta="Cosa cambiare"
        valore={tab}
        onCambia={setTab}
        valori={[
          { valore: 'vetrina', etichetta: 'Vetrina' },
          { valore: 'avatar', etichetta: 'Avatar' },
          { valore: 'cornice', etichetta: 'Cornice' },
        ]}
      />
      <View style={{ height: 18 }} />
      <Animated.View key={tab} entering={FadeIn.duration(dur.quick)}>
        {tab === 'avatar' ? <Avatars width={inner} onClose={onClose} /> : tab === 'cornice' ? <Frames width={inner} onClose={onClose} /> : <ShowcasePicker width={inner} />}
      </Animated.View>
    </Foglio>
  );
}

function useMe() {
  const account = useProfile(s => s.account);
  const local = useSettings(s => s.name.trim());
  const avatar = useProfile(s => s.meta.avatar);
  return { name: account?.name || local || 'Tu', photo: account?.avatar ?? null, avatar };
}

/** Il collegamento alla prova completa (B3): la rotta è fissata in docs/direzione-artistica.md §7. */
function ProvaCompleta({ posto, onClose, testo: t }: { posto: 'avatar' | 'frame'; onClose: () => void; testo: string }) {
  return (
    <Pulsante
      etichetta={t}
      sotto="Con il tuo tavolo, prima di scegliere"
      tipo="secondario"
      onPress={() => {
        onClose();
        router.push(`/personalizza?posto=${posto}` as Href);
      }}
      style={{ marginTop: 18 }}
    />
  );
}

/** Una cella della griglia: velluto incassato; la scelta ha l'anello d'ottone e sale (ombra del primo piano). */
function Cella({ on, children, w, h, etichetta, bloccata }: { on: boolean; children: ReactNode; w: number; h: number; etichetta: string; bloccata?: boolean }) {
  return (
    <View style={[styles.cella, { width: w, height: h }, on && styles.cellaOn]}>
      {children}
      <View style={styles.cellaPiede}>
        {bloccata ? <Icon name="lock" size={11} color={testo.tenue} /> : null}
        <Text style={[styles.cellaNome, on && { color: accento.oro }]} numberOfLines={1}>
          {etichetta}
        </Text>
      </View>
    </View>
  );
}

function Avatars({ width, onClose }: { width: number; onClose: () => void }) {
  const current = useProfile(s => s.meta.avatar);
  const frame = useProfile(s => s.equipped.frame);
  const me = useMe();
  const cols = width > 420 ? 5 : 4;
  const size = Math.floor((width - 8 * (cols - 1)) / cols);
  const list = AVATARS.filter(a => a.id !== 'foto' || me.photo);
  return (
    <View>
      <View style={styles.griglia}>
        {list.map(a => {
          const on = a.id === current;
          return (
            <Squish
              key={a.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={a.name}
              onPress={() => {
                if (on) return;
                sfx('tick');
                chooseAvatar(a.id);
              }}
              scaleTo={0.94}
            >
              <Cella on={on} w={size} h={size + 22} etichetta={a.name}>
                {/* nella griglia degli avatar la cornice è quella semplice: si distinguono i simboli */}
                <PlayerAvatar avatar={a.id} photo={me.photo} name={me.name} frame={on ? frame : 'semplice'} size={size - 16} />
              </Cella>
            </Squish>
          );
        })}
      </View>
      <ProvaCompleta posto="avatar" onClose={onClose} testo="Prova avatar e cornice insieme" />
    </View>
  );
}

function Frames({ width, onClose }: { width: number; onClose: () => void }) {
  const owned = useProfile(s => s.owned);
  const current = useProfile(s => s.equipped.frame);
  const me = useMe();
  const [locked, setLocked] = useState<string | null>(null);
  const cols = width > 420 ? 4 : 3;
  const size = Math.floor((width - 8 * (cols - 1)) / cols);
  // Prima le tue, poi le altre; dentro, dalla più comune alla più rara.
  const list = useMemo(
    () => [...FRAMES].sort((a, b) => Number(owned.includes(keyOf(b))) - Number(owned.includes(keyOf(a))) || rarityRank(a.rarity) - rarityRank(b.rarity)),
    [owned],
  );
  const lockedItem = locked ? FRAMES.find(f => f.id === locked) : null;
  const have = FRAMES.filter(f => owned.includes(keyOf(f))).length;
  return (
    <View>
      <Text style={styles.nota}>{`Ne hai ${have} su ${FRAMES.length}. Le altre si comprano nel negozio o si vincono con leghe, eventi, podi e achievement segreti.`}</Text>
      {lockedItem ? (
        <Animated.View entering={FadeIn.duration(dur.quick)} style={styles.avviso}>
          <Icon name="lock" size={16} color={testo.medio} />
          <Text style={styles.avvisoTesto}>
            {lockedItem.name}: {sourcesOf(keyOf(lockedItem)).map(sourceText).join(' · ') || 'non ancora disponibile'}
          </Text>
        </Animated.View>
      ) : null}
      <View style={styles.griglia}>
        {list.map(f => {
          const mine = owned.includes(keyOf(f));
          const on = f.id === current;
          return (
            <Squish
              key={f.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: on, disabled: !mine }}
              accessibilityLabel={`${f.name}, ${rarita(f.rarity).nome}${mine ? '' : ', da sbloccare'}`}
              onPress={() => {
                if (!mine) return setLocked(f.id);
                setLocked(null);
                if (on) return;
                sfx('tick');
                equip('frame', f.id);
              }}
              scaleTo={0.94}
            >
              <Cella on={on} w={size} h={size + 22} etichetta={f.name} bloccata={!mine}>
                {/* quelle che non hai restano piene, solo un poco in ombra: si deve desiderarle */}
                <View style={!mine && { opacity: 0.72 }}>
                  <PlayerAvatar avatar={me.avatar} photo={me.photo} name={me.name} frame={f.id} size={size - 16} />
                </View>
                <View style={[styles.puntoRarita, { backgroundColor: rarita(f.rarity).colore }]} />
              </Cella>
            </Squish>
          );
        })}
      </View>
      <ProvaCompleta posto="frame" onClose={onClose} testo="Prova le cornici sul tuo tavolo" />
    </View>
  );
}

function ShowcasePicker({ width }: { width: number }) {
  const owned = useProfile(s => s.owned);
  const achievements = useProfile(s => s.achievements);
  const chosen = useProfile(s => s.meta.showcase);
  const me = useMe();
  const [kind, setKind] = useState<'oggetti' | 'achievement'>('oggetti');
  const [msg, setMsg] = useState<string | null>(null);
  // Quello che si vede adesso (scelto, o le tre cose più rare se non hai ancora scelto).
  const visible = chosen.length ? chosen : showcaseOf(progressOf());
  const items = useMemo(
    () =>
      owned
        .map(k => itemByKey(k))
        .filter(i => !!i && i.price > 0)
        .sort((a, b) => rarityRank(b!.rarity) - rarityRank(a!.rarity) || b!.price - a!.price)
        .slice(0, 36)
        .map(i => `item:${keyOf(i!)}`),
    [owned],
  );
  const achs = useMemo(
    () =>
      ACHIEVEMENTS.filter(a => achievements[a.id])
        .sort((a, b) => Number(!!b.hint) - Number(!!a.hint) || TIER_RANK[b.tier] - TIER_RANK[a.tier])
        .slice(0, 36)
        .map(a => `ach:${a.id}`),
    [achievements],
  );
  const list = kind === 'oggetti' ? items : achs;
  const cols = width > 420 ? 4 : 3;
  const w = Math.floor((width - 8 * (cols - 1)) / cols);
  const toggle = (k: string) => {
    const i = visible.indexOf(k);
    if (i >= 0) {
      chooseShowcase(visible.filter(x => x !== k));
      setMsg(null);
    } else if (visible.length >= 3) {
      setMsg('In vetrina stanno tre cose: toccane una scelta per toglierla.');
      return;
    } else {
      chooseShowcase([...visible, k]);
      setMsg(null);
    }
    sfx('tick');
  };
  return (
    <View>
      {/* la teca com'è adesso: la prima cosa scelta sta al centro della luce */}
      <Teca chiavi={visible} larghezza={width} proprio chi={{ avatar: me.avatar, photo: me.photo, name: me.name }} attivo={false} />
      <Text style={[styles.nota, { marginTop: 14 }]}>Scegli fino a tre cose: gli oggetti più rari della tua collezione o gli achievement di cui vai più fiero. La prima è la più in vista: se è epica o più rara, la luce ci passa sopra.</Text>
      <Schede<'oggetti' | 'achievement'>
        etichetta="Cosa esporre"
        valore={kind}
        onCambia={setKind}
        valori={[
          { valore: 'oggetti', etichetta: `Oggetti (${items.length})` },
          { valore: 'achievement', etichetta: `Achievement (${achs.length})` },
        ]}
      />
      {msg ? (
        <Animated.View entering={FadeIn.duration(dur.quick)} style={[styles.avviso, { marginTop: 12, marginBottom: 0 }]}>
          <Text style={styles.avvisoTesto}>{msg}</Text>
        </Animated.View>
      ) : null}
      {list.length === 0 ? (
        <Text style={[styles.nota, { textAlign: 'center', marginVertical: 28 }]}>
          {kind === 'oggetti' ? 'Compra o vinci un oggetto per metterlo in vetrina.' : 'Completa un achievement per metterlo in vetrina.'}
        </Text>
      ) : (
        <View style={[styles.griglia, { marginTop: 14 }]}>
          {list.map(k => {
            const at = visible.indexOf(k);
            return <ShowcaseTile key={k} k={k} width={w} height={Math.round(w * 1.3)} selected={at >= 0 ? at : undefined} onPress={() => toggle(k)} label={at >= 0 ? 'In vetrina: tocca per togliere' : 'Metti in vetrina'} />;
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  radice: { zIndex: 2000, justifyContent: 'flex-end' },
  pannello: { width: '100%', maxWidth: 600, alignSelf: 'center', maxHeight: '90%' },
  cuoio: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  filoOttone: { position: 'absolute', left: 24, right: 24, top: 0, height: 2, backgroundColor: conAlfa(primitivi.ottone.medio, 0.85), borderRadius: 1 },
  maniglia: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, marginTop: 10, backgroundColor: 'rgba(8,3,4,0.55)', boxShadow: '0px 1px 0px rgba(255,220,180,0.15)' },
  dentro: { paddingHorizontal: 20, paddingTop: 12 },
  testa: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  sotto: { marginTop: 4, fontFamily: fontArte.sora, fontSize: 14, lineHeight: 20, color: testo.medio },
  chiudi: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(8,3,4,0.35)' },
  griglia: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 4 },
  cella: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingTop: 4,
    backgroundColor: 'rgba(8,3,4,0.32)',
    boxShadow: 'inset 0px 2px 4px rgba(8,3,4,0.6)',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  cellaOn: { borderColor: primitivi.fogliaOro, backgroundColor: conAlfa(primitivi.fogliaOro, 0.1), boxShadow: '0px 3px 4px rgba(8,3,4,0.5), 8px 24px 36px rgba(8,3,4,0.5)' },
  cellaPiede: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, maxWidth: '92%', marginTop: 2 },
  cellaNome: { flexShrink: 1, fontFamily: fontArte.soraSemi, fontSize: 12, lineHeight: 15, color: testo.medio },
  puntoRarita: { position: 'absolute', top: 7, right: 7, width: 7, height: 7, borderRadius: 4, boxShadow: '0px 1px 1px rgba(8,3,4,0.7)' },
  nota: { fontFamily: fontArte.sora, fontSize: 14, lineHeight: 20, color: testo.medio, marginBottom: 14 },
  avviso: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, marginBottom: 12, borderRadius: 10, backgroundColor: 'rgba(8,3,4,0.4)' },
  avvisoTesto: { flex: 1, fontFamily: fontArte.sora, fontSize: 13, lineHeight: 18, color: testo.forte },
});
