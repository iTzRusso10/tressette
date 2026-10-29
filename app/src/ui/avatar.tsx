// L'avatar del giocatore con la sua cornice: nel profilo, nelle classifiche, tra gli amici. Disegnato in
// SVG, nitido a ogni misura: un simbolo (o la foto, o l'iniziale) su un fondo, e intorno la cornice.
import { Image } from 'expo-image';
import { memo, useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { avatarById, type AvatarGlyph } from '@/meta/avatars';
import { itemOf, type FrameLook } from '@/meta/catalog';
import { Text } from './Text';
import { fonts } from './theme';

/* ------------------------------------------------------------------ simboli (in una tela 100×100) */

const GLYPH: Partial<Record<AvatarGlyph, (c: string) => React.ReactNode>> = {
  coppa: c => (
    <G fill={c}>
      <Path d="M32 26h36c0 16-6 27-18 29-12-2-18-13-18-29z" />
      <Path d="M46 55h8v12h-8z" />
      <Path d="M36 70c4-4 24-4 28 0v5H36z" />
      <Path d="M30 24h40v5H30z" opacity={0.85} />
    </G>
  ),
  denaro: c => (
    <G>
      <Circle cx={50} cy={50} r={25} fill={c} />
      <Circle cx={50} cy={50} r={18} fill="none" stroke="#FFF6D6" strokeWidth={3} opacity={0.9} />
      <Path d="M50 37l3.6 7.4 8.1 1.2-5.9 5.7 1.4 8.1L50 55.6l-7.2 3.8 1.4-8.1-5.9-5.7 8.1-1.2z" fill="#FFF6D6" />
    </G>
  ),
  spada: c => (
    <G fill={c}>
      <Path d="M48 16h4l3 44h-10z" />
      <Path d="M34 60h32v6H34z" />
      <Path d="M47 66h6v14h-6z" />
      <Circle cx={50} cy={83} r={4} />
    </G>
  ),
  bastone: c => (
    <G fill={c}>
      <Path d="M44 18c4-3 10-2 12 3l-4 60c-1 4-7 4-8 0z" />
      <Circle cx={48} cy={34} r={4} fill="#FFFFFF" opacity={0.5} />
      <Circle cx={51} cy={52} r={3.5} fill="#FFFFFF" opacity={0.5} />
      <Path d="M56 30c6-2 10 2 9 7l-9 2z" />
      <Path d="M44 48c-6-2-10 2-9 7l9 2z" />
    </G>
  ),
  sole: c => (
    <G fill={c}>
      <Circle cx={50} cy={50} r={15} />
      {Array.from({ length: 12 }, (_, i) => (
        <Path key={i} d="M48 22h4l-2 11z" transform={`rotate(${i * 30} 50 50)`} />
      ))}
    </G>
  ),
  luna: c => <Path d="M60 22a29 29 0 1 0 14 48A24 24 0 1 1 60 22z" fill={c} />,
  corona: c => (
    <G fill={c}>
      <Path d="M24 66l-4-32 16 14 14-22 14 22 16-14-4 32z" />
      <Path d="M24 70h52v8H24z" />
      <Circle cx={20} cy={32} r={4} />
      <Circle cx={50} cy={24} r={4} />
      <Circle cx={80} cy={32} r={4} />
    </G>
  ),
  vesuvio: c => (
    <G>
      <Path d="M14 78L40 38h8l6 8 6-8h6l20 40z" fill={c} />
      <Path d="M48 34c-2-8 4-12 2-18 6 4 10 10 6 18z" fill={c} opacity={0.6} />
    </G>
  ),
  limone: c => (
    <G>
      <Path d="M26 54c0-14 12-24 26-24s24 10 24 22c0 14-12 22-26 22S26 66 26 54z" fill={c} transform="rotate(-20 50 52)" />
      <Path d="M62 28c8-8 18-6 20-4-4 8-12 10-20 4z" fill="#2E8B57" />
    </G>
  ),
  corno: c => <Path d="M30 24c22 2 38 22 36 46-1 8-6 12-10 8 2-22-8-38-28-46-4-2-2-8 2-8z" fill={c} />,
  sette: c => <Path d="M30 24h40v8L50 78h-10l19-46H30z" fill={c} />,
  stella: c => <Path d="M50 18l9.4 19 21 3-15.2 14.8 3.6 21L50 66l-18.8 9.8 3.6-21L19.6 40l21-3z" fill={c} />,
};

/* ------------------------------------------------------------------ cornici */

function frameLook(id: string | undefined): FrameLook {
  const it = id ? itemOf('frame', id) : undefined;
  return it?.slot === 'frame' ? it.look : { colors: ['#FFFFFF', '#FFFFFF', '#FFFFFF'], style: 'ring' };
}

/** La cornice intorno a un cerchio di raggio `r` al centro di una tela S×S. */
function Frame({ look, S, r, id }: { look: FrameLook; S: number; r: number; id: string }) {
  const [dark, metal, light] = look.colors;
  const c = S / 2;
  const w = Math.max(2, S * 0.07);
  const ring = <Circle cx={c} cy={c} r={r + w / 2} fill="none" stroke={`url(#fm${id})`} strokeWidth={w} />;
  const dots = (n: number, rr: number, size: number, fill: string, offset = 0) =>
    Array.from({ length: n }, (_, i) => {
      const a = ((i + offset) / n) * Math.PI * 2 - Math.PI / 2;
      return <Circle key={i} cx={c + rr * Math.cos(a)} cy={c + rr * Math.sin(a)} r={size} fill={fill} />;
    });
  const star = (x: number, y: number, k: number, fill: string, key: number) => {
    const pts = Array.from({ length: 10 }, (_, i) => {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const rr = i % 2 ? k * 0.45 : k;
      return `${x + rr * Math.cos(a)},${y + rr * Math.sin(a)}`;
    }).join(' ');
    return <Path key={key} d={`M${pts}Z`} fill={fill} />;
  };
  const R = r + w / 2;
  switch (look.style) {
    case 'ring':
      return ring;
    case 'double':
      return (
        <G>
          {ring}
          <Circle cx={c} cy={c} r={R + w * 0.9} fill="none" stroke={metal} strokeWidth={w * 0.35} />
        </G>
      );
    case 'beads':
      return (
        <G>
          <Circle cx={c} cy={c} r={R} fill="none" stroke={dark} strokeWidth={w * 0.5} />
          {dots(18, R, w * 0.62, light)}
          {dots(18, R, w * 0.3, '#FFFFFF')}
        </G>
      );
    case 'laurel':
      return (
        <G>
          {ring}
          {Array.from({ length: 16 }, (_, i) => {
            // Foglie sui due lati, dal basso verso l'alto, aperte in cima.
            const side = i < 8 ? -1 : 1;
            const k = i % 8;
            const a = Math.PI / 2 + side * (0.35 + k * 0.32);
            const x = c + (R + w * 0.9) * Math.cos(a);
            const y = c + (R + w * 0.9) * Math.sin(a);
            const rot = (a * 180) / Math.PI + (side > 0 ? 60 : 120);
            return <Path key={i} d={`M${x} ${y}m-${w * 0.9} 0a${w * 0.9} ${w * 0.4} 0 1 0 ${w * 1.8} 0a${w * 0.9} ${w * 0.4} 0 1 0 -${w * 1.8} 0`} fill={metal} transform={`rotate(${rot} ${x} ${y})`} />;
          })}
        </G>
      );
    case 'stars':
      return (
        <G>
          <Circle cx={c} cy={c} r={R} fill="none" stroke={dark} strokeWidth={w * 1.1} />
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
            return star(c + R * Math.cos(a), c + R * Math.sin(a), w * 0.75, metal, i);
          })}
        </G>
      );
    case 'rays':
      return (
        <G>
          {Array.from({ length: 24 }, (_, i) => {
            const a = (i / 24) * Math.PI * 2;
            const r0 = R;
            const r1 = R + w * (i % 2 ? 0.9 : 1.6);
            return (
              <Line key={i} x1={c + r0 * Math.cos(a)} y1={c + r0 * Math.sin(a)} x2={c + r1 * Math.cos(a)} y2={c + r1 * Math.sin(a)} stroke={i % 2 ? light : metal} strokeWidth={w * 0.4} strokeLinecap="round" />
            );
          })}
          {ring}
        </G>
      );
    case 'crown':
      return (
        <G>
          {ring}
          <Path
            d={`M${c - w * 3} ${c - R + w * 0.2}l-${w * 0.6} -${w * 2.4} ${w * 1.6} ${w * 1.2} ${w * 2} -${w * 2} ${w * 2} ${w * 2} ${w * 1.6} -${w * 1.2} -${w * 0.6} ${w * 2.4}z`}
            fill={metal}
            stroke={dark}
            strokeWidth={0.8}
          />
          <Circle cx={c} cy={c - R - w * 2.1} r={w * 0.38} fill={light} />
        </G>
      );
    case 'gems':
      return (
        <G>
          {ring}
          {[0, 1, 2, 3].map(i => {
            const a = (i / 4) * Math.PI * 2 - Math.PI / 2;
            const x = c + R * Math.cos(a);
            const y = c + R * Math.sin(a);
            return <Path key={i} d={`M${x} ${y - w}l${w * 0.8} ${w}-${w * 0.8} ${w}-${w * 0.8} -${w}z`} fill={light} stroke={metal} strokeWidth={1} />;
          })}
        </G>
      );
    case 'coin':
      return (
        <G>
          <Circle cx={c} cy={c} r={R} fill="none" stroke={`url(#fm${id})`} strokeWidth={w * 1.2} />
          {Array.from({ length: 40 }, (_, i) => {
            const a = (i / 40) * Math.PI * 2;
            const r0 = R - w * 0.45;
            const r1 = R + w * 0.45;
            return <Line key={i} x1={c + r0 * Math.cos(a)} y1={c + r0 * Math.sin(a)} x2={c + r1 * Math.cos(a)} y2={c + r1 * Math.sin(a)} stroke={dark} strokeOpacity={0.35} strokeWidth={0.7} />;
          })}
        </G>
      );
    case 'flame':
      return (
        <G>
          {Array.from({ length: 14 }, (_, i) => {
            const a = (i / 14) * Math.PI * 2 - Math.PI / 2;
            const x = c + R * Math.cos(a);
            const y = c + R * Math.sin(a);
            const rot = (a * 180) / Math.PI + 90;
            return <Path key={i} d={`M${x - w * 0.7} ${y}q${w * 0.7} -${w * 2.6} ${w * 1.4} 0z`} fill={i % 2 ? metal : light} transform={`rotate(${rot} ${x} ${y})`} />;
          })}
          {ring}
        </G>
      );
    case 'tiles':
      return (
        <G>
          <Circle cx={c} cy={c} r={R} fill="none" stroke={dark} strokeWidth={w * 1.3} />
          {Array.from({ length: 16 }, (_, i) => {
            const a = (i / 16) * Math.PI * 2;
            const x = c + R * Math.cos(a);
            const y = c + R * Math.sin(a);
            return <Rect key={i} x={x - w * 0.4} y={y - w * 0.4} width={w * 0.8} height={w * 0.8} fill={i % 2 ? metal : light} transform={`rotate(${(a * 180) / Math.PI + 45} ${x} ${y})`} />;
          })}
        </G>
      );
    case 'waves':
      return (
        <G>
          {ring}
          <Circle cx={c} cy={c} r={R} fill="none" stroke={light} strokeWidth={w * 0.3} strokeDasharray={`${w * 1.2} ${w * 0.8}`} />
        </G>
      );
  }
}

/* ------------------------------------------------------------------ avatar */

export interface PlayerAvatarProps {
  /** Id dell'avatar (avatars.ts), o «foto»/«iniziale». */
  avatar?: string;
  photo?: string | null;
  name: string;
  /** Id della cornice (catalog.ts, posto `frame`). */
  frame?: string;
  size: number;
  /** Un numero sul bordo (il livello), o il grado di Prestigio (P3). */
  badge?: string;
}

/** L'avatar dentro la sua cornice. La misura comprende la cornice. */
export const PlayerAvatar = memo(function PlayerAvatar({ avatar, photo, name, frame, size, badge }: PlayerAvatarProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const a = avatarById(avatar);
  const look = frameLook(frame);
  // Le cornici che sporgono (raggi, fiamme, alloro, corona) lasciano più spazio intorno.
  const wide = ['rays', 'flame', 'laurel', 'crown', 'stars', 'tiles'].includes(look.style);
  const mid = ['double', 'gems'].includes(look.style);
  const r = size * (wide ? 0.35 : mid ? 0.39 : 0.42);
  const usePhoto = (a.glyph === 'foto' && !!photo) || (a.glyph === 'iniziale' && !!photo && avatar === undefined);
  const glyph = GLYPH[a.glyph];
  const inner = r * 2;
  return (
    <View style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={`bg${uid}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={a.colors[0]} />
            <Stop offset="1" stopColor={a.colors[1]} />
          </LinearGradient>
          <LinearGradient id={`fm${uid}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={look.colors[2]} />
            <Stop offset="0.5" stopColor={look.colors[1]} />
            <Stop offset="1" stopColor={look.colors[0]} />
          </LinearGradient>
          <RadialGradient id={`sh${uid}`} cx="50%" cy="30%" r="60%">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.35} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} fill={`url(#bg${uid})`} />
        {!usePhoto && glyph ? <G transform={`translate(${size / 2 - r} ${size / 2 - r}) scale(${inner / 100})`}>{glyph(a.colors[2])}</G> : null}
        {!usePhoto ? <Circle cx={size / 2} cy={size / 2} r={r} fill={`url(#sh${uid})`} /> : null}
        <Frame look={look} S={size} r={r} id={uid} />
      </Svg>
      {usePhoto ? (
        <Image
          source={{ uri: photo! }}
          style={{ position: 'absolute', left: size / 2 - r, top: size / 2 - r, width: inner, height: inner, borderRadius: r }}
          contentFit="cover"
          transition={null}
        />
      ) : null}
      {!usePhoto && !glyph ? (
        <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
          <Text style={{ fontFamily: fonts.display, fontSize: inner * 0.46, lineHeight: inner * 0.56, color: a.colors[2] }}>{(name || 'T').slice(0, 1).toUpperCase()}</Text>
        </View>
      ) : null}
      {badge ? (
        <View style={[styles.badge, { minWidth: Math.max(20, size * 0.3), height: Math.max(20, size * 0.3), borderRadius: Math.max(10, size * 0.15) }, badge.startsWith('P') && { backgroundColor: '#B8860B' }]}>
          <Text style={[styles.badgeText, { fontSize: Math.max(10, size * 0.14) }]}>{badge}</Text>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    paddingHorizontal: 4,
    backgroundColor: '#2E1257',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: fonts.display, color: '#FFFFFF', lineHeight: 16 },
});
