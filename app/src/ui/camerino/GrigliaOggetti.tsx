// La griglia degli oggetti del camerino: le miniature di un posto (tavolini, panni, dorsi, cornici, avatar), prima
// i tuoi, poi da comprare, poi da vincere (con «come»), poi in arrivo (visibili, non provabili).
//
// Export:
// - `GrigliaOggetti` { posto, items (già ordinati), larghezza, prova (l'id in prova per questo posto), onScegli,
//                      owned, equipped, offerta, avatar (per le cornici), nome, foto }
//   Ogni casella è una scheda su legno scuro con il bordo del metallo della sua rarità (peltro, rame, argento,
//   argento dorato, oro, oro rosa: la scala si legge anche senza colori, dallo spessore del filo e dalla targhetta),
//   la miniatura ferma, il nome e sotto il prezzo, «Tuo», «In uso», «Arena 14» o «In arrivo».
//   La selezionata sale di livello (ombra 4) e un anello d'ottone le si disegna intorno (dur.quick, §5.10): niente
//   si sposta e niente si ingrandisce. Nessuna animazione ambientale nella griglia (§5.7: solo il pezzo sul palco).
//   Toccare un «in arrivo» non lo prova: il lucchetto fa un mezzo passo e torna (il «no» di §5.10).
import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import type { Avatar } from '@/meta/avatars';
import { keyOf, type Item, type Slot } from '@/meta/catalog';
import { RARITY_NAMES } from '@/meta/rarity';
import { priceOf } from '@/meta/shop';
import { AvatarCornice } from '@/ui/avatar';
import { BackPreview, ComingPreview, FondoRarita, TablePreview, TavolinoCampione } from '@/ui/cosmetics';
import { sfx } from '@/ui/feedback';
import { Icon } from '@/ui/icons';
import { Squish } from '@/ui/kit';
import { Moneta } from '@/ui/arte/Ricompensa';
import { rarita } from '@/ui/arte/rarita';
import { dur, ease } from '@/ui/arte/movimento';
import { ombra } from '@/ui/arte/luce';
import { fontArte, primitivi, stato as statoCol, testo } from '@/ui/arte/token';
import { CARD_RATIO } from '@/ui/theme';
import { Text } from '@/ui/Text';
import { fonteBreve, statoOggetto, type Posto, type StatoOggetto } from './logica';

const n = (x: number) => x.toLocaleString('it-IT');
const PIEDE = 44;

function Miniatura({ item, w, h, avatar, nome, foto, equipped }: { item: Item; w: number; h: number; avatar: string; nome: string; foto: string | null; equipped: Record<Slot, string> }) {
  if (item.status === 'coming') return <ComingPreview item={item} width={w} height={h} />;
  if (item.slot === 'frame') return <AvatarCornice avatar={avatar} photo={foto} name={nome} frame={item.id} size={Math.floor(Math.min(w, h))} vivo={false} />;
  if (item.slot === 'back') return <BackPreview id={item.id} width={Math.floor(Math.min(w * 0.62, (h - 3) / CARD_RATIO))} />;
  // Il tavolino come campione di materiale (sponda grande e illuminata, panno neutro): legno, cuoio, vetro e metallo
  // si distinguono a colpo d'occhio. Il panno si mostra sul tavolino in uso.
  if (item.slot === 'table') return <TavolinoCampione table={item.id} width={w} height={Math.round(w * 0.6)} />;
  return <TablePreview table={equipped.table} felt={item.id} width={w} height={Math.round(w * 0.6)} />;
}

function Piede({ st, item, offerta }: { st: StatoOggetto; item: Item; offerta: Item | null }) {
  if (st === 'inUso')
    return (
      <View style={styles.riga}>
        <Icon name="check" size={13} color={primitivi.fogliaOro} stroke={2.6} />
        <Text style={[styles.stato, { color: primitivi.fogliaOro }]}>In uso</Text>
      </View>
    );
  if (st === 'tuo') return <Text style={[styles.stato, { color: statoCol.successo }]}>Tuo</Text>;
  if (st === 'arrivo') return <Text style={[styles.stato, { color: testo.tenue }]}>In arrivo</Text>;
  if (st === 'vinci')
    return (
      <View style={styles.riga}>
        <Icon name="lock" size={12} color={testo.tenue} />
        <Text style={styles.stato} numberOfLines={1}>
          {fonteBreve(item)}
        </Text>
      </View>
    );
  const p = priceOf(item, offerta) ?? item.price;
  return (
    <View style={styles.riga}>
      <Moneta misura={14} />
      <Text style={styles.prezzo}>{n(p)}</Text>
    </View>
  );
}

/** Una casella. */
const Casella = memo(function Casella({
  item,
  avatarItem,
  w,
  scelto,
  owned,
  equipped,
  offerta,
  avatar,
  avatarUso,
  nome,
  foto,
  onScegli,
}: {
  item?: Item;
  avatarItem?: Avatar;
  w: number;
  scelto: boolean;
  owned: readonly string[];
  equipped: Record<Slot, string>;
  offerta: Item | null;
  avatar: string;
  avatarUso: string;
  nome: string;
  foto: string | null;
  onScegli: (id: string) => void;
}) {
  const sel = useSharedValue(scelto ? 1 : 0);
  const no = useSharedValue(0);
  useEffect(() => {
    sel.value = withTiming(scelto ? 1 : 0, { duration: dur.quick, easing: ease.in });
  }, [scelto, sel]);
  const anelloSt = useAnimatedStyle(() => ({ opacity: sel.value }));
  const noSt = useAnimatedStyle(() => ({ transform: [{ translateX: no.value }] }));
  const R = rarita(item?.rarity ?? 'comune');
  const st: StatoOggetto = item ? statoOggetto(item, owned, equipped) : avatarItem?.id === avatarUso ? 'inUso' : 'tuo';
  const artH = item?.slot === 'back' ? Math.round(w * 0.92) : item?.slot === 'frame' || avatarItem ? Math.round(w * 0.82) : Math.round(w * 0.66);
  const id = item?.id ?? avatarItem!.id;
  const nomeOgg = item?.name ?? avatarItem!.name;
  const label = item
    ? `${nomeOgg}, ${RARITY_NAMES[item.rarity]}. ${st === 'inUso' ? 'In uso' : st === 'tuo' ? 'È tuo' : st === 'arrivo' ? 'In arrivo, non si può provare' : st === 'compra' ? `${priceOf(item, offerta) ?? item.price} monete` : fonteBreve(item)}`
    : `Avatar ${nomeOgg}${st === 'inUso' ? ', in uso' : ''}`;
  // Il filo del bordo cresce con la rarità (1 → 2,25 punti): la scala si legge anche in scala di grigi.
  const filo = item ? 1 + ['comune', 'noncomune', 'raro', 'epico', 'leggendario', 'mitico'].indexOf(item.rarity) * 0.25 : 1;
  return (
    <Squish
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: scelto, disabled: st === 'arrivo' }}
      scaleTo={0.96}
      onPress={() => {
        if (st === 'arrivo') {
          sfx('nope');
          no.set(withSequence(withTiming(4, { duration: dur.quick / 2, easing: ease.move }), withTiming(0, { duration: dur.quick / 2, easing: ease.move })));
          return;
        }
        sfx('tick');
        onScegli(id);
      }}
      testID={`casella-${id}`}
    >
      <View style={[styles.casella, { width: w, height: artH + PIEDE + 16, boxShadow: scelto ? ombra(4) : ombra(2) }]}>
        {/* bordo del metallo della rarità, con il filo chiaro in alto a sinistra */}
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.bordo, { borderWidth: filo, borderColor: item ? R.metallo[1] : 'rgba(230,195,106,0.35)', borderTopColor: item ? R.metallo[0] : 'rgba(230,195,106,0.5)', borderLeftColor: item ? R.metallo[0] : 'rgba(230,195,106,0.5)' }]} />
        <Animated.View style={[styles.arte, { height: artH }, noSt]}>
          <View style={StyleSheet.absoluteFill}>
            <FondoRarita rarita={item?.rarity ?? 'comune'} width={w - 16} height={artH} />
          </View>
          {item ? (
            <Miniatura item={item} w={w - 16} h={artH - 8} avatar={avatar} nome={nome} foto={foto} equipped={equipped} />
          ) : (
            <AvatarCornice avatar={avatarItem!.id} photo={foto} name={nome} frame={equipped.frame} size={Math.floor(artH - 8)} vivo={false} />
          )}
          {st === 'arrivo' ? (
            <View style={styles.lucchetto}>
              <Icon name="lock" size={12} color={testo.forte} />
            </View>
          ) : null}
        </Animated.View>
        <Text style={styles.nome} numberOfLines={1}>
          {nomeOgg}
        </Text>
        <View style={styles.piede}>{item ? <Piede st={st} item={item} offerta={offerta} /> : <Text style={[styles.stato, st === 'inUso' && { color: primitivi.fogliaOro }]}>{st === 'inUso' ? 'In uso' : 'Gratis'}</Text>}</View>
        {/* l'anello d'ottone della selezione */}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.anello, anelloSt]} />
      </View>
    </Squish>
  );
});

export interface GrigliaProps {
  posto: Posto;
  items: Item[];
  avatars: Avatar[];
  larghezza: number;
  prova: string;
  onScegli: (id: string) => void;
  owned: readonly string[];
  equipped: Record<Slot, string>;
  offerta: Item | null;
  avatar: string;
  /** L'avatar in uso (per lo stato «In uso» della sua casella). */
  avatarUso: string;
  nome: string;
  foto: string | null;
}

/** L'altezza di una casella (con il piede), per sapere dove sta una riga senza misurarla. */
export function altezzaCasella(larghezza: number, posto: Posto) {
  const cols = colonne(larghezza, posto);
  const w = Math.floor((larghezza - 10 * (cols - 1)) / cols);
  const artH = posto === 'back' ? Math.round(w * 0.92) : posto === 'frame' || posto === 'avatar' ? Math.round(w * 0.82) : Math.round(w * 0.66);
  return { cols, h: artH + PIEDE + 16, gap: 10 };
}

/** Quante colonne per una larghezza: 3 sul telefono, 4–6 più larghe; gli avatar e i dorsi più fitti. */
export function colonne(larghezza: number, posto: Posto) {
  const minimo = posto === 'avatar' || posto === 'back' ? 92 : posto === 'frame' ? 100 : 150;
  return Math.max(posto === 'table' || posto === 'felt' ? 2 : 3, Math.floor((larghezza + 10) / (minimo + 10)));
}

export function GrigliaOggetti({ posto, items, avatars, larghezza, prova, onScegli, owned, equipped, offerta, avatar, avatarUso, nome, foto }: GrigliaProps) {
  const cols = colonne(larghezza, posto);
  const gap = 10;
  const w = Math.floor((larghezza - gap * (cols - 1)) / cols);
  return (
    <View style={[styles.griglia, { gap, width: larghezza }]} testID={`griglia-${posto}`}>
      {posto === 'avatar'
        ? avatars.map(a => (
            <Casella key={a.id} avatarItem={a} w={w} scelto={prova === a.id} owned={owned} equipped={equipped} offerta={offerta} avatar={avatar} avatarUso={avatarUso} nome={nome} foto={foto} onScegli={onScegli} />
          ))
        : items.map(i => <Casella key={keyOf(i)} item={i} w={w} scelto={prova === i.id} owned={owned} equipped={equipped} offerta={offerta} avatar={avatar} avatarUso={avatarUso} nome={nome} foto={foto} onScegli={onScegli} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  griglia: { flexDirection: 'row', flexWrap: 'wrap' },
  casella: { borderRadius: 12, backgroundColor: '#2A1A1C', padding: 8, overflow: 'visible' },
  bordo: { borderRadius: 12 },
  arte: { alignItems: 'center', justifyContent: 'center', borderRadius: 8, overflow: 'hidden' },
  lucchetto: { position: 'absolute', right: 6, top: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(20,12,14,0.85)', alignItems: 'center', justifyContent: 'center' },
  nome: { fontFamily: fontArte.soraSemi, fontSize: 13, lineHeight: 17, color: testo.forte, marginTop: 7 },
  piede: { height: 18, justifyContent: 'center', marginTop: 1 },
  riga: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stato: { fontFamily: fontArte.soraSemi, fontSize: 12, lineHeight: 16, color: testo.tenue, flexShrink: 1 },
  prezzo: { fontFamily: fontArte.soraBold, fontSize: 13, lineHeight: 16, color: testo.forte, fontVariant: ['tabular-nums'] },
  anello: { borderRadius: 13, borderWidth: 2, borderColor: primitivi.fogliaOro, margin: -3 },
});
