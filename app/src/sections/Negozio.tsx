// Negozio e collezione: tavolini, panni e dorsi con la loro rarità, da dove si ottengono, i set.
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Sheet } from '@/game/Sheet';
import { CATEGORY_NAMES, ITEMS, itemByKey, itemsOf, keyOf, SLOT_NAME, SLOT_NAMES, type Item, type Slot } from '@/meta/catalog';
import { dayOf } from '@/meta/economy';
import { buyItem, equip, useProfile } from '@/meta/profile';
import { RARITIES, rarityRank, RARITY_NAMES, type Rarity } from '@/meta/rarity';
import { completedSets, setOf, setParts, setReady, SETS, type CosmeticSet } from '@/meta/sets';
import { buyable, ownsKey, priceOf, todayOffer } from '@/meta/shop';
import { sourcesOf, sourceText } from '@/meta/sources';
import { ComingPreview, DorsoVetrina, FondoRarita, FramePreview, ItemPreview, TavoloVetrina } from '@/ui/cosmetics';
import { sfx } from '@/ui/feedback';
import { Icon } from '@/ui/icons';
import { Button, Choice, Squish } from '@/ui/kit';
import { CoinIcon, Emblem } from '@/ui/meta';
import { dur } from '@/ui/motion';
import { RarityChip, rarityColor } from '@/ui/progression';
import { Text } from '@/ui/Text';
import { colors, fonts, radius, space } from '@/ui/theme';
import { useTabs } from './Hub';
import { FilterChips, Panel, SectionTitle } from './parts';

type Tab = Slot | 'set';
type Filter = 'tutti' | 'compra' | 'miei' | Rarity;

const n = (x: number) => x.toLocaleString('it-IT');

type State = 'inUse' | 'owned' | 'buy' | 'locked' | 'coming';

function stateOf(item: Item, owned: readonly string[], equipped: Record<Slot, string>): State {
  const has = ownsKey(owned, keyOf(item));
  if (item.status === 'coming') return 'coming';
  if (equipped[item.slot] === item.id) return 'inUse';
  if (has) return 'owned';
  return buyable(item) ? 'buy' : 'locked';
}

/** Da dove si ottiene, in breve, per un oggetto che non si compra. */
function shortSource(item: Item): string {
  const s = sourcesOf(keyOf(item)).find(x => x.k !== 'shop' && x.k !== 'starter');
  if (!s) return 'Non in vendita';
  switch (s.k) {
    case 'arena':
      return `Arena ${s.n}`;
    case 'achievement':
      return 'Achievement';
    case 'level':
      return `Livello ${s.n}`;
    case 'prestige':
      return `Prestigio ${s.n}`;
    case 'legend':
      return `Leggenda ${s.n}`;
    case 'season':
      return 'Stagione';
    case 'event':
      return 'Evento';
    case 'league':
      return 'Fine stagione';
    case 'weekly':
      return 'Podio settimanale';
    default:
      return '';
  }
}

function Price({ price, full, big }: { price: number; full?: number | null; big?: boolean }) {
  return (
    <View style={styles.price}>
      <CoinIcon size={big ? 20 : 16} />
      <Text style={[styles.priceText, big && { fontSize: 17, lineHeight: 21 }]}>{n(price)}</Text>
      {full && full !== price ? <Text style={styles.was}>{n(full)}</Text> : null}
    </View>
  );
}

/** Sotto l'anteprima: rarità, nome e prezzo (con i margini della scheda). */
const CARD_FOOT = 104;

function ItemCard({ item, width, artH, day, onOpen }: { item: Item; width: number; artH: number; day: string; onOpen: () => void }) {
  const owned = useProfile(s => s.owned);
  const equipped = useProfile(s => s.equipped);
  const offerState = useProfile(s => s.meta.offer);
  const state = stateOf(item, owned, equipped);
  const price = priceOf(item, todayOffer(offerState, day, owned, ITEMS));
  const label = `${item.name}, ${RARITY_NAMES[item.rarity]}. ${
    state === 'inUse' ? 'In uso' : state === 'owned' ? 'È tuo' : state === 'coming' ? 'In arrivo' : state === 'buy' ? `${price} monete` : shortSource(item)
  }`;
  return (
    <Squish accessibilityRole="button" accessibilityLabel={label} onPress={onOpen} scaleTo={0.96}>
      <View style={[styles.card, { width, height: artH + CARD_FOOT }, state === 'inUse' && { borderColor: colors.sun }]}>
        <View style={[styles.cardArt, { height: artH }]}>
          <View style={StyleSheet.absoluteFill}>
            <FondoRarita rarita={item.rarity} width={width - 20} height={artH} raggio={radius.m} />
          </View>
          <ItemPreview item={item} width={width - 20} height={artH - 14} />
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
          ) : state === 'coming' ? (
            <Text style={[styles.statusText, { color: colors.sky }]}>{ownsKey(owned, keyOf(item)) ? 'Tuo · in arrivo' : 'In arrivo'}</Text>
          ) : state === 'locked' ? (
            <View style={styles.status}>
              <Icon name="lock" size={14} color={colors.textFaint} />
              <Text style={styles.statusText} numberOfLines={1}>
                {shortSource(item)}
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

/** Un oggetto da vicino: come sarebbe il tuo tavolo, da dove si ottiene, il pulsante per comprarlo o usarlo. */
function ItemSheet({ item, day, onClose }: { item: Item; day: string; onClose: () => void }) {
  const { width } = useWindowDimensions();
  const coins = useProfile(s => s.coins);
  const owned = useProfile(s => s.owned);
  const equipped = useProfile(s => s.equipped);
  const offerState = useProfile(s => s.meta.offer);
  const state = stateOf(item, owned, equipped);
  const price = priceOf(item, todayOffer(offerState, day, owned, ITEMS));
  const [msg, setMsg] = useState<string | null>(null);
  const w = Math.min(width, 560) - space.xl * 2;
  const preview = { ...equipped, [item.slot]: item.id };
  const sources = sourcesOf(keyOf(item)).filter(s => s.k !== 'starter');
  const sets = setOf(keyOf(item));
  const doBuy = () => {
    const r = buyItem(item.slot, item.id);
    if (r.ok) {
      sfx('buy', { haptic: true });
      equip(item.slot, item.id);
      setMsg('Comprato e messo in uso.');
    } else setMsg(r.why === 'coins' ? 'Non hai abbastanza monete: vinci qualche partita, completa le missioni o ritira il bonus del giorno.' : 'Non si può comprare.');
  };
  return (
    <Sheet title={item.name} sub={item.desc} onDismiss={onClose}>
      <View style={styles.sheetTop}>
        <RarityChip rarity={item.rarity} />
        <Text style={styles.sheetSlot}>
          {SLOT_NAME[item.slot]} · {CATEGORY_NAMES[item.category]}
          {item.n ? ` · n. ${item.n}` : ''}
        </Text>
      </View>
      <View style={styles.sheetArt}>
        {item.status === 'coming' ? (
          <ComingPreview item={item} width={w} height={Math.round(w * 0.6)} />
        ) : item.slot === 'frame' ? (
          <FramePreview frame={item.id} width={w} height={Math.min(180, Math.round(w * 0.5))} />
        ) : item.slot === 'back' ? (
          <View style={styles.sheetBack}>
            <TavoloVetrina table={preview.table} felt={preview.felt} back={preview.back} width={Math.round(w * 0.62)} height={Math.round(w * 0.62 * 0.6)} vivo={false} />
            <DorsoVetrina id={item.id} width={Math.round(w * 0.3)} />
          </View>
        ) : (
          <TavoloVetrina table={preview.table} felt={preview.felt} back={preview.back} width={w} height={Math.round(w * 0.6)} cards />
        )}
      </View>
      {item.status !== 'coming' ? (
        <Button
          kind="secondary"
          label="Prova sul tuo tavolo"
          sub={item.slot === 'frame' ? 'con il tuo avatar e gli altri pezzi' : 'insieme agli altri pezzi'}
          onPress={() => {
            onClose();
            router.push({ pathname: '/personalizza', params: { posto: item.slot, id: item.id } });
          }}
          style={{ marginBottom: space.l }}
        />
      ) : null}
      <View style={styles.sources}>
        <Text style={styles.sourcesHead}>Come si ottiene</Text>
        {sources.map((s, i) => (
          <View key={i} style={styles.sourceRow}>
            <Icon name={s.k === 'shop' ? 'shop' : s.k === 'arena' ? 'trophy' : s.k === 'event' ? 'sparkle' : 'crown'} size={16} color={colors.textSoft} />
            <Text style={styles.sourceText}>{sourceText(s)}</Text>
          </View>
        ))}
        {sets.map(s => (
          <View key={s.id} style={styles.sourceRow}>
            <Icon name="sparkle" size={16} color={colors.sun} />
            <Text style={styles.sourceText}>Fa parte del set «{s.name}»</Text>
          </View>
        ))}
      </View>
      {msg ? (
        <Animated.View entering={FadeIn.duration(dur.quick)}>
          <Text v="small" style={{ textAlign: 'center', color: msg.startsWith('Comprato') ? colors.mint : colors.coral, marginBottom: space.s }}>
            {msg}
          </Text>
        </Animated.View>
      ) : null}
      {state === 'coming' ? (
        <View style={styles.locked}>
          <Icon name="sparkle" size={18} color={colors.sky} />
          <Text v="label" style={{ flex: 1 }}>
            {ownsKey(owned, keyOf(item))
              ? 'È già tuo: la sua illustrazione è in preparazione e potrai usarlo appena sarà pronta.'
              : 'La sua illustrazione è in preparazione: arriverà con un aggiornamento.'}
          </Text>
        </View>
      ) : state === 'inUse' ? (
        <Button kind="secondary" label={item.slot === 'frame' ? 'In uso sul tuo profilo' : 'In uso sul tuo tavolo'} onPress={onClose} />
      ) : state === 'owned' ? (
        <Button
          label="Usa"
          onPress={() => {
            equip(item.slot, item.id);
            sfx('tick');
            onClose();
          }}
        />
      ) : state === 'locked' ? (
        <View style={styles.locked}>
          <Icon name="lock" size={18} color={colors.textSoft} />
          <Text v="label" style={{ flex: 1 }}>
            Non è in vendita: si ottiene solo così.
          </Text>
        </View>
      ) : (
        <Button label={`Compra per ${n(price!)} monete`} sub={coins < price! ? `Ne hai ${n(coins)}` : undefined} disabled={coins < price!} onPress={doBuy} />
      )}
    </Sheet>
  );
}

/* ------------------------------------------------------------------ set */

const SET_H = 168;

function SetCard({ set, width, onOpen }: { set: CosmeticSet; width: number; onOpen: (i: Item) => void }) {
  const owned = useProfile(s => s.owned);
  const parts = setParts(set).map(k => itemByKey(k)!);
  const have = parts.filter(i => owned.includes(keyOf(i))).length;
  const done = completedSets(owned).some(s => s.id === set.id);
  const ready = setReady(set);
  const pw = (width - space.m * 2 - space.s * 2) / 3;
  return (
    <View style={[styles.set, { width, height: SET_H - space.m }, done && { borderColor: set.badge.colors[1] }]}>
      <View style={styles.setHead}>
        <Emblem glyph="gem" colors={set.badge.colors} size={34} locked={!done} />
        <View style={{ flex: 1 }}>
          <Text style={styles.setName} numberOfLines={1}>
            {set.name}
          </Text>
          <Text style={styles.setSub} numberOfLines={1}>
            {done ? 'Completato: stemma sul profilo' : !ready ? 'Alcuni pezzi sono in arrivo' : `${have} su 3 · completalo: stemma e ${n(set.coins)} monete`}
          </Text>
        </View>
      </View>
      <View style={styles.setParts}>
        {parts.map(i => (
          <Squish key={keyOf(i)} accessibilityRole="button" accessibilityLabel={`${i.name}, ${SLOT_NAME[i.slot]}`} onPress={() => onOpen(i)} scaleTo={0.96}>
            <View style={[styles.setPart, { width: pw }]}>
              <ItemPreview item={i} width={pw - 8} height={58} />
              <View style={styles.setPartFoot}>
                {owned.includes(keyOf(i)) ? <Icon name="check" size={12} color={colors.mint} stroke={2.8} /> : null}
                <Text style={styles.setPartName} numberOfLines={1}>
                  {i.name}
                </Text>
              </View>
            </View>
          </Squish>
        ))}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ sezione */

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
  const equipped = useProfile(s => s.equipped);
  const [tab, setTab] = useState<Tab>('felt');
  const [filter, setFilter] = useState<Filter>('tutti');
  const now = new Date();
  const day = dayOf(now);
  const offerState = useProfile(s => s.meta.offer);
  const offer = todayOffer(offerState, day, owned, ITEMS);
  const offerMine = !!offer && ownsKey(owned, keyOf(offer));
  const colW = Math.min(width, 560) - 40;
  const gap = space.m;
  const cols = colW > 460 ? 3 : 2;
  const cw = (colW - gap * (cols - 1)) / cols;
  const artH = Math.round(tab === 'back' ? cw * 0.86 : cw * 0.64);
  const open = (item: Item) => sheet(<ItemSheet item={item} day={day} onClose={() => sheet(null)} />);

  const list = useMemo(() => {
    if (tab === 'set') return [];
    return itemsOf(tab)
      .filter(i => {
        const st = stateOf(i, owned, equipped);
        if (filter === 'miei') return st === 'owned' || st === 'inUse' || (st === 'coming' && owned.includes(keyOf(i)));
        if (filter === 'compra') return st === 'buy';
        if (filter === 'tutti') return true;
        return i.rarity === filter;
      })
      .sort((a, b) => rarityRank(a.rarity) - rarityRank(b.rarity) || a.price - b.price);
  }, [tab, filter, owned, equipped]);
  const rows = useMemo(() => {
    const out: Item[][] = [];
    for (let i = 0; i < list.length; i += cols) out.push(list.slice(i, i + cols));
    return out;
  }, [list, cols]);
  const total = tab === 'set' ? 0 : itemsOf(tab).length;
  const mine = tab === 'set' ? 0 : itemsOf(tab).filter(i => owned.includes(keyOf(i))).length;
  const rowH = artH + CARD_FOOT + gap;

  const header = (
    <View>
      <SectionTitle title="Negozio" sub="Tavolini, panni, dorsi e cornici: da comprare, da vincere, da collezionare." />
      {offer ? (
        <Squish accessibilityRole="button" accessibilityLabel={`Offerta del giorno: ${offer.name}`} onPress={() => open(offer)} scaleTo={0.98}>
          <Panel style={[styles.offer, { borderColor: rarityColor(offer.rarity) }]}>
            <View style={styles.offerArt}>
              <ItemPreview item={offer} width={colW * 0.36} height={colW * 0.36 * (offer.slot === 'back' ? 1.2 : offer.slot === 'frame' ? 0.9 : 0.7)} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.offerKicker}>Offerta del giorno</Text>
              <Text style={styles.offerName} numberOfLines={2}>
                {offer.name}
              </Text>
              <View style={styles.offerChips}>
                <RarityChip rarity={offer.rarity} />
                {offerMine ? null : (
                  <View style={styles.sale}>
                    <Text style={styles.saleText}>−30%</Text>
                  </View>
                )}
              </View>
              <View style={{ marginTop: space.s }}>
                {offerMine ? (
                  <View style={styles.status}>
                    <Icon name="check" size={16} color={colors.mint} stroke={2.6} />
                    <Text style={[styles.statusText, { color: colors.mint, fontSize: 15, lineHeight: 20 }]}>Comprata</Text>
                  </View>
                ) : (
                  <Price price={priceOf(offer, offer)!} full={offer.price} big />
                )}
              </View>
              <Text style={styles.offerTime}>{offerMine ? `Nuova offerta tra ${hoursLeft(now)}` : `Finisce tra ${hoursLeft(now)}`}</Text>
            </View>
          </Panel>
        </Squish>
      ) : null}
      <View style={{ marginTop: space.xl, gap: space.m }}>
        <Choice<Tab>
          label="Categoria"
          value={tab}
          onChange={t => {
            setTab(t);
            setFilter('tutti');
          }}
          options={[...(['table', 'felt', 'back', 'frame'] as Slot[]).map(s => ({ value: s, label: SLOT_NAMES[s] })), { value: 'set', label: 'Set' }]}
        />
        {tab !== 'set' ? (
          <>
            <FilterChips<Filter>
              label="Filtro"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'tutti', label: 'Tutti' },
                { value: 'compra', label: 'Da comprare' },
                { value: 'miei', label: 'I miei' },
                ...RARITIES.map(r => ({ value: r, label: RARITY_NAMES[r] })),
              ]}
            />
            <Text v="small">
              Ne hai {mine} su {total}. {list.length === 0 ? 'Nessun oggetto con questo filtro.' : ''}
            </Text>
          </>
        ) : (
          <Text v="small">Un tavolino, un panno e un dorso pensati insieme: si usano anche separati. Completare un set dà il suo stemma e delle monete.</Text>
        )}
      </View>
      <View style={{ height: space.l }} />
    </View>
  );

  return tab === 'set' ? (
    <FlatList
      key="set"
      data={SETS}
      keyExtractor={s => s.id}
      contentContainerStyle={[styles.scroll, { width: colW + 40 }]}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={header}
      initialNumToRender={6}
      renderItem={({ item }) => <SetCard set={item} width={colW} onOpen={open} />}
    />
  ) : (
    <FlatList
      key={`grid-${tab}-${cols}`}
      data={rows}
      keyExtractor={r => r.map(i => i.id).join('|')}
      contentContainerStyle={[styles.scroll, { width: colW + 40 }]}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={header}
      initialNumToRender={4}
      windowSize={5}
      ListFooterComponent={
        <Text v="small" style={styles.note}>
          Le monete si guadagnano vincendo, con le missioni, gli achievement, il bonus del giorno e salendo di arena e di livello.
        </Text>
      }
      renderItem={({ item: row }) => (
        <View style={[styles.row, { gap, height: rowH }]}>
          {row.map(item => (
            <ItemCard key={item.id} item={item} width={cw} artH={artH} day={day} onOpen={() => open(item)} />
          ))}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  scroll: { alignSelf: 'center', paddingHorizontal: 20, paddingTop: space.s, paddingBottom: space.xxxl },
  offer: { flexDirection: 'row', alignItems: 'center', gap: space.l, borderWidth: 1.5 },
  offerArt: { alignItems: 'center', justifyContent: 'center' },
  offerKicker: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 15, color: colors.sun, textTransform: 'uppercase', letterSpacing: 0.4 },
  offerChips: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  sale: { height: 20, paddingHorizontal: 8, borderRadius: 10, backgroundColor: colors.coral, justifyContent: 'center' },
  saleText: { fontFamily: fonts.display, fontSize: 11, lineHeight: 14, color: '#FFFFFF' },
  offerName: { fontFamily: fonts.display, fontSize: 21, lineHeight: 26, color: colors.text, marginTop: 4, letterSpacing: -0.4 },
  offerTime: { fontFamily: fonts.medium, fontSize: 11.5, lineHeight: 15, color: colors.textFaint, marginTop: space.s },
  row: { flexDirection: 'row' },
  card: {
    padding: 10,
    paddingBottom: space.m,
    borderRadius: radius.l,
    backgroundColor: colors.panel,
    borderWidth: 1.5,
    borderColor: colors.panelLine,
  },
  cardArt: { borderRadius: radius.m, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  cardName: { fontFamily: fonts.bold, fontSize: 14.5, lineHeight: 19, color: colors.text, marginTop: 6 },
  cardFoot: { height: 22, justifyContent: 'center', marginTop: 2 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusText: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 16, color: colors.textFaint },
  price: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  priceText: { fontFamily: fonts.display, fontSize: 14.5, lineHeight: 18, color: colors.text, fontVariant: ['tabular-nums'] },
  was: { fontFamily: fonts.semi, fontSize: 12, lineHeight: 15, color: colors.textFaint, textDecorationLine: 'line-through' },
  note: { textAlign: 'center', marginTop: space.l },
  sheetTop: { flexDirection: 'row', alignItems: 'center', gap: space.s, marginTop: -space.s },
  sheetSlot: { flex: 1, fontFamily: fonts.semi, fontSize: 12.5, lineHeight: 16, color: colors.textSoft },
  sheetArt: { alignItems: 'center', marginVertical: space.l },
  sheetBack: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.l },
  sources: { gap: 6, marginBottom: space.l },
  sourcesHead: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 15, color: colors.sun, textTransform: 'uppercase', letterSpacing: 0.4 },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  sourceText: { flex: 1, fontFamily: fonts.medium, fontSize: 13.5, lineHeight: 18, color: colors.text },
  locked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
    padding: space.l,
    borderRadius: radius.l,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  set: { marginBottom: space.m, padding: space.m, gap: space.m, borderRadius: radius.l, backgroundColor: colors.panel, borderWidth: 1.5, borderColor: colors.panelLine },
  setHead: { flexDirection: 'row', alignItems: 'center', gap: space.m },
  setName: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 20, color: colors.text },
  setSub: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, color: colors.textSoft },
  setParts: { flexDirection: 'row', gap: space.s },
  setPart: { alignItems: 'center', gap: 4, padding: 4, borderRadius: radius.m, backgroundColor: 'rgba(20,4,40,0.35)' },
  setPartFoot: { flexDirection: 'row', alignItems: 'center', gap: 3, maxWidth: '100%' },
  setPartName: { flexShrink: 1, fontFamily: fonts.semi, fontSize: 10.5, lineHeight: 13, color: colors.textSoft },
});
