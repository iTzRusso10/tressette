// Capitolo I, «Le origini»: il borgo. Luoghi di paese, intimi e disegnati di fronte, nella luce calda
// del pomeriggio: intonaci ocra, cotto, legno, persiane verdi e raggi di sole che entrano dalle finestre.

import { Circle, Defs, Ellipse, G, Path } from 'react-native-svg';
import {
  arches,
  CardTable,
  chair,
  checker,
  clouds,
  type Ctx,
  dots,
  Fill,
  Glow,
  Ground,
  lin,
  mix,
  ovals,
  poly,
  r1,
  rects,
  room,
  seeded,
  skyline,
  Vignette,
} from './kit';

/** I colori del borgo. */
const B = {
  ink: '#3A1A20',
  wood: '#7A4626',
  woodD: '#4E2A1A',
  green: '#2E7A5A',
  terra: '#C8643C',
  cream: '#FFF3DC',
  sun: '#FFF1C8',
  felt: '#14806A',
};

/** Una sedia impagliata di profilo: la sedia e il sedile di paglia. */
function StrawChair({ k, x, y, s, dir }: { k: Ctx; x: number; y: number; s: number; dir: number }) {
  const lo = Math.min(x - dir * 7 * s, x + dir * 7 * s);
  return (
    <>
      <Path d={chair(x, y, s, dir)} fill={k.c(B.woodD)} />
      <Path d={rects([[lo - 1 * s, y - 15.6 * s, 16 * s, 2.4 * s]])} fill={k.c('#E3B860')} />
    </>
  );
}

/** Una finestra con le persiane aperte e il paese fuori: [x, y, w, h] del vano. */
function Window({ k, x, y, w, h, name, shutter = B.green, sky = ['#8EC8EA', '#FFE2AE'] }: { k: Ctx; x: number; y: number; w: number; h: number; name: string; shutter?: string; sky?: [string, string] }) {
  const { c } = k;
  const sw = w * 0.42;
  const roofs = skyline(x + 4, y + h - 4, [
    [w * 0.22, y + h * 0.66],
    [w * 0.18, y + h * 0.58],
    [w * 0.16, y + h * 0.7],
    [w * 0.2, y + h * 0.62],
    [w * 0.16, y + h * 0.68],
  ]);
  return (
    <>
      <Defs>{lin(k, name, [[0, sky[0]], [1, sky[1]]])}</Defs>
      <Path d={rects([[x - sw - 2, y, sw, h], [x + w + 2, y, sw, h]])} fill={c(shutter)} />
      <Path d={rects([[x - sw + 1, y + 6, sw - 6, 1.6], [x - sw + 1, y + 12, sw - 6, 1.6], [x - sw + 1, y + h - 14, sw - 6, 1.6], [x + w + 5, y + 6, sw - 6, 1.6], [x + w + 5, y + 12, sw - 6, 1.6], [x + w + 5, y + h - 14, sw - 6, 1.6]])} fill={c('#000000')} opacity={0.18} />
      <Path d={rects([[x - 4, y - 4, w + 8, h + 8]])} fill={c(B.cream)} />
      <Path d={rects([[x, y, w, h]])} fill={k.url(name)} />
      <Path d={roofs} fill={c(mix('#C98A6E', sky[1], 0.35))} />
      <Path d={rects([[x + w / 2 - 1.5, y, 3, h], [x, y + h * 0.45, w, 3]])} fill={c(B.cream)} />
      <Path d={rects([[x - 8, y + h + 4, w + 16, 4]])} fill={c(mix(B.cream, '#C8A07A', 0.3))} />
    </>
  );
}

/* ------------------------------------------------------------------ 1. Il Bar del Paese */

export function BarDelPaese({ k }: { k: Ctx }) {
  const { c } = k;
  const rnd = seeded(11);
  const bottles: Record<string, number[][]> = {};
  const necks: number[][] = [];
  for (const y of [62, 92]) {
    for (let x = 166; x < 430; ) {
      const w = 7 + Math.floor(rnd() * 4);
      const h = 13 + rnd() * 9;
      const col = ['#3E8A4E', '#C8782E', '#B8323A', '#CFE6E0', '#6A2E4E', '#E8B84A'][Math.floor(rnd() * 6)];
      (bottles[col] ??= []).push([x, y - h, w, h]);
      necks.push([x + w / 2 - 1.3, y - h - 5, 2.6, 6]);
      x += w + 3 + rnd() * 4;
    }
  }
  const cups = [178, 188, 198, 446, 456].map(x => [x, 103, 7, 6]);
  return (
    <G>
      <Defs>
        {lin(k, 'wall', [[0, '#F6D9A6'], [1, '#E9B67E']])}
        {lin(k, 'floor', [[0, '#C47A4E'], [1, '#8A4632']])}
        {lin(k, 'counter', [[0, '#9A5A34'], [1, '#5E321E']])}
        {lin(k, 'mirror', [[0, '#F7E2BC'], [1, '#D9A774']])}
        {lin(k, 'beam', [[0, '#FFF6D8', 0.45], [1, '#FFF6D8', 0]])}
      </Defs>
      <Fill k={k} name="wall" />
      {/* Le finestre sul paese, ai lati. */}
      <Window k={k} name="out1" x={36} y={34} w={66} h={92} />
      <Window k={k} name="out2" x={498} y={34} w={66} h={92} />
      {/* Lo specchio e le mensole delle bottiglie dietro il bancone. */}
      <Path d={rects([[150, 30, 300, 84]])} fill={c(B.woodD)} />
      <Path d={rects([[156, 36, 288, 72]])} fill={k.url('mirror')} />
      <Path d="M180 36L210 36L170 108L156 108L156 80ZM230 36L244 36L204 108L190 108Z" fill={c('#FFFFFF')} opacity={0.25} />
      {Object.entries(bottles).map(([col, list]) => (
        <Path key={col} d={arches(list)} fill={c(col)} />
      ))}
      <Path d={rects(necks)} fill={c('#2E1A1A')} opacity={0.75} />
      <Path d={rects([[154, 62, 292, 3], [154, 92, 292, 3]])} fill={c(B.wood)} />
      {/* L'orologio sopra lo specchio. */}
      <Circle cx={300} cy={16} r={11} fill={c(B.woodD)} />
      <Circle cx={300} cy={16} r={9} fill={c(B.cream)} />
      <Path d="M300 16V9M300 16L305 18" stroke={c(B.ink)} strokeWidth={1.3} strokeLinecap="round" />
      {/* Il bancone: piano di marmo e legno a pannelli. */}
      <Path d={rects([[128, 114, 344, 62]])} fill={k.url('counter')} />
      <Path d={rects([[140, 124, 74, 40], [226, 124, 74, 40], [312, 124, 74, 40], [398, 124, 62, 40]])} fill={c('#000000')} opacity={0.12} />
      <Path d={rects([[122, 108, 356, 7]])} fill={c('#F3EADB')} />
      <Path d={rects([[122, 114, 356, 2]])} fill={c('#C8B49A')} />
      {/* La macchina del caffè e le tazzine. */}
      <Path d={arches([[396, 70, 30, 40]])} fill={c('#D8D2CC')} />
      <Path d={rects([[392, 92, 38, 4], [404, 100, 4, 4], [414, 100, 4, 4]])} fill={c('#8A8480')} />
      <Path d={dots([[411, 69, 2.6]])} fill={c('#E8B84A')} />
      <Path d={rects(cups)} fill={c('#FFFFFF')} />
      {/* Le lampade a cupola. */}
      <Glow k={k} name="l1" x={232} y={30} r={40} color="#FFE7A0" op={0.55} />
      <Glow k={k} name="l2" x={368} y={30} r={40} color="#FFE7A0" op={0.55} />
      <Path d="M232 0V20M368 0V20" stroke={c(B.ink)} strokeWidth={1} />
      <Path d={poly([[222, 29], [242, 29], [237, 20], [227, 20]]) + poly([[358, 29], [378, 29], [373, 20], [363, 20]])} fill={c(B.green)} />
      <Path d={dots([[232, 30, 3], [368, 30, 3]])} fill={c(B.sun)} />
      {/* Il pavimento di cotto e il sole che entra dalla finestra. */}
      <Path d={rects([[0, 176, 600, 24]])} fill={k.url('floor')} />
      <Path d="M0 184H600M0 193H600" stroke={c('#6A3424')} strokeWidth={0.8} opacity={0.5} />
      {k.dim ? null : <Path d={poly([[36, 130], [102, 130], [232, 200], [120, 200]]) + poly([[498, 130], [564, 130], [480, 200], [368, 200]])} fill={k.url('beam')} />}
      <Ground k={k} from={130} color="#3A1408" op={0.4} />
      {/* Il tavolino accanto al bancone. */}
      <StrawChair k={k} x={246} y={200} s={1.05} dir={1} />
      <StrawChair k={k} x={354} y={200} s={1.05} dir={-1} />
      <CardTable k={k} x={300} y={166} w={80} felt={B.felt} wood={B.wood} />
      <Vignette k={k} color="#4A1A10" op={0.3} />
    </G>
  );
}

/* ------------------------------------------------------------------ 2. La Piazza del Borgo */

export function PiazzaDelBorgo({ k }: { k: Ctx }) {
  const { c } = k;
  const sky = '#F7D3A0';
  const hills = mix('#9AA87A', sky, 0.5);
  const houseL: [number, number, number, string][] = [
    [-10, 70, 76, '#E8B070'],
    [70, 136, 92, '#E38E6E'],
    [136, 214, 84, '#F2CC86'],
  ];
  const houseR: [number, number, number, string][] = [
    [386, 458, 88, '#F2CC86'],
    [458, 530, 74, '#E38E6E'],
    [530, 610, 94, '#E8B070'],
  ];
  const houses = [...houseL, ...houseR];
  const wins: number[][] = [];
  const shut: number[][] = [];
  for (const [x0, x1, top] of houses) {
    const n = x1 - x0 > 70 ? 2 : 1;
    for (let j = 0; j < n; j++) {
      const wx = x0 + ((x1 - x0) * (j + 0.5)) / n - 6;
      for (const wy of [top + 14, top + 46]) {
        if (wy > 150) continue;
        wins.push([wx, wy, 12, 18]);
        shut.push([wx - 6, wy, 5, 18], [wx + 13, wy, 5, 18]);
      }
    }
  }
  const birds = [[150, 30], [166, 24], [420, 40], [434, 34], [446, 42]].map(([x, y]) => `M${x - 4} ${y - 2}Q${x - 2} ${y - 3} ${x} ${y}Q${x + 2} ${y - 3} ${x + 4} ${y - 2}`).join('');
  return (
    <G>
      <Defs>
        {lin(k, 'sky', [[0, '#7FB8E6'], [0.6, '#F7D3A0'], [1, '#FFE6B8']])}
        {lin(k, 'stone', [[0, '#E9C08A'], [1, '#B98A5A']])}
        {lin(k, 'tower', [[0, '#F0C890'], [1, '#C88A5A']], [0, 0, 1, 0])}
        {lin(k, 'paving', [[0, '#DDB68A'], [1, '#A8744E']])}
      </Defs>
      <Fill k={k} name="sky" />
      <Glow k={k} name="sun" x={480} y={46} r={110} color="#FFF4D0" op={0.8} />
      <Path d={clouds([[60, 36, 74], [250, 26, 50], [500, 30, 60]])} fill={c('#FFFFFF')} opacity={0.7} />
      <Path d={birds} stroke={c(B.ink)} strokeWidth={1.1} fill="none" opacity={0.6} />
      {/* Le colline lontane con i cipressi. */}
      <Path d="M0 140V112Q60 96 130 108Q200 92 270 110Q350 96 420 106Q500 90 600 104V140Z" fill={c(hills)} />
      <Path d={ovals([[118, 104, 3, 10], [128, 106, 2.5, 8], [470, 98, 3, 11], [482, 100, 2.5, 8]])} fill={c(mix('#4E6A4A', sky, 0.45))} />
      {/* La chiesa e il campanile al centro. */}
      <Path d={poly([[218, 168], [218, 104], [254, 82], [290, 104], [290, 168]])} fill={k.url('stone')} />
      <Path d={poly([[214, 106], [254, 80], [294, 106], [290, 108], [254, 86], [218, 108]])} fill={c(B.cream)} />
      <Circle cx={254} cy={112} r={8} fill={c('#7A3A3A')} />
      <Circle cx={254} cy={112} r={5.5} fill={c('#E8A04A')} />
      <Path d={arches([[242, 132, 24, 36]])} fill={c('#5A2A2A')} />
      <Path d={rects([[294, 40, 40, 128]])} fill={k.url('tower')} />
      <Path d={rects([[290, 36, 48, 6], [290, 76, 48, 4], [292, 120, 44, 3]])} fill={c(B.cream)} />
      <Path d={arches([[300, 46, 12, 26], [316, 46, 12, 26]])} fill={c('#4A2228')} />
      <Path d={ovals([[306, 62, 4, 5], [322, 62, 4, 5]])} fill={c('#C8962E')} />
      <Path d={poly([[290, 36], [338, 36], [314, 10]])} fill={c(B.terra)} />
      <Path d="M314 10V2M311 4.5H317" stroke={c(B.ink)} strokeWidth={1.2} />
      <Circle cx={314} cy={96} r={9} fill={c(B.cream)} />
      <Path d="M314 96V90M314 96L318 98" stroke={c(B.ink)} strokeWidth={1.2} strokeLinecap="round" />
      {/* Le case attorno alla piazza. */}
      {houses.map(([x0, x1, top, col], i) => (
        <Path key={i} d={rects([[x0, top, x1 - x0, 200 - top]])} fill={c(col)} />
      ))}
      <Path d={rects(houses.map(([x0, x1, top]) => [x0 - 4, top - 5, x1 - x0 + 8, 6]))} fill={c(B.terra)} />
      <Path d={rects(houses.map(([x0, x1, top]) => [x0 - 4, top + 1, x1 - x0 + 8, 2]))} fill={c('#000000')} opacity={0.15} />
      <Path d={rects(shut)} fill={c(B.green)} />
      <Path d={rects(wins)} fill={c('#4A2A30')} />
      <Path d={rects(wins.map(([x, y, w, h]) => [x - 7, y + h, w + 14, 2.5]))} fill={c(B.cream)} />
      <Path d={dots(wins.filter((_, i) => i % 3 === 0).map(([x, y, w, h]) => [x + w / 2, y + h - 1, 4]))} fill={c('#E8506A')} />
      <Path d={arches([[22, 150, 26, 50], [92, 152, 26, 48], [160, 150, 30, 50], [404, 150, 30, 50], [478, 152, 26, 48], [552, 150, 26, 50]])} fill={c('#5A2E2A')} />
      {/* Il platano con la panchina, a destra. */}
      <Path d="M366 200V150Q364 132 370 120" stroke={c('#6A4A3A')} strokeWidth={6} fill="none" />
      <Path d={dots([[352, 112, 20], [372, 100, 24], [392, 116, 18], [368, 124, 18]])} fill={c('#5E8A4A')} />
      <Path d={dots([[360, 104, 10], [378, 94, 12], [394, 110, 8]])} fill={c('#7AA85A')} />
      {/* La piazza lastricata e l'ombra del campanile. */}
      <Path d={rects([[0, 168, 600, 32]])} fill={k.url('paving')} />
      <Path d="M0 176H600M0 186H600M0 197H600" stroke={c('#8A5A3A')} strokeWidth={0.7} opacity={0.4} />
      <Path d={poly([[294, 168], [334, 168], [306, 206], [226, 206]])} fill={c('#5A2A1A')} opacity={0.22} />
      <Ground k={k} from={150} color="#3A1408" op={0.35} />
      <StrawChair k={k} x={222} y={200} s={0.95} dir={1} />
      <StrawChair k={k} x={318} y={200} s={0.95} dir={-1} />
      <CardTable k={k} x={270} y={170} w={68} felt={B.felt} wood={B.wood} />
    </G>
  );
}

/* ------------------------------------------------------------------ 3. Il Circolo degli Amici */

export function CircoloDegliAmici({ k }: { k: Ctx }) {
  const { c } = k;
  const rnd = seeded(23);
  const notes = Array.from({ length: 9 }, (_, i) => [258 + (i % 3) * 28 + rnd() * 4, 46 + Math.floor(i / 3) * 18 + rnd() * 3, 14, 11]);
  // Le sedie lungo il muro, viste di fronte.
  const wallChair = (x: number) => rects([[x - 8, 130, 2, 44], [x + 6, 130, 2, 44], [x - 8, 130, 16, 2], [x - 8, 138, 16, 1.6], [x - 9, 156, 18, 3], [x - 7, 159, 1.8, 15], [x + 5.2, 159, 1.8, 15]]);
  return (
    <G>
      <Defs>
        {lin(k, 'wall', [[0, '#F4E2C2'], [1, '#E8C894']])}
        {lin(k, 'wains', [[0, '#3E7A5E'], [1, '#2A5A44']])}
        {lin(k, 'floor', [[0, '#A8683E'], [1, '#6A3A24']])}
        {lin(k, 'cone', [[0, '#FFF1C4', 0.5], [1, '#FFF1C4', 0.05]])}
        {lin(k, 'beam', [[0, '#FFF6D8', 0.4], [1, '#FFF6D8', 0]])}
      </Defs>
      <Fill k={k} name="wall" />
      <Path d={rects([[0, 112, 600, 66]])} fill={k.url('wains')} />
      <Path d={rects([[0, 110, 600, 4]])} fill={c(B.wood)} />
      <Path d={rects(Array.from({ length: 15 }, (_, i) => [8 + i * 40, 122, 32, 44]))} fill={c('#000000')} opacity={0.1} />
      {/* Le finestre alte, con il sole del pomeriggio. */}
      <Window k={k} name="out1" x={120} y={26} w={56} h={78} />
      <Window k={k} name="out2" x={424} y={26} w={56} h={78} />
      {/* La bacheca del circolo con gli avvisi e il gagliardetto. */}
      <Path d={rects([[250, 38, 100, 62]])} fill={c(B.wood)} />
      <Path d={rects([[254, 42, 92, 54]])} fill={c('#C8925A')} />
      <Path d={rects(notes)} fill={c('#FFF8EA')} />
      <Path d={rects(notes.filter((_, i) => i % 4 === 1))} fill={c('#FFE27A')} />
      <Path d={dots(notes.map(([x, y, w]) => [x + w / 2, y + 1.5, 1.2]))} fill={c('#C83A3A')} />
      <Path d={poly([[44, 40], [88, 52], [44, 64]])} fill={c('#C83A3A')} />
      <Path d={poly([[44, 46], [70, 52], [44, 58]])} fill={c(B.cream)} opacity={0.9} />
      <Path d="M44 36V70" stroke={c(B.woodD)} strokeWidth={2} />
      {/* L'orologio a muro e l'attaccapanni. */}
      <Circle cx={548} cy={54} r={14} fill={c(B.woodD)} />
      <Circle cx={548} cy={54} r={11} fill={c(B.cream)} />
      <Path d="M548 54V46M548 54L554 57" stroke={c(B.ink)} strokeWidth={1.4} strokeLinecap="round" />
      <Path d="M30 176V96M22 100H38" stroke={c(B.woodD)} strokeWidth={3} />
      <Path d="M20 100Q30 92 40 100Z" fill={c('#5A4A6A')} />
      <Path d={rects([[16, 100, 28, 3]])} fill={c('#5A4A6A')} />
      <Path d={wallChair(208) + wallChair(392) + wallChair(80) + wallChair(520)} fill={c(B.woodD)} />
      <Path d={rects([[199, 154, 18, 3], [383, 154, 18, 3], [71, 154, 18, 3], [511, 154, 18, 3]])} fill={c('#E3B860')} />
      {/* Il pavimento di legno. */}
      <Path d={rects([[0, 176, 600, 24]])} fill={k.url('floor')} />
      <Path d="M0 182H600M0 190H600" stroke={c('#4A2414')} strokeWidth={0.8} opacity={0.5} />
      {k.dim ? null : <Path d={poly([[120, 106], [176, 106], [262, 200], [172, 200]]) + poly([[424, 106], [480, 106], [428, 200], [338, 200]])} fill={k.url('beam')} />}
      <Ground k={k} from={130} color="#2A1408" op={0.35} />
      {/* La lampada a cono sopra il tavolo. */}
      {k.dim ? null : <Path d={poly([[284, 62], [316, 62], [352, 172], [248, 172]])} fill={k.url('cone')} />}
      <Path d="M300 0V48" stroke={c(B.ink)} strokeWidth={1.2} />
      <Path d={poly([[282, 63], [318, 63], [306, 48], [294, 48]])} fill={c(B.green)} />
      <Path d={rects([[282, 61, 36, 2]])} fill={c(B.cream)} />
      <Path d={dots([[300, 64, 4]])} fill={c(B.sun)} />
      <StrawChair k={k} x={244} y={200} s={1.05} dir={1} />
      <StrawChair k={k} x={356} y={200} s={1.05} dir={-1} />
      <CardTable k={k} x={300} y={166} w={84} felt="#2A8A5E" wood="#8A5434" />
    </G>
  );
}

/* ------------------------------------------------------------------ 4. La Taverna del Moro */

/** Una botte vista di fronte, distesa: cerchi, doghe e spina. */
function barrels(list: number[][]) {
  const body = dots(list);
  const rim = dots(list.map(([x, y, r]) => [x, y, r * 0.82]));
  const core = dots(list.map(([x, y, r]) => [x, y, r * 0.62]));
  const tap = rects(list.map(([x, y, r]) => [x - r * 0.08, y + r * 0.34, r * 0.16, r * 0.3]));
  return { body, rim, core, tap };
}

export function TavernaDelMoro({ k }: { k: Ctx }) {
  const { c } = k;
  // Gli archi di pietra uno dietro l'altro: [mezza larghezza, cima, piede, spessore].
  const rings = [
    [62, 64, 160, 8],
    [104, 40, 176, 12],
    [164, 10, 194, 18],
    [250, -34, 230, 28],
  ];
  const opening = ([hw, top, foot, t]: number[]) => arches([[300 - hw + t, top + t, 2 * (hw - t), foot - top]]);
  const outer = ([hw, top, foot]: number[]) => arches([[300 - hw, top, 2 * hw, foot - top + 10]]);
  const vault = ['#2A1410', '#4A2418', '#6A3420', '#8A4A2A'];
  const stone = ['#6A3E2C', '#8A5838', '#A8704A', '#C48A5E'];
  const left = barrels([[92, 176, 22], [142, 176, 22], [117, 138, 22], [44, 176, 22]]);
  const right = barrels([[458, 176, 22], [508, 176, 22], [483, 138, 22], [556, 176, 22]]);
  return (
    <G>
      <Defs>
        {lin(k, 'far', [[0, '#C8804A'], [1, '#8A4A2A']])}
        {lin(k, 'floor', [[0, '#7A4A30'], [1, '#2E160E']])}
        {lin(k, 'door', [[0, '#FFE6A8'], [1, '#FFA040']])}
      </Defs>
      <Path d={rects([[0, 0, 600, 200]])} fill={c(vault[0])} />
      {/* Le volte, dalla più vicina alla più lontana, poi il muro di fondo con la porta accesa. */}
      {[3, 2, 1].map(i => (
        <Path key={i} d={opening(rings[i])} fill={c(vault[4 - i])} />
      ))}
      <Path d={opening(rings[0])} fill={k.url('far')} />
      <Glow k={k} name="door" x={300} y={136} r={60} color="#FFC870" op={0.7} />
      <Path d={arches([[288, 118, 24, 42]])} fill={k.url('door')} />
      <Path d={poly([[180, 200], [420, 200], [326, 160], [274, 160]])} fill={k.url('floor')} />
      {/* Gli anelli di pietra con i conci. */}
      {[0, 1, 2, 3].map(i => {
        const [hw, top, foot, t] = rings[i];
        const joints = Array.from({ length: 9 }, (_, j) => {
          const a = Math.PI * (j + 1) / 10;
          const cx = 300;
          const rr = hw - t / 2;
          const cy = top + hw;
          const x = cx - Math.cos(a) * rr;
          const y = cy - Math.sin(a) * rr;
          const dx = Math.cos(a) * t * 0.5;
          const dy = Math.sin(a) * t * 0.5;
          return `M${r1(x - dx)} ${r1(y - dy)}L${r1(x + dx)} ${r1(y + dy)}`;
        }).join('');
        return (
          <G key={i}>
            <Path d={outer(rings[i]) + opening(rings[i])} fillRule="evenodd" fill={c(stone[i])} />
            <Path d={joints} stroke={c(vault[0])} strokeWidth={Math.max(0.8, t * 0.08)} opacity={0.5} />
            <Path d={rects([[300 - hw, foot - t * 0.2, t, 2], [300 + hw - t, foot - t * 0.2, t, 2]])} fill={c('#000000')} opacity={0.2} />
          </G>
        );
      })}
      {/* Le botti, impilate ai lati. */}
      {[left, right].map((b, i) => (
        <G key={i}>
          <Path d={b.body} fill={c('#7A4424')} />
          <Path d={b.rim} fill={c('#A8683A')} />
          <Path d={b.core} fill={c('#8E5230')} />
          <Path d={b.rim} fill="none" stroke={c('#3A1E14')} strokeWidth={1.4} />
          <Path d={b.tap} fill={c('#3A1E14')} />
        </G>
      ))}
      {/* La lanterna appesa alla volta. */}
      <Glow k={k} name="lantern" x={300} y={78} r={70} color="#FFC870" op={0.65} />
      <Path d="M300 40V64" stroke={c('#2A1410')} strokeWidth={1.4} />
      <Path d={poly([[292, 70], [308, 70], [306, 88], [294, 88]])} fill={c('#2A1410')} />
      <Path d={poly([[294.5, 72], [305.5, 72], [304, 86], [296, 86]])} fill={c('#FFE2A0')} />
      <Path d={poly([[290, 70], [310, 70], [300, 63]])} fill={c('#2A1410')} />
      <Ground k={k} from={140} color="#1A0804" op={0.45} />
      <StrawChair k={k} x={242} y={200} s={1.05} dir={1} />
      <StrawChair k={k} x={358} y={200} s={1.05} dir={-1} />
      <CardTable k={k} x={300} y={168} w={84} felt="#1E6E56" wood="#5A2E1A" />
      <Vignette k={k} color="#120604" op={0.45} />
    </G>
  );
}

/* ------------------------------------------------------------------ 5. Il Caffè delle Carte */

export function CaffeDelleCarte({ k }: { k: Ctx }) {
  const { c } = k;
  const R = room([104, 26, 496, 156]);
  const mirrors = [[146, 40, 72, 106], [264, 36, 72, 110], [382, 40, 72, 106]];
  const pil = [126, 238, 356, 474];
  const gold = '#D8A84A';
  const sideMirrors = [R.side(-1, 0.25, 0.55, 0.2, 0.72), R.side(-1, 0.65, 0.9, 0.2, 0.72), R.side(1, 0.25, 0.55, 0.2, 0.72), R.side(1, 0.65, 0.9, 0.2, 0.72)].join('');
  const small = (x: number, s: number) => (
    <>
      <Path d={chair(x - 20 * s, 168 + 18 * s, s, 1) + chair(x + 20 * s, 168 + 18 * s, s, -1)} fill={c('#3A1E14')} />
      <Path d={rects([[x - 1.2 * s, 168 - 4 * s, 2.4 * s, 22 * s]])} fill={c('#3A1E14')} />
      <Ellipse cx={x} cy={168 - 4 * s} rx={13 * s} ry={3.4 * s} fill={c('#F6F0E8')} />
    </>
  );
  return (
    <G>
      <Defs>
        {lin(k, 'wall', [[0, '#F2E2C8'], [1, '#DEC29E']])}
        {lin(k, 'side', [[0, '#C8A47A'], [1, '#E6CFAE']], [0, 0, 1, 0])}
        {lin(k, 'sideR', [[0, '#E6CFAE'], [1, '#B8946A']], [0, 0, 1, 0])}
        {lin(k, 'mirror', [[0, '#DCE6EE'], [0.55, '#F4E4C8'], [1, '#C8A47A']])}
        {lin(k, 'ceil', [[0, '#8A5A3A'], [1, '#C8946A']])}
      </Defs>
      <Fill k={k} name="wall" />
      <Path d={R.ceil} fill={k.url('ceil')} />
      <Path d={R.left} fill={k.url('side')} />
      <Path d={R.right} fill={k.url('sideR')} />
      <Path d={sideMirrors} fill={c('#E6D8C0')} />
      <Path d={sideMirrors} fill="none" stroke={c(gold)} strokeWidth={2} />
      {/* Il pavimento a scacchi di marmo. */}
      <Path d={R.floor} fill={c('#EDE4D4')} />
      <Path d={checker(R.flat, 6, 12)} fill={c('#5A3A3A')} />
      {/* Le specchiere con le cornici dorate e le lesene di marmo verde. */}
      <Path d={arches(mirrors.map(([x, y, w, h]) => [x - 5, y - 5, w + 10, h + 8]))} fill={c(gold)} />
      <Path d={arches(mirrors)} fill={k.url('mirror')} />
      <Path d={mirrors.map(([x, y, w, h]) => poly([[x + w * 0.2, y + h], [x + w * 0.36, y + h], [x + w * 0.86, y + w * 0.3], [x + w * 0.7, y + w * 0.2]])).join('')} fill={c('#FFFFFF')} opacity={0.35} />
      <Path d={rects(pil.map(x => [x - 6, 30, 12, 126]))} fill={c('#2E5A4A')} />
      <Path d={rects(pil.flatMap(x => [[x - 8, 28, 16, 5], [x - 8, 150, 16, 6]]))} fill={c(gold)} />
      <Path d={rects([[104, 24, 392, 4]])} fill={c(gold)} />
      {/* Le appliques a globo tra gli specchi. */}
      {pil.map((x, i) => (
        <Glow key={i} k={k} name={`s${i}`} x={x} y={70} r={22} color="#FFE7A0" op={0.6} />
      ))}
      <Path d={dots(pil.map(x => [x, 70, 5]))} fill={c(B.sun)} />
      {/* I lampadari a globo. */}
      <Path d="M220 0V22M380 0V22M300 0V14" stroke={c(gold)} strokeWidth={1} />
      <Path d={dots([[220, 26, 6], [380, 26, 6], [300, 18, 7]])} fill={c(B.sun)} />
      {k.dim ? null : <Path d={dots([[220, 26, 12], [380, 26, 12], [300, 18, 14]])} fill="#FFE7A0" opacity={0.25} />}
      {/* Le palme nei vasi agli angoli. */}
      {[50, 550].map(x => (
        <G key={x}>
          <Path d={`M${x} 164Q${x - 30} 120 ${x - 40} 112M${x} 164Q${x - 10} 110 ${x - 14} 96M${x} 164Q${x + 12} 110 ${x + 16} 98M${x} 164Q${x + 30} 124 ${x + 42} 116`} stroke={c('#3E7A4A')} strokeWidth={5} strokeLinecap="round" fill="none" />
          <Path d={poly([[x - 14, 164], [x + 14, 164], [x + 10, 186], [x - 10, 186]])} fill={c('#B8603A')} />
        </G>
      ))}
      {small(170, 0.9)}
      {small(430, 0.9)}
      <Ground k={k} from={140} color="#2A1408" op={0.35} />
      <Path d={chair(246, 200, 1.05, 1) + chair(354, 200, 1.05, -1)} fill={c('#3A1E14')} />
      <CardTable k={k} x={300} y={168} w={84} felt={B.felt} wood="#3A1E14" rim="#F2EDE4" />
    </G>
  );
}

/* ------------------------------------------------------------------ 6. La Locanda del Re */

/** Una corona semplice: base in (x, y), larga w. */
export function crown(x: number, y: number, w: number) {
  const h = w * 0.62;
  return poly([
    [x - w / 2, y],
    [x + w / 2, y],
    [x + w / 2, y - h * 0.3],
    [x + w * 0.5, y - h],
    [x + w * 0.25, y - h * 0.5],
    [x, y - h * 1.05],
    [x - w * 0.25, y - h * 0.5],
    [x - w * 0.5, y - h],
    [x - w / 2, y - h * 0.3],
  ]);
}

export function LocandaDelRe({ k }: { k: Ctx }) {
  const { c } = k;
  const R = room([124, 36, 476, 156]);
  const beams = [0.12, 0.3, 0.5, 0.72, 0.92].map(t => poly([R.P(t, 0, 0), R.P(t, 1, 0), R.P(t + 0.05, 1, 0), R.P(t + 0.05, 0, 0)])).join('');
  const flags = R.floor;
  const stones = [0.2, 0.45, 0.7].map(t => `M${R.P(t, 0, 1).join(' ')}L${R.P(t, 1, 1).join(' ')}`).join('') + [0.2, 0.4, 0.6, 0.8].map(u => `M${R.P(0, u, 1).join(' ')}L${R.P(1, u, 1).join(' ')}`).join('');
  const flames = 'M276 150Q272 132 284 118Q284 132 292 134Q290 116 300 100Q306 120 312 128Q316 118 318 112Q330 130 324 150Z';
  return (
    <G>
      <Defs>
        {lin(k, 'wall', [[0, '#E8C08A'], [1, '#C89462']])}
        {lin(k, 'side', [[0, '#A8703E'], [1, '#D8A870']], [0, 0, 1, 0])}
        {lin(k, 'sideR', [[0, '#D8A870'], [1, '#A06636']], [0, 0, 1, 0])}
        {lin(k, 'ceil', [[0, '#3A1E14'], [1, '#6A3A22']])}
        {lin(k, 'floor', [[0, '#B88A64'], [1, '#6A4232']])}
        {lin(k, 'fire', [[0, '#FFF2B0'], [0.5, '#FFB040'], [1, '#E0502A']])}
        {lin(k, 'banner', [[0, '#C8283A'], [1, '#8A1426']])}
      </Defs>
      <Fill k={k} name="wall" />
      <Path d={R.ceil} fill={k.url('ceil')} />
      <Path d={beams} fill={c('#2A140C')} />
      <Path d={R.left} fill={k.url('side')} />
      <Path d={R.right} fill={k.url('sideR')} />
      {/* Le finestrelle sui muri laterali, con il sole basso. */}
      <Path d={R.side(-1, 0.45, 0.62, 0.32, 0.6) + R.side(1, 0.45, 0.62, 0.32, 0.6)} fill={c('#FFE2A0')} />
      <Path d={flags} fill={k.url('floor')} />
      <Path d={stones} stroke={c('#4A2A1E')} strokeWidth={1} opacity={0.45} />
      {/* Il grande camino di pietra con il fuoco acceso. */}
      <Glow k={k} name="fire" x={300} y={136} r={150} color="#FFB050" op={0.6} />
      <Path d={rects([[244, 36, 112, 54]])} fill={c('#C8A07A')} />
      <Path d={rects([[226, 88, 148, 10], [234, 98, 22, 58], [344, 98, 22, 58]])} fill={c('#D8B48A')} />
      <Path d={rects([[256, 98, 88, 58]])} fill={c('#2A140C')} />
      {k.dim ? null : <Path d={flames} fill={k.url('fire')} />}
      <Path d={rects([[270, 148, 60, 5]])} fill={c('#4A2A1A')} />
      {/* La corona sopra il camino e gli stendardi. */}
      <Path d={crown(300, 76, 30)} fill={c('#F2C24A')} />
      <Path d={rects([[284, 76, 32, 4]])} fill={c('#C8962E')} />
      <Path d={dots([[300, 70, 2.2], [290, 72, 1.6], [310, 72, 1.6]])} fill={c('#C8283A')} />
      {[196, 386].map(x => (
        <G key={x}>
          <Path d={`M${x - 2} 44H${x + 22}`} stroke={c('#3A1E14')} strokeWidth={2} />
          <Path d={poly([[x, 46], [x + 20, 46], [x + 20, 110], [x + 10, 102], [x, 110]])} fill={k.url('banner')} />
          <Path d={crown(x + 10, 76, 12)} fill={c('#F2C24A')} />
          <Path d={rects([[x, 46, 20, 3]])} fill={c('#F2C24A')} />
        </G>
      ))}
      {/* Il lampadario a ruota con le candele. */}
      <Path d="M300 0V24M282 24L300 8L318 24" stroke={c('#2A140C')} strokeWidth={1.2} fill="none" />
      <Ellipse cx={300} cy={26} rx={30} ry={5} fill="none" stroke={c('#4A2A1A')} strokeWidth={3} />
      <Path d={rects([270, 284, 300, 316, 330].map(x => [x - 1.5, 15, 3, 9]))} fill={c('#F4E8D2')} />
      {k.dim ? null : <Path d={dots([270, 284, 300, 316, 330].map(x => [x, 11, 4]))} fill="#FFE7A0" opacity={0.4} />}
      <Path d={dots([270, 284, 300, 316, 330].map(x => [x, 12, 1.6]))} fill={c('#FFD27A')} />
      <Ground k={k} from={140} color="#2A0E06" op={0.45} />
      <StrawChair k={k} x={240} y={200} s={1.1} dir={1} />
      <StrawChair k={k} x={360} y={200} s={1.1} dir={-1} />
      <CardTable k={k} x={300} y={168} w={92} felt="#8A2232" wood="#4E2A1A" rim="#E2B868" back="#1E5A4A" />
      <Vignette k={k} color="#2A0E06" op={0.4} />
    </G>
  );
}

