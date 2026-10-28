// Capitolo V, «Le leggende»: l'olimpo. Il cielo cosmico: viola profondo, nebulose rosa, stelle e
// tanto oro. Sono le arene più preziose della strada: ogni scena ha una sua architettura sospesa nel
// cielo, e l'ultima, la cima, è la più ricca di tutte.

import { Defs, G, Path } from 'react-native-svg';
import { crown } from './borgo';
import {
  arches,
  CardTable,
  chair,
  cloudBank,
  Columns,
  type Ctx,
  dots,
  Fill,
  Glow,
  Ground,
  lin,
  mix,
  ovals,
  pointed,
  poly,
  r1,
  rad,
  rays,
  rects,
  seeded,
  sparkles,
  starField,
  Vignette,
} from './kit';

/** I colori dell'olimpo. */
const O = {
  space: '#0A0624',
  deep: '#1E0E4A',
  violet: '#5A2A9A',
  nebula: '#C04AA0',
  gold: '#FFD25A',
  goldL: '#FFF2B8',
  goldD: '#B8801E',
  white: '#F8F4FF',
  felt: '#3A1E8A',
};

/** Il cielo cosmico: fondo, nebulose e stelle (seme fisso). */
function Cosmos({ k, seed, nebula = O.nebula, x = 300, y = 80 }: { k: Ctx; seed: number; nebula?: string; x?: number; y?: number }) {
  const { c } = k;
  const stars = starField(seed, 90, [0, 0, 600, 200], 0.35, 1.3);
  const big = starField(seed + 1, 8, [0, 0, 600, 120], 2, 4);
  return (
    <>
      <Defs>
        {lin(k, 'space', [[0, O.space], [0.55, O.deep], [1, '#4A1E7A']])}
        {rad(k, 'neb1', [[0, nebula, 0.55], [0.5, nebula, 0.18], [1, nebula, 0]], x - 150, y - 10, 180)}
        {rad(k, 'neb2', [[0, '#4A6AE0', 0.45], [0.5, '#4A6AE0', 0.12], [1, '#4A6AE0', 0]], x + 170, y + 10, 170)}
      </Defs>
      <Fill k={k} name="space" />
      {k.dim ? null : <Path d={rects([[0, 0, 600, 200]])} fill={k.url('neb1')} />}
      {k.dim ? null : <Path d={rects([[0, 0, 600, 200]])} fill={k.url('neb2')} />}
      <Path d={dots(stars)} fill={c('#FFFFFF')} opacity={0.85} />
      <Path d={sparkles(big)} fill={c('#FFF6DA')} />
    </>
  );
}

/** Una gemma sfaccettata (rombo allungato) in (x, y), alta h. */
function gem(x: number, y: number, h: number) {
  const w = h * 0.62;
  return {
    body: poly([[x, y - h / 2], [x + w / 2, y - h * 0.12], [x, y + h / 2], [x - w / 2, y - h * 0.12]]),
    face: poly([[x, y - h / 2], [x + w / 2, y - h * 0.12], [x, y]]),
  };
}

/** Un'isola sospesa: piano ovale e la roccia che scende a punta. Centro del piano in (x, y). */
function island(x: number, y: number, w: number, depth: number) {
  return {
    rock: `M${r1(x - w / 2)} ${r1(y)}Q${r1(x - w * 0.3)} ${r1(y + depth * 0.5)} ${r1(x - w * 0.06)} ${r1(y + depth)}L${r1(x)} ${r1(y + depth * 1.15)}L${r1(x + w * 0.08)} ${r1(y + depth * 0.95)}Q${r1(x + w * 0.32)} ${r1(y + depth * 0.45)} ${r1(x + w / 2)} ${r1(y)}Z`,
    top: ovals([[x, y, w / 2, w * 0.07]]),
  };
}

/* ------------------------------------------------------------------ 25. Il Regno degli Assi */

export function RegnoDegliAssi({ k }: { k: Ctx }) {
  const { c } = k;
  // Il palazzo sull'isola al centro e quattro isolette, una per seme, ognuna con la sua gemma.
  const main = island(300, 150, 230, 46);
  const smalls = [
    { i: island(72, 92, 66, 26), col: '#FFC83A' },
    { i: island(160, 54, 50, 20), col: '#E8384E' },
    { i: island(440, 54, 50, 20), col: '#3A7AFF' },
    { i: island(528, 92, 66, 26), col: '#3ACB7A' },
  ];
  const gx = [72, 160, 440, 528];
  const gy = [70, 36, 36, 70];
  const towers = [[236, 150, 18, 66], [268, 150, 16, 84], [332, 150, 16, 84], [364, 150, 18, 66]];
  return (
    <G>
      <Cosmos k={k} seed={101} />
      <Defs>
        {lin(k, 'rock', [[0, '#6A4AA0'], [1, '#1E0E3A']])}
        {lin(k, 'palace', [[0, '#FFFFFF'], [1, '#C8BCE8']], [0, 0, 1, 0])}
        {lin(k, 'gold', [[0, O.goldL], [0.5, O.gold], [1, O.goldD]])}
        {lin(k, 'lawn', [[0, '#E8DCFF'], [1, '#B8A4E8']])}
      </Defs>
      <Glow k={k} name="halo" x={300} y={86} r={170} color="#FFD878" op={0.45} />
      {/* Le isolette dei quattro semi, con le gemme che fluttuano sopra. */}
      {smalls.map(({ i, col }, j) => {
        const g = gem(gx[j], gy[j], 18);
        return (
          <G key={j}>
            <Path d={i.rock} fill={k.url('rock')} />
            <Path d={i.top} fill={k.url('lawn')} />
            <Glow k={k} name={`g${j}`} x={gx[j]} y={gy[j]} r={20} color={col} op={0.6} />
            <Path d={g.body} fill={c(col)} />
            <Path d={g.face} fill={c('#FFFFFF')} opacity={0.4} />
          </G>
        );
      })}
      {/* Le scie di luce che legano le isole al palazzo. */}
      <Path d="M88 88Q190 120 236 130M172 52Q240 100 268 118M428 52Q360 100 332 118M512 88Q410 120 364 130" stroke={c(O.goldL)} strokeWidth={1} strokeDasharray="2 4" fill="none" opacity={0.6} />
      {/* L'isola grande con il palazzo. */}
      <Path d={main.rock} fill={k.url('rock')} />
      <Path d={main.top} fill={k.url('lawn')} />
      <Path d={rects(towers.map(([x, b, w, h]) => [x - w / 2, b - h, w, h])) + rects([[244, 108, 112, 42]])} fill={k.url('palace')} />
      <Path d={towers.map(([x, b, w, h]) => poly([[x - w / 2 - 2, b - h], [x + w / 2 + 2, b - h], [x, b - h - w * 1.4]])).join('')} fill={k.url('gold')} />
      <Path d={arches([[282, 30, 36, 120]])} fill={k.url('palace')} />
      <Path d="M282 48Q300 6 318 48Z" fill={k.url('gold')} />
      <Path d={dots([[300, 12, 3]])} fill={c(O.goldL)} />
      <Path d={pointed([[292, 60, 16, 30], [292, 104, 16, 46], [252, 118, 10, 22], [338, 118, 10, 22]])} fill={c('#FFE6A0')} />
      <Path d={pointed(towers.map(([x, b, w, h]) => [x - 3, b - h + 10, 6, 14]))} fill={c('#FFE6A0')} />
      <Path d={crown(300, 66, 16)} fill={k.url('gold')} />
      <Path d={sparkles([[300, 4, 5], [236, 70, 3], [364, 70, 3]])} fill={c('#FFFFFF')} />
      {/* Le nuvole sotto, dove si gioca. */}
      <Path d={cloudBank(5, -30, 630, 176, 22)} fill={c(mix('#8A6AC8', O.deep, 0.2))} />
      <Path d={cloudBank(11, -30, 630, 190, 18)} fill={c('#B8A0E8')} />
      <Ground k={k} from={150} color={O.space} op={0.4} />
      <Path d={chair(252, 200, 1.05, 1) + chair(348, 200, 1.05, -1)} fill={c(O.goldD)} />
      <CardTable k={k} x={300} y={176} w={80} felt={O.felt} wood={O.goldD} rim={O.gold} back="#C8283A" pedestal shadow={0.15} />
      <Vignette k={k} color={O.space} op={0.4} />
    </G>
  );
}

/* ------------------------------------------------------------------ 26. Il Palazzo dell'Eternità */

export function PalazzoDellEternita({ k }: { k: Ctx }) {
  const { c } = k;
  // La clessidra d'oro, ferma, al centro del palazzo; gli anelli del tempo le girano attorno.
  const glass = 'M276 36H324Q324 66 304 84Q300 88 304 92Q324 110 324 140H276Q276 110 296 92Q300 88 296 84Q276 66 276 36Z';
  const sand = 'M282 46H318Q316 66 302 80H298Q284 66 282 46ZM287 140Q290 122 300 118Q310 122 313 140Z';
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    return [300 + Math.cos(a) * 84, 88 + Math.sin(a) * 84, i % 3 ? 2 : 3.6];
  });
  const arcade = [[40, 40, 60, 140], [112, 52, 52, 128], [436, 52, 52, 128], [500, 40, 60, 140]];
  return (
    <G>
      <Cosmos k={k} seed={202} nebula="#8A4AE0" />
      <Defs>
        {lin(k, 'gold', [[0, O.goldL], [0.5, O.gold], [1, O.goldD]])}
        {lin(k, 'glass', [[0, '#FFFFFF', 0.5], [1, '#C8E0FF', 0.2]], [0, 0, 1, 0])}
        {lin(k, 'marble', [[0, '#F8F4FF'], [1, '#B8A8E0']])}
        {lin(k, 'floor', [[0, '#6A4AB0'], [1, '#1A0A3A']])}
      </Defs>
      {/* Le arcate di marmo ai lati, aperte sul cosmo. */}
      <Path d={rects([[0, 0, 170, 200], [430, 0, 170, 200]]) + arches(arcade)} fillRule="evenodd" fill={k.url('marble')} />
      <Path d={arches(arcade.map(([x, y, w, h]) => [x - 4, y - 4, w + 8, h + 4])) + arches(arcade)} fillRule="evenodd" fill={k.url('gold')} />
      <Path d={rects([[0, 14, 170, 4], [430, 14, 170, 4]])} fill={k.url('gold')} />
      {/* Gli anelli del tempo e il quadrante di stelle. */}
      <Glow k={k} name="time" x={300} y={88} r={140} color="#FFE08A" op={0.5} />
      <Path d={ovals([[300, 88, 96, 96]])} fill="none" stroke={c(O.gold)} strokeWidth={1.4} opacity={0.6} />
      <Path d={ovals([[300, 88, 84, 84]])} fill="none" stroke={c(O.goldL)} strokeWidth={0.8} opacity={0.6} />
      <Path d={dots(ticks)} fill={c(O.goldL)} />
      <Path d={ovals([[300, 88, 120, 22]])} fill="none" stroke={c('#C8A0FF')} strokeWidth={1.2} opacity={0.7} />
      <Path d={ovals([[300, 88, 110, 40]])} fill="none" stroke={c(O.gold)} strokeWidth={1} opacity={0.5} transform="rotate(-18 300 88)" />
      {/* La clessidra. */}
      <Path d={rects([[266, 26, 68, 10], [266, 140, 68, 10]])} fill={k.url('gold')} />
      <Path d={rects([[270, 36, 5, 104], [325, 36, 5, 104]])} fill={k.url('gold')} />
      <Path d={glass} fill={k.url('glass')} />
      <Path d={sand} fill={c('#FFD878')} />
      <Path d={glass} fill="none" stroke={c(O.goldL)} strokeWidth={1.2} />
      <Path d={dots([[300, 22, 3.4], [300, 154, 3.4]])} fill={c(O.goldL)} />
      <Path d={sparkles([[300, 10, 6], [244, 50, 3.4], [356, 126, 3.4], [214, 88, 2.6], [386, 88, 2.6]])} fill={c('#FFFFFF')} />
      {/* Il pavimento sospeso, lucido. */}
      <Path d="M120 200L190 158H410L480 200Z" fill={k.url('floor')} />
      <Path d="M190 158H410" stroke={c(O.gold)} strokeWidth={2} />
      <Path d={ovals([[300, 182, 100, 12]])} fill="none" stroke={c(O.gold)} strokeWidth={1.2} opacity={0.7} />
      <Ground k={k} from={150} color={O.space} op={0.45} />
      <Path d={chair(252, 200, 1.05, 1) + chair(348, 200, 1.05, -1)} fill={c(O.goldD)} />
      <CardTable k={k} x={300} y={176} w={80} felt={O.felt} wood={O.goldD} rim={O.gold} back="#C8283A" pedestal />
      <Vignette k={k} color={O.space} op={0.45} />
    </G>
  );
}

/* ------------------------------------------------------------------ 27. Il Trono degli Immortali */

export function TronoDegliImmortali({ k }: { k: Ctx }) {
  const { c } = k;
  // Una scalinata di nuvole che sale al trono di luce; ai lati, i troni vuoti degli altri immortali.
  const stairs = [0, 1, 2, 3, 4].map(i => [300 - 120 + i * 18, 176 - i * 12, 240 - i * 36, 12]);
  const thrones = [[110, 130, 0.7], [190, 112, 0.55], [410, 112, 0.55], [490, 130, 0.7]];
  const throne = (x: number, y: number, s: number) =>
    `M${r1(x - 16 * s)} ${r1(y)}V${r1(y - 46 * s)}Q${r1(x)} ${r1(y - 74 * s)} ${r1(x + 16 * s)} ${r1(y - 46 * s)}V${r1(y)}Z` +
    rects([[x - 22 * s, y - 6 * s, 44 * s, 8 * s], [x - 22 * s, y - 22 * s, 6 * s, 16 * s], [x + 16 * s, y - 22 * s, 6 * s, 16 * s]]);
  return (
    <G>
      <Cosmos k={k} seed={303} nebula="#E05AB0" />
      <Defs>
        {lin(k, 'gold', [[0, O.goldL], [0.5, O.gold], [1, O.goldD]])}
        {lin(k, 'light', [[0, '#FFFFFF'], [1, '#FFE6A0']])}
        {lin(k, 'cloud', [[0, '#FFF4FF'], [1, '#C8A8F0']])}
        {lin(k, 'cloudD', [[0, '#C8A8F0'], [1, '#6A4AB0']])}
      </Defs>
      {/* L'aureola enorme dietro il trono. */}
      <Glow k={k} name="halo" x={300} y={70} r={200} color="#FFE6A0" op={0.6} />
      <Path d={rays(300, 70, 300, 36, 0, Math.PI * 2, 0.04)} fill={c(O.goldL)} opacity={0.18} />
      <Path d={ovals([[300, 70, 52, 52]])} fill="none" stroke={c(O.gold)} strokeWidth={2.4} />
      <Path d={ovals([[300, 70, 60, 60]])} fill="none" stroke={c(O.goldL)} strokeWidth={0.8} opacity={0.7} />
      {/* I troni degli altri immortali, sulle loro nuvole. */}
      {thrones.map(([x, y, s], i) => (
        <G key={i}>
          <Path d={cloudBank(20 + i, x - 40 * s, x + 40 * s, y, 12 * s, false)} fill={k.url('cloudD')} opacity={0.9} />
          <Path d={throne(x, y, s)} fill={k.url('gold')} opacity={0.85} />
        </G>
      ))}
      {/* La scalinata di nuvole e il trono di luce. */}
      <Path d={cloudBank(7, -30, 630, 168, 26)} fill={k.url('cloudD')} />
      <Path d={rects(stairs)} fill={k.url('cloud')} />
      <Path d={rects(stairs.map(([x, y, w]) => [x, y, w, 2]))} fill={c(O.gold)} />
      <Path d={throne(300, 116, 1.25)} fill={k.url('gold')} />
      <Path d={`M282 112V60Q300 34 318 60V112Z`} fill={k.url('light')} />
      <Path d={crown(300, 34, 22)} fill={k.url('gold')} />
      <Path d={dots([[300, 24, 2.6], [289, 28, 1.8], [311, 28, 1.8]])} fill={c('#E8384E')} />
      <Path d={sparkles([[300, 6, 7], [254, 30, 4], [346, 30, 4], [210, 70, 3], [390, 70, 3], [300, 120, 3]])} fill={c('#FFFFFF')} />
      <Path d={cloudBank(13, -30, 630, 186, 20)} fill={k.url('cloud')} />
      <Ground k={k} from={160} color={O.space} op={0.3} />
      <Path d={chair(252, 198, 1.05, 1) + chair(348, 198, 1.05, -1)} fill={c(O.goldD)} />
      <CardTable k={k} x={300} y={172} w={80} felt={O.felt} wood={O.goldD} rim={O.gold} back="#C8283A" pedestal shadow={0.12} />
      <Vignette k={k} color={O.space} op={0.4} />
    </G>
  );
}

/* ------------------------------------------------------------------ 28. La Corona dei Tre Giochi */

export function CoronaDeiTreGiochi({ k }: { k: Ctx }) {
  const { c } = k;
  // Una corona enorme che fluttua sopra tre colonne, una per gioco (i loro colori: arancio, rosa, viola).
  const games = [['#FFA94D', '#F2600C'], ['#FF6B9A', '#C42A6E'], ['#9B6BFF', '#4A28B8']];
  const colX = [200, 300, 400];
  const band = 'M222 96Q300 108 378 96V114Q300 126 222 114Z';
  const points = poly([
    [222, 96], [210, 50], [244, 76], [262, 34], [284, 70], [300, 22], [316, 70], [338, 34], [356, 76], [390, 50], [378, 96], [300, 108],
  ]);
  return (
    <G>
      <Cosmos k={k} seed={404} nebula="#E0904A" />
      <Defs>
        {lin(k, 'gold', [[0, O.goldL], [0.45, O.gold], [1, O.goldD]])}
        {lin(k, 'goldS', [[0, O.goldD], [0.4, O.gold], [0.6, O.goldL], [1, O.goldD]], [0, 0, 1, 0])}
        {games.map(([a, b], i) => lin(k, `g${i}`, [[0, a], [1, b]], [0, 0, 1, 0]))}
        {lin(k, 'plat', [[0, '#E8DCFF'], [1, '#6A4AB0']])}
      </Defs>
      <Glow k={k} name="halo" x={300} y={74} r={190} color="#FFD878" op={0.6} />
      <Path d={rays(300, 74, 300, 24, 0, Math.PI * 2, 0.05)} fill={c(O.goldL)} opacity={0.2} />
      {/* Le tre colonne dei giochi. */}
      {colX.map((x, i) => (
        <G key={i}>
          <Glow k={k} name={`c${i}`} x={x} y={130} r={40} color={games[i][0]} op={0.45} />
          <Columns k={k} xs={[x]} top={128} bottom={168} w={14} shaft={k.url(`g${i}`)} cap={O.gold} />
          <Path d={dots([[x, 120, 5]])} fill={c(games[i][0])} />
        </G>
      ))}
      {/* La corona. */}
      <Path d={points} fill={k.url('gold')} />
      <Path d={band} fill={k.url('goldS')} />
      <Path d={dots([[210, 48, 4.4], [262, 32, 4], [300, 20, 5], [338, 32, 4], [390, 48, 4.4]])} fill={c(O.goldL)} />
      {games.map(([a], i) => {
        const g = gem(256 + i * 44, 105, 16);
        return (
          <G key={i}>
            <Path d={g.body} fill={c(a)} />
            <Path d={g.face} fill={c('#FFFFFF')} opacity={0.45} />
          </G>
        );
      })}
      <Path d={dots([[234, 105, 2.4], [278, 107, 2.4], [322, 107, 2.4], [366, 105, 2.4]])} fill={c(O.white)} />
      <Path d={sparkles([[300, 6, 7], [208, 30, 4], [392, 30, 4], [250, 120, 3], [350, 120, 3], [170, 80, 3], [430, 80, 3]])} fill={c('#FFFFFF')} />
      {/* La piattaforma. */}
      <Path d={ovals([[300, 172, 150, 16]])} fill={k.url('plat')} />
      <Path d={ovals([[300, 168, 140, 13]])} fill={c('#F4ECFF')} />
      <Path d={ovals([[300, 168, 124, 10]])} fill="none" stroke={c(O.gold)} strokeWidth={1.4} />
      <Path d={cloudBank(17, -30, 630, 182, 20)} fill={c('#8A6AC8')} />
      <Ground k={k} from={160} color={O.space} op={0.35} />
      <Path d={chair(252, 200, 1.05, 1) + chair(348, 200, 1.05, -1)} fill={c(O.goldD)} />
      <CardTable k={k} x={300} y={178} w={78} felt={O.felt} wood={O.goldD} rim={O.gold} back="#C8283A" pedestal shadow={0.15} />
      <Vignette k={k} color={O.space} op={0.4} />
    </G>
  );
}

/* ------------------------------------------------------------------ 29. L'Ultimo Tavolo */

export function UltimoTavolo({ k }: { k: Ctx }) {
  const { c } = k;
  // Una sala vuota senza pareti: un pavimento rotondo sospeso nel cosmo, una galassia a spirale
  // dietro e un solo fascio di luce sul tavolo.
  const rnd = seeded(29);
  const arm = (a0: number) =>
    Array.from({ length: 70 }, (_, i) => {
      const t = i / 70;
      const a = a0 + t * Math.PI * 2.2;
      const rr = 6 + t * 120;
      return [300 + Math.cos(a) * rr + (rnd() - 0.5) * 8, 70 + Math.sin(a) * rr * 0.36 + (rnd() - 0.5) * 4, 0.5 + rnd() * 1.1 * (1 - t * 0.5)];
    });
  const galaxy = [...arm(0), ...arm(Math.PI)];
  const tiles = Array.from({ length: 12 }, (_, i) => {
    const a0 = (i / 12) * Math.PI * 2;
    const a1 = ((i + 1) / 12) * Math.PI * 2;
    const p = (a: number, r: number) => [300 + Math.cos(a) * r, 174 + Math.sin(a) * r * 0.13] as [number, number];
    return i % 2 ? poly([p(a0, 40), p(a0, 200), p(a1, 200), p(a1, 40)]) : '';
  }).join('');
  return (
    <G>
      <Cosmos k={k} seed={505} nebula="#6A4AE0" y={60} />
      <Defs>
        {rad(k, 'core', [[0, '#FFF6DA'], [0.3, '#FFD8A0', 0.7], [1, '#C080FF', 0]], 300, 70, 70)}
        {lin(k, 'beam', [[0, '#FFF6DA', 0.55], [1, '#FFF6DA', 0.05]])}
        {lin(k, 'floor', [[0, '#3A2470'], [1, '#120838']])}
      </Defs>
      {/* La galassia. */}
      {k.dim ? null : <Path d={ovals([[300, 70, 70, 30]])} fill={k.url('core')} />}
      <Path d={dots(galaxy)} fill={c('#F4E8FF')} opacity={0.8} />
      <Path d={ovals([[300, 70, 14, 6]])} fill={c('#FFF6DA')} />
      <Path d={sparkles([[300, 70, 9]])} fill={c('#FFFFFF')} />
      {/* Il pavimento sospeso, a spicchi, con l'anello d'oro. */}
      <Path d={ovals([[300, 178, 206, 30]])} fill={c(O.deep)} opacity={0.8} />
      <Path d={ovals([[300, 174, 200, 26]])} fill={k.url('floor')} />
      <Path d={tiles} fill={c('#FFFFFF')} opacity={0.05} />
      <Path d={ovals([[300, 174, 200, 26]])} fill="none" stroke={c(O.gold)} strokeWidth={2} />
      <Path d={ovals([[300, 174, 120, 16]])} fill="none" stroke={c(O.gold)} strokeWidth={1} opacity={0.6} />
      {/* Il fascio di luce dall'alto: l'unica luce della sala. */}
      {k.dim ? null : <Path d={poly([[290, 0], [310, 0], [350, 186], [250, 186]])} fill={k.url('beam')} />}
      <Path d={ovals([[300, 176, 54, 8]])} fill={c('#FFF6DA')} opacity={k.dim ? 0.1 : 0.35} />
      <Path d={chair(250, 196, 1.05, 1) + chair(350, 196, 1.05, -1)} fill={c(O.goldD)} />
      <CardTable k={k} x={300} y={168} w={84} felt={O.felt} wood={O.goldD} rim={O.gold} back="#C8283A" pedestal shadow={0.2} />
      <Path d={sparkles([[236, 120, 3], [364, 112, 3], [270, 30, 2.4], [330, 140, 2.4]])} fill={c(O.goldL)} />
      <Vignette k={k} color={O.space} op={0.5} />
    </G>
  );
}

/* ------------------------------------------------------------------ 30. La Leggenda Vivente */

export function LeggendaVivente({ k }: { k: Ctx }) {
  const { c } = k;
  // La cima: una vetta d'oro che buca le nuvole, l'aurora sopra, le costellazioni, l'alloro e la corona.
  const rnd = seeded(30);
  // L'aurora: tre nastri ondulati, ognuno chiuso tra due curve parallele.
  const aurora = [0, 1, 2].map(i => {
    const y = 22 + i * 15;
    const pts: [number, number][] = [];
    for (let x = -20; x <= 620; x += 40) pts.push([x, y + Math.sin(x / 70 + i * 1.7) * 7 + (rnd() - 0.5) * 3]);
    const th = 7 - i * 1.5;
    let d = `M${pts[0][0]} ${r1(pts[0][1])}`;
    for (const [x, py] of pts.slice(1)) d += `L${x} ${r1(py)}`;
    for (const [x, py] of pts.slice().reverse()) d += `L${x} ${r1(py + th)}`;
    return d + 'Z';
  });
  const stars = [[86, 40], [120, 28], [150, 46], [134, 70], [470, 34], [500, 54], [530, 30], [516, 74]];
  // L'alloro: foglie a goccia lungo un arco attorno alla cima, rivolte verso l'alto.
  const laurel = (sd: number) =>
    Array.from({ length: 9 }, (_, i) => {
      const a = Math.PI / 2 - sd * (0.5 + i * 0.13);
      const x = 300 + Math.cos(a) * 68;
      const y = 74 + Math.sin(a) * 68;
      // La tangente all'arco, verso l'alto, e la normale per la larghezza della foglia.
      const tx = Math.sin(a) * sd;
      const ty = -Math.cos(a) * sd;
      const ex = x + tx * 9;
      const ey = y + ty * 9;
      const nx = -ty * 3.4;
      const ny = tx * 3.4;
      const mx = (x + ex) / 2;
      const my = (y + ey) / 2;
      return `M${r1(x)} ${r1(y)}Q${r1(mx + nx)} ${r1(my + ny)} ${r1(ex)} ${r1(ey)}Q${r1(mx - nx)} ${r1(my - ny)} ${r1(x)} ${r1(y)}Z`;
    }).join('');
  return (
    <G>
      <Cosmos k={k} seed={606} nebula="#FF7AB0" />
      <Defs>
        {lin(k, 'aurora', [[0, '#7AFFD8', 0.5], [0.5, '#FFD878', 0.5], [1, '#FF7AB0', 0.5]], [0, 0, 1, 0])}
        {lin(k, 'peak', [[0, O.goldL], [0.45, O.gold], [1, O.goldD]], [0, 0, 1, 0])}
        {lin(k, 'peakS', [[0, '#8A5A1E'], [1, '#C8902E']])}
        {lin(k, 'cloud', [[0, '#FFF4FF'], [1, '#D8B8F8']])}
        {lin(k, 'cloudD', [[0, '#E0C0FF'], [1, '#7A5AC0']])}
      </Defs>
      {/* L'aurora. */}
      {k.dim ? null : <Path d={aurora.join('')} fill={k.url('aurora')} opacity={0.55} />}
      {/* Le costellazioni. */}
      <Path d="M86 40L120 28L150 46L134 70ZM470 34L500 54L530 30M500 54L516 74" stroke={c(O.goldL)} strokeWidth={0.7} fill="none" opacity={0.6} />
      <Path d={sparkles(stars.map(([x, y]) => [x, y, 3.4]))} fill={c('#FFFFFF')} />
      {/* L'aureola d'oro e i raggi. */}
      <Glow k={k} name="halo" x={300} y={74} r={230} color="#FFD878" op={0.7} />
      <Path d={rays(300, 74, 320, 40, 0, Math.PI * 2, 0.035)} fill={c(O.goldL)} opacity={0.22} />
      <Path d={ovals([[300, 74, 64, 64]])} fill="none" stroke={c(O.gold)} strokeWidth={2.6} />
      <Path d={ovals([[300, 74, 72, 72]])} fill="none" stroke={c(O.goldL)} strokeWidth={0.8} opacity={0.8} />
      {/* Le altre vette, più basse. */}
      <Path d="M60 160L120 100L150 122L190 84L240 160ZM360 160L410 84L450 122L480 100L540 160Z" fill={c(mix('#B88AE0', O.deep, 0.25))} />
      <Path d="M190 84L176 104L190 100L204 108ZM410 84L396 108L410 100L424 104Z" fill={c('#FFFFFF')} opacity={0.7} />
      {/* La vetta d'oro. */}
      <Path d="M188 170L300 52L412 170Z" fill={k.url('peak')} />
      <Path d="M300 52L412 170H330Q320 120 300 52Z" fill={k.url('peakS')} opacity={0.55} />
      <Path d="M300 52L276 82L290 78L300 92L310 78L324 82Z" fill={c('#FFFFFF')} opacity={0.85} />
      {/* L'alloro attorno alla cima e la corona. */}
      <Path d={laurel(1) + laurel(-1)} fill={c('#7ACB6A')} />
      <Path d={crown(300, 44, 30)} fill={k.url('peak')} />
      <Path d={dots([[300, 31, 3], [286, 36, 2], [314, 36, 2]])} fill={c('#E8384E')} />
      <Path d={sparkles([[300, 4, 9], [238, 26, 5], [362, 26, 5], [214, 76, 4], [386, 76, 4], [260, 120, 3], [340, 120, 3], [300, 140, 3.4]])} fill={c('#FFFFFF')} />
      {/* Il mare di nuvole e la terrazza in cima. */}
      <Path d={cloudBank(41, -30, 630, 160, 22)} fill={k.url('cloudD')} />
      <Path d={cloudBank(43, -30, 630, 182, 22)} fill={k.url('cloud')} />
      <Path d={ovals([[300, 182, 116, 12]])} fill={c(O.gold)} />
      <Path d={ovals([[300, 180, 108, 10]])} fill={c('#FFF6DA')} />
      <Ground k={k} from={164} color={O.space} op={0.25} />
      <Path d={chair(252, 198, 1.05, 1) + chair(348, 198, 1.05, -1)} fill={c(O.goldD)} />
      <CardTable k={k} x={300} y={172} w={84} felt={O.felt} wood={O.goldD} rim={O.goldL} back="#C8283A" pedestal shadow={0.15} />
      <Vignette k={k} color={O.space} op={0.4} />
    </G>
  );
}
