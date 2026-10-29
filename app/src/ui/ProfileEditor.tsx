// Il pannello per personalizzare il profilo: avatar, cornice e vetrina. Ogni scelta si salva subito (e
// passa dal server quando sei collegato, con le stesse regole del registro).
import { useMemo, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Sheet } from '@/game/Sheet';
import { ACHIEVEMENTS } from '@/meta/achievements';
import { AVATARS } from '@/meta/avatars';
import { FRAMES, itemByKey, keyOf } from '@/meta/catalog';
import { showcaseOf } from '@/meta/ledger';
import { chooseAvatar, chooseShowcase, equip, progressOf, useProfile } from '@/meta/profile';
import { rarityRank } from '@/meta/rarity';
import { sourcesOf, sourceText } from '@/meta/sources';
import { useSettings } from '@/state/settings';
import { PlayerAvatar } from './avatar';
import { ShowcaseTile } from './competition';
import { sfx } from './feedback';
import { Icon } from './icons';
import { Choice, Squish } from './kit';
import { dur } from './motion';
import { Text } from './Text';
import { colors, fonts, radius, space } from './theme';

export type EditorTab = 'avatar' | 'cornice' | 'vetrina';

const TIER_RANK = { bronzo: 0, argento: 1, oro: 2, platino: 3 } as const;

export function ProfileEditor({ start = 'avatar', onClose }: { start?: EditorTab; onClose: () => void }) {
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<EditorTab>(start);
  const inner = Math.min(width, 560) - space.xl * 2;
  return (
    <Sheet title="Il tuo profilo" sub="Quello che gli altri vedono di te: in classifica, tra gli amici, nelle sfide." onDismiss={onClose}>
      <Choice<EditorTab>
        label="Cosa cambiare"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'avatar', label: 'Avatar' },
          { value: 'cornice', label: 'Cornice' },
          { value: 'vetrina', label: 'Vetrina' },
        ]}
      />
      <View style={{ height: space.l }} />
      {tab === 'avatar' ? <Avatars width={inner} /> : tab === 'cornice' ? <Frames width={inner} /> : <ShowcasePicker width={inner} />}
    </Sheet>
  );
}

function useMe() {
  const account = useProfile(s => s.account);
  const local = useSettings(s => s.name.trim());
  return { name: account?.name || local || 'Tu', photo: account?.avatar ?? null };
}

function Avatars({ width }: { width: number }) {
  const current = useProfile(s => s.meta.avatar);
  const frame = useProfile(s => s.equipped.frame);
  const me = useMe();
  const cols = width > 420 ? 5 : 4;
  const size = Math.floor((width - 4 - space.s * (cols - 1)) / cols);
  const list = AVATARS.filter(a => a.id !== 'foto' || me.photo);
  return (
    <View style={styles.grid}>
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
            <View style={[styles.cell, { width: size, height: size + 22 }, on && styles.cellOn]}>
              <PlayerAvatar avatar={a.id} photo={me.photo} name={me.name} frame={frame} size={size - 14} />
              <Text style={[styles.cellName, on && { color: colors.sun }]} numberOfLines={1}>
                {a.name}
              </Text>
            </View>
          </Squish>
        );
      })}
    </View>
  );
}

function Frames({ width }: { width: number }) {
  const owned = useProfile(s => s.owned);
  const current = useProfile(s => s.equipped.frame);
  const avatar = useProfile(s => s.meta.avatar);
  const me = useMe();
  const [locked, setLocked] = useState<string | null>(null);
  const cols = width > 420 ? 4 : 3;
  const size = Math.floor((width - 4 - space.s * (cols - 1)) / cols);
  // Prima le tue, poi le altre; dentro, dalla più comune alla più rara.
  const list = useMemo(
    () => [...FRAMES].sort((a, b) => Number(owned.includes(keyOf(b))) - Number(owned.includes(keyOf(a))) || rarityRank(a.rarity) - rarityRank(b.rarity)),
    [owned],
  );
  const lockedItem = locked ? FRAMES.find(f => f.id === locked) : null;
  const have = FRAMES.filter(f => owned.includes(keyOf(f))).length;
  return (
    <View>
      <Text v="small" style={{ marginBottom: space.m }}>
        Ne hai {have} su {FRAMES.length}. Le altre si comprano nel negozio o si vincono con leghe, eventi, podi e achievement segreti.
      </Text>
      {lockedItem ? (
        <Animated.View entering={FadeIn.duration(dur.quick)} style={styles.note}>
          <Icon name="lock" size={16} color={colors.textSoft} />
          <Text style={styles.noteText}>
            {lockedItem.name}: {sourcesOf(keyOf(lockedItem)).map(sourceText).join(' · ') || 'non ancora disponibile'}
          </Text>
        </Animated.View>
      ) : null}
      <View style={styles.grid}>
        {list.map(f => {
          const mine = owned.includes(keyOf(f));
          const on = f.id === current;
          return (
            <Squish
              key={f.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: on, disabled: !mine }}
              accessibilityLabel={`${f.name}${mine ? '' : ', da sbloccare'}`}
              onPress={() => {
                if (!mine) return setLocked(f.id);
                setLocked(null);
                if (on) return;
                sfx('tick');
                equip('frame', f.id);
              }}
              scaleTo={0.94}
            >
              <View style={[styles.cell, { width: size, height: size + 22 }, on && styles.cellOn, !mine && { opacity: 0.55 }]}>
                <PlayerAvatar avatar={avatar} photo={me.photo} name={me.name} frame={f.id} size={size - 14} />
                <View style={[styles.cellFoot, { width: size - 8 }]}>
                  {!mine ? <Icon name="lock" size={11} color={colors.textFaint} /> : null}
                  <Text style={[styles.cellName, styles.cellNameIn, on && { color: colors.sun }]} numberOfLines={1}>
                    {f.name}
                  </Text>
                </View>
              </View>
            </Squish>
          );
        })}
      </View>
    </View>
  );
}

function ShowcasePicker({ width }: { width: number }) {
  const owned = useProfile(s => s.owned);
  const achievements = useProfile(s => s.achievements);
  const chosen = useProfile(s => s.meta.showcase);
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
  const w = Math.floor((width - 4 - space.s * (cols - 1)) / cols);
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
      <Text v="small" style={{ marginBottom: space.m }}>
        Scegli fino a tre cose: gli oggetti più rari della tua collezione o gli achievement di cui vai più fiero.
      </Text>
      <View style={styles.kinds}>
        {(['oggetti', 'achievement'] as const).map(k => (
          <Squish key={k} accessibilityRole="radio" accessibilityState={{ selected: kind === k }} onPress={() => setKind(k)} style={[styles.kind, kind === k && styles.kindOn]}>
            <Text style={[styles.kindText, kind === k && { color: colors.ink }]}>
              {k === 'oggetti' ? `Oggetti (${items.length})` : `Achievement (${achs.length})`}
            </Text>
          </Squish>
        ))}
      </View>
      {msg ? (
        <Animated.View entering={FadeIn.duration(dur.quick)} style={styles.note}>
          <Text style={styles.noteText}>{msg}</Text>
        </Animated.View>
      ) : null}
      {list.length === 0 ? (
        <Text v="body" style={{ textAlign: 'center', marginVertical: space.xl }}>
          {kind === 'oggetti' ? 'Compra o vinci un oggetto per metterlo in vetrina.' : 'Completa un achievement per metterlo in vetrina.'}
        </Text>
      ) : (
        <View style={styles.grid}>
          {list.map(k => {
            const at = visible.indexOf(k);
            return <ShowcaseTile key={k} k={k} width={w} height={Math.round(w * 1.2)} selected={at >= 0 ? at : undefined} onPress={() => toggle(k)} label={at >= 0 ? 'In vetrina: tocca per togliere' : 'Metti in vetrina'} />;
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s, paddingTop: 6 },
  cell: { alignItems: 'center', justifyContent: 'center', borderRadius: radius.m, borderWidth: 1.5, borderColor: 'transparent', paddingTop: 4 },
  cellOn: { borderColor: colors.sun, backgroundColor: 'rgba(255,224,102,0.10)' },
  cellFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 },
  cellName: { flexShrink: 1, fontFamily: fonts.semi, fontSize: 11, lineHeight: 14, color: colors.textSoft, maxWidth: '92%', marginTop: 2 },
  cellNameIn: { maxWidth: undefined },
  note: { flexDirection: 'row', alignItems: 'center', gap: space.s, padding: space.m, marginBottom: space.m, borderRadius: radius.m, backgroundColor: 'rgba(255,255,255,0.08)' },
  noteText: { flex: 1, fontFamily: fonts.medium, fontSize: 12.5, lineHeight: 17, color: colors.text },
  kinds: { flexDirection: 'row', gap: 4, padding: 3, borderRadius: radius.pill, backgroundColor: 'rgba(20,4,40,0.4)', alignSelf: 'flex-start', marginBottom: space.m },
  kind: { height: 34, paddingHorizontal: 12, borderRadius: radius.pill, justifyContent: 'center' },
  kindOn: { backgroundColor: '#FFFFFF' },
  kindText: { fontFamily: fonts.semi, fontSize: 12.5, lineHeight: 16, color: colors.text },
});
