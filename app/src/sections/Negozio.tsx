import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Sheet } from '@/game/Sheet';
import { ARENAS } from '@/meta/arenas';
import { dayOf } from '@/meta/economy';
import { buyItem, equip, useProfile } from '@/meta/profile';
import { itemsOf, offerOf, priceOf, SLOT_NAME, SLOT_NAMES, STARTER_ITEMS, type Item, type Slot } from '@/meta/shop';
import { ItemPreview, TablePreview } from '@/ui/cosmetics';
import { sfx } from '@/ui/feedback';
import { Icon } from '@/ui/icons';
import { Button, Choice, Squish } from '@/ui/kit';
import { CoinIcon } from '@/ui/meta';
import { dur } from '@/ui/motion';
import { Text } from '@/ui/Text';
import { colors, fonts, radius, space } from '@/ui/theme';
import { useTabs } from './Hub';
import { Panel, RarityChip, rarityColor, SectionScroll, SectionTitle } from './parts';

const SLOTS: Slot[] = ['felt', 'pattern', 'back'];

/** The arena that gives an item that can't be bought. */
const arenaFor = (id: string) => ARENAS.find(a => a.felt === id || a.back === id);

type State = 'inUse' | 'owned' | 'buy' | 'arena';

function useItemState(item: Item, day: string): { state: State; price: number | null } {
  const owned = useProfile(s => s.owned);
  const equipped = useProfile(s => s.equipped);
  const has = owned.includes(item.id) || STARTER_ITEMS.includes(item.id);
  const state: State = equipped[item.slot] === item.id ? 'inUse' : has ? 'owned' : item.price === null ? 'arena' : 'buy';
  return { state, price: priceOf(item, day, owned) };
}

function Price({ price, full, big }: { price: number; full?: number | null; big?: boolean }) {
  return (
    <View style={styles.price}>
      <CoinIcon size={big ? 20 : 16} />
      <Text style={[styles.priceText, big && { fontSize: 17, lineHeight: 21 }]}>{price.toLocaleString('it-IT')}</Text>
      {full && full !== price ? <Text style={styles.was}>{full.toLocaleString('it-IT')}</Text> : null}
    </View>
  );
}

function ItemCard({ item, width, day, onOpen }: { item: Item; width: number; day: string; onOpen: () => void }) {
  const { state, price } = useItemState(item, day);
  const ph = item.slot === 'back' ? width * 0.78 : width * 0.62;
  const arena = arenaFor(item.id);
  return (
    <Squish accessibilityRole="button" accessibilityLabel={`${item.name}, ${item.desc}`} onPress={onOpen} scaleTo={0.96}>
      <View style={[styles.card, { width }, state === 'inUse' && { borderColor: colors.sun }]}>
        <View style={[styles.cardArt, { height: ph }]}>
          <ItemPreview item={item} width={width - 20} height={ph - 16} />
        </View>
        <RarityChip rarity={item.rarity} style={{ marginTop: space.s }} />
        <Text style={styles.cardName} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={styles.cardFoot}>
          {state === 'inUse' ? (
            <View style={styles.status}>
              <Icon name="check" size={15} color={colors.sun} stroke={2.6} />
              <Text style={[styles.statusText, { color: colors.sun }]}>In uso</Text>
            </View>
          ) : state === 'owned' ? (
            <Text style={[styles.statusText, { color: colors.mint }]}>Tuo</Text>
          ) : state === 'arena' ? (
            <View style={styles.status}>
              <Icon name="lock" size={14} color={colors.textFaint} />
              <Text style={styles.statusText} numberOfLines={1}>
                {arena ? `Arena ${arena.index + 1}` : 'Bloccato'}
              </Text>
            </View>
          ) : (
            <Price price={price!} full={item.price} />
          )}
        </View>
      </View>
    </Squish>
  );
}

/** One item up close: how your table would look with it, and the button to buy or use it. */
function ItemSheet({ item, day, onClose }: { item: Item; day: string; onClose: () => void }) {
  const { width } = useWindowDimensions();
  const coins = useProfile(s => s.coins);
  const equipped = useProfile(s => s.equipped);
  const { state, price } = useItemState(item, day);
  const [msg, setMsg] = useState<string | null>(null);
  const w = Math.min(width, 560) - space.xl * 2;
  const preview = { ...equipped, [item.slot]: item.id };
  const arena = arenaFor(item.id);
  const doBuy = () => {
    const r = buyItem(item.id, day);
    if (r.ok) {
      sfx('pts', { haptic: true });
      equip(item.slot, item.id);
      setMsg('Comprato e messo in uso.');
    } else setMsg(r.why === 'coins' ? 'Non hai abbastanza monete: vinci qualche partita o ritira il bonus del giorno.' : 'Non si può comprare.');
  };
  return (
    <Sheet title={item.name} sub={item.desc} onDismiss={onClose}>
      <View style={styles.sheetTop}>
        <RarityChip rarity={item.rarity} />
        <Text style={styles.sheetSlot}>{SLOT_NAME[item.slot]}</Text>
      </View>
      <View style={styles.sheetArt}>
        <TablePreview felt={preview.felt} pattern={preview.pattern} back={preview.back} width={w} height={Math.round(w * 0.6)} cards />
      </View>
      {msg ? (
        <Animated.View entering={FadeIn.duration(dur.quick)}>
          <Text v="small" style={{ textAlign: 'center', color: msg.startsWith('Comprato') ? colors.mint : colors.coral, marginBottom: space.s }}>
            {msg}
          </Text>
        </Animated.View>
      ) : null}
      {state === 'inUse' ? (
        <Button kind="secondary" label="In uso sul tuo tavolo" onPress={onClose} />
      ) : state === 'owned' ? (
        <Button
          label="Usa"
          onPress={() => {
            equip(item.slot, item.id);
            sfx('tick');
            onClose();
          }}
        />
      ) : state === 'arena' ? (
        <View style={styles.locked}>
          <Icon name="lock" size={18} color={colors.textSoft} />
          <Text v="label" style={{ flex: 1 }}>
            {arena ? `Si vince arrivando all’arena ${arena.index + 1}, ${arena.name}.` : 'Non è in vendita.'}
          </Text>
        </View>
      ) : (
        <Button
          label={`Compra per ${price!.toLocaleString('it-IT')} monete`}
          sub={coins < price! ? `Ne hai ${coins.toLocaleString('it-IT')}` : undefined}
          disabled={coins < price!}
          onPress={doBuy}
        />
      )}
    </Sheet>
  );
}

function hoursLeft(now: Date) {
  const end = new Date(now);
  end.setHours(24, 0, 0, 0);
  const h = Math.ceil((end.getTime() - now.getTime()) / 3600000);
  return h <= 1 ? 'meno di un’ora' : `${h} ore`;
}

export function Negozio({ active: _active }: { active: boolean }) {
  const { width } = useWindowDimensions();
  const { sheet } = useTabs();
  const owned = useProfile(s => s.owned);
  const [slot, setSlot] = useState<Slot>('felt');
  const now = new Date();
  const day = dayOf(now);
  const offer = offerOf(day, owned);
  const colW = Math.min(width, 560) - 40;
  const gap = space.m;
  const cols = colW > 460 ? 3 : 2;
  const cw = (colW - gap * (cols - 1)) / cols;
  const open = (item: Item) => sheet(<ItemSheet item={item} day={day} onClose={() => sheet(null)} />);
  // Owned and buyable first by price, the arena ones at the end.
  const list = itemsOf(slot)
    .slice()
    .sort((a, b) => (a.price === null ? 1e9 : a.price) - (b.price === null ? 1e9 : b.price));

  return (
    <SectionScroll>
      <SectionTitle title="Negozio" sub="Panni, decori e dorsi per il tuo tavolo." />
      {offer ? (
        <Squish accessibilityRole="button" accessibilityLabel={`Offerta del giorno: ${offer.name}`} onPress={() => open(offer)} scaleTo={0.98}>
          <Panel style={[styles.offer, { borderColor: rarityColor(offer.rarity) }]}>
            <View style={styles.offerArt}>
              <ItemPreview item={offer} width={colW * 0.36} height={colW * 0.36 * (offer.slot === 'back' ? 1.2 : 0.8)} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.offerKicker}>Offerta del giorno, −30%</Text>
              <Text style={styles.offerName} numberOfLines={2}>
                {offer.name}
              </Text>
              <RarityChip rarity={offer.rarity} style={{ marginTop: 4 }} />
              <View style={{ marginTop: space.s }}>
                <Price price={priceOf(offer, day, owned)!} full={offer.price} big />
              </View>
              <Text style={styles.offerTime}>Finisce tra {hoursLeft(now)}</Text>
            </View>
          </Panel>
        </Squish>
      ) : null}
      <View style={{ marginTop: space.xl }}>
        <Choice<Slot> label="Categoria" value={slot} onChange={setSlot} options={SLOTS.map(s => ({ value: s, label: SLOT_NAMES[s] }))} />
      </View>
      <View style={[styles.grid, { gap }]}>
        {list.map(item => (
          <ItemCard key={item.id} item={item} width={cw} day={day} onOpen={() => open(item)} />
        ))}
      </View>
      <Text v="small" style={styles.note}>
        Le monete si guadagnano vincendo, con le medaglie, con il bonus del giorno e salendo di arena.
      </Text>
    </SectionScroll>
  );
}

const styles = StyleSheet.create({
  offer: { flexDirection: 'row', alignItems: 'center', gap: space.l, borderWidth: 1.5 },
  offerArt: { alignItems: 'center', justifyContent: 'center' },
  offerKicker: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 15, color: colors.sun, textTransform: 'uppercase', letterSpacing: 0.4 },
  offerName: { fontFamily: fonts.display, fontSize: 21, lineHeight: 26, color: colors.text, marginTop: 4, letterSpacing: -0.4 },
  offerTime: { fontFamily: fonts.medium, fontSize: 11.5, lineHeight: 15, color: colors.textFaint, marginTop: space.s },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: space.l },
  card: {
    padding: 10,
    paddingBottom: space.m,
    borderRadius: radius.l,
    backgroundColor: colors.panel,
    borderWidth: 1.5,
    borderColor: colors.panelLine,
  },
  cardArt: { borderRadius: radius.m, backgroundColor: 'rgba(20,4,40,0.35)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  cardName: { fontFamily: fonts.bold, fontSize: 14.5, lineHeight: 19, color: colors.text, marginTop: 6 },
  cardFoot: { height: 22, justifyContent: 'center', marginTop: 4 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusText: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 16, color: colors.textFaint },
  price: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  priceText: { fontFamily: fonts.display, fontSize: 14.5, lineHeight: 18, color: colors.text, fontVariant: ['tabular-nums'] },
  was: { fontFamily: fonts.semi, fontSize: 12, lineHeight: 15, color: colors.textFaint, textDecorationLine: 'line-through' },
  note: { textAlign: 'center', marginTop: space.xl },
  sheetTop: { flexDirection: 'row', alignItems: 'center', gap: space.s, marginTop: -space.s },
  sheetSlot: { fontFamily: fonts.semi, fontSize: 12.5, lineHeight: 16, color: colors.textSoft },
  sheetArt: { alignItems: 'center', marginVertical: space.l },
  locked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
    padding: space.l,
    borderRadius: radius.l,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
});
