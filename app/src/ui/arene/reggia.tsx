// Capitolo III, «Il prestigio»: la reggia. Saloni di palazzo in luce fredda (luna, cristallo, marmo
// bianco-azzurro) con l'oro e la porpora: specchi, lampadari di cristallo, colonne, troni.

import { Defs, G, Path } from 'react-native-svg';
import { crown } from './borgo';
import { shield } from './circolo';
import {
  arches,
  CardTable,
  cardBacks,
  chair,
  Chandelier,
  checker,
  Columns,
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
  rays,
  rects,
  room,
  sparkles,
  starField,
  Vignette,
} from './kit';

/** I colori della reggia. */
export const R = {
  purple: '#4A1A6E',
  purpleD: '#24093E',
  royal: '#7A2E9E',
  gold: '#F0C858',
  goldL: '#FFF0B0',
  goldD: '#A87A22',
  ice: '#D8ECFF',
  iceD: '#7A9ACE',
  marble: '#EEF0F8',
  marbleS: '#AEB4CE',
  night: '#16184A',
  felt: '#2A4E9A',
};

/** Una finestra alta sulla notte di luna: [x, y, w, h]. */
function MoonWindow({ k, x, y, w, h, name, moon = false }: { k: Ctx; x: number; y: number; w: number; h: number; name: string; moon?: boolean }) {
  const { c } = k;
  return (
    <>
      <Defs>{lin(k, name, [[0, '#0E1240'], [1, '#3A5AA0']])}</Defs>
      <Path d={arches([[x - 4, y - 4, w + 8, h + 6]])} fill={c(R.gold)} />
      <Path d={arches([[x, y, w, h]])} fill={k.url(name)} />
      <Path d={dots(starField(x * 7 + y, 6, [x + 3, y + 6, x + w - 3, y + h * 0.6], 0.4, 1))} fill={c('#FFFFFF')} />
      {moon ? <Path d={dots([[x + w * 0.62, y + w * 0.7, w * 0.14]])} fill={c('#F4F2E0')} /> : null}
      <Path d={rects([[x + w / 2 - 1, y + w / 2, 2, h - w / 2], [x, y + h * 0.4, w, 1.6], [x, y + h * 0.72, w, 1.6]])} fill={c(R.goldD)} />
    </>
  );
}

/** Un trono visto di fronte: il centro della seduta in (x, y), scala s. */
function Throne({ k, x, y, s, velvet = R.royal, gold = R.gold }: { k: Ctx; x: number; y: number; s: number; velvet?: string; gold?: string }) {
  const { c } = k;
  const back = `M${r1(x - 16 * s)} ${r1(y)}V${r1(y - 40 * s)}Q${r1(x - 16 * s)} ${r1(y - 62 * s)} ${r1(x)} ${r1(y - 70 * s)}Q${r1(x + 16 * s)} ${r1(y - 62 * s)} ${r1(x + 16 * s)} ${r1(y - 40 * s)}V${r1(y)}Z`;
  const pad = `M${r1(x - 11 * s)} ${r1(y - 4 * s)}V${r1(y - 40 * s)}Q${r1(x - 11 * s)} ${r1(y - 56 * s)} ${r1(x)} ${r1(y - 62 * s)}Q${r1(x + 11 * s)} ${r1(y - 56 * s)} ${r1(x + 11 * s)} ${r1(y - 40 * s)}V${r1(y - 4 * s)}Z`;
  return (
    <>
      <Path d={back} fill={c(gold)} />
      <Path d={pad} fill={c(velvet)} />
      <Path d={crown(x, y - 70 * s, 14 * s)} fill={c(gold)} />
      <Path d={dots([[x, y - 76 * s, 1.6 * s]])} fill={c('#E8384E')} />
      <Path d={rects([[x - 22 * s, y - 4 * s, 44 * s, 8 * s], [x - 24 * s, y - 20 * s, 7 * s, 18 * s], [x + 17 * s, y - 20 * s, 7 * s, 18 * s]])} fill={c(gold)} />
      <Path d={rects([[x - 18 * s, y - 8 * s, 36 * s, 6 * s]])} fill={c(mix(velvet, '#FFFFFF', 0.12))} />
      <Path d={dots([[x - 20.5 * s, y - 21 * s, 3.4 * s], [x + 20.5 * s, y - 21 * s, 3.4 * s]])} fill={c(gold)} />
      <Path d={rects([[x - 20 * s, y + 4 * s, 4 * s, 12 * s], [x + 16 * s, y + 4 * s, 4 * s, 12 * s]])} fill={c(mix(gold, '#000000', 0.25))} />
    </>
  );
}

/** Un busto di marmo su colonnina: base in (x, y), alto h. */
function busts(list: number[][]) {
  return list
    .map(([x, y, h]) => {
      const s = h / 60;
      return (
        rects([[x - 9 * s, y - 34 * s, 18 * s, 34 * s], [x - 12 * s, y - 37 * s, 24 * s, 4 * s], [x - 12 * s, y - 3 * s, 24 * s, 3 * s]]) +
        `M${r1(x - 13 * s)} ${r1(y - 37 * s)}Q${r1(x - 13 * s)} ${r1(y - 46 * s)} ${r1(x - 4 * s)} ${r1(y - 48 * s)}V${r1(y - 51 * s)}H${r1(x + 4 * s)}V${r1(y - 48 * s)}Q${r1(x + 13 * s)} ${r1(y - 46 * s)} ${r1(x + 13 * s)} ${r1(y - 37 * s)}Z` +
        `M${r1(x - 6 * s)} ${r1(y - 56 * s)}a${r1(6 * s)} ${r1(7 * s)} 0 1 0 ${r1(12 * s)} 0a${r1(6 * s)} ${r1(7 * s)} 0 1 0 ${r1(-12 * s)} 0z`
      );
    })
    .join('');
}

/* ------------------------------------------------------------------ 13. Il Club dei Signori */

export function ClubDeiSignori({ k }: { k: Ctx }) {
  const { c } = k;
  // Le librerie: file di dorsi di libri su più ripiani.
  const books: Record<string, number[][]> = {};
  const cols = ['#2E4A6E', '#6A1E2E', '#1E4A3A', '#8A6A3A', '#3A2A4E'];
  let seed = 3;
  const next = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const shelves: number[][] = [];
  for (const [x0, x1] of [[16, 196], [404, 584]]) {
    for (const sy of [52, 86, 120, 154]) {
      shelves.push([x0 - 2, sy, x1 - x0 + 4, 3]);
      for (let x = x0; x < x1 - 4; ) {
        const w = 4 + Math.floor(next() * 4);
        const h = 20 + next() * 10;
        (books[cols[Math.floor(next() * cols.length)]] ??= []).push([x, sy - h, w, h]);
        x += w + 0.8;
      }
    }
  }
  const allBooks = Object.values(books).flat();
  return (
    <G>
      <Defs>
        {lin(k, 'wall', [[0, '#1E2E3E'], [1, '#14202C']])}
        {lin(k, 'shelf', [[0, '#3A2014'], [1, '#22120A']])}
        {lin(k, 'floor', [[0, '#3A2418'], [1, '#100806']])}
        {lin(k, 'moon', [[0, '#CFE2FF', 0.35], [1, '#CFE2FF', 0]])}
        {lin(k, 'leather', [[0, '#7A3A22'], [1, '#4A1E12']])}
      </Defs>
      <Fill k={k} name="wall" />
      {/* Le librerie a tutta altezza. */}
      <Path d={rects([[8, 10, 196, 168], [396, 10, 196, 168]])} fill={k.url('shelf')} />
      {Object.entries(books).map(([col, list]) => (
        <Path key={col} d={rects(list)} fill={c(col)} />
      ))}
      <Path d={rects(allBooks.filter((_, i) => i % 3 === 0).map(([x, y, w, h]) => [x, y + h * 0.2, w, 1.4]))} fill={c(R.gold)} opacity={0.8} />
      <Path d={rects(shelves)} fill={c('#5A341E')} />
      <Path d={rects([[4, 6, 204, 6], [392, 6, 204, 6]])} fill={c(R.gold)} />
      {/* La finestra alta sulla luna, al centro, con le tende. */}
      <MoonWindow k={k} name="win" x={250} y={22} w={100} h={110} moon />
      <Path d="M236 14H266Q256 70 262 140H232ZM364 14H334Q344 70 338 140H368Z" fill={c('#1E3A5A')} />
      <Path d={rects([[228, 10, 144, 6]])} fill={c(R.gold)} />
      <Path d={rects([[240, 132, 120, 6]])} fill={c('#5A341E')} />
      {/* Il busto sul davanzale e il globo. */}
      <Path d={busts([[226, 176, 44]])} fill={c(R.marble)} />
      <Path d={dots([[374, 154, 12]])} fill={c('#3A6A8A')} />
      <Path d="M362 154H386M374 142V166" stroke={c(R.gold)} strokeWidth={1} />
      <Path d={rects([[372, 166, 4, 10], [366, 174, 16, 3]])} fill={c(R.gold)} />
      <Path d={rects([[0, 176, 600, 24]])} fill={k.url('floor')} />
      {k.dim ? null : <Path d={poly([[250, 132], [350, 132], [420, 200], [180, 200]])} fill={k.url('moon')} />}
      <Path d={ovals([[300, 188, 140, 10]])} fill={c('#2A3A5A')} />
      <Ground k={k} from={130} color="#05040A" op={0.5} />
      {/* Le poltrone di cuoio e la lampada da tavolo verde. */}
      {[1, -1].map(dir => {
        const x = 300 - dir * 70;
        return (
          <G key={dir}>
            <Path d={`M${x - 22} 196V160Q${x - 22} 150 ${x - 12} 150H${x + 12}Q${x + 22} 150 ${x + 22} 160V196Z`} fill={k.url('leather')} />
            <Path d={rects([[x - 26, 172, 10, 24], [x + 16, 172, 10, 24]])} fill={c('#5A2616')} />
            <Path d={dots([[x - 21, 172, 5], [x + 21, 172, 5]])} fill={c('#5A2616')} />
            <Path d={rects([[x - 16, 178, 32, 8]])} fill={c('#8A4428')} />
            <Path d={dots([[x - 12, 158, 0.9], [x, 158, 0.9], [x + 12, 158, 0.9], [x - 6, 164, 0.9], [x + 6, 164, 0.9]])} fill={c('#2A0E06')} />
          </G>
        );
      })}
      <CardTable k={k} x={300} y={172} w={78} felt={R.felt} wood="#2A160C" rim={R.gold} back="#8A1E2E" />
      <Glow k={k} name="lamp" x={300} y={150} r={30} color="#B8FFD8" op={0.4} />
      <Path d={rects([[299, 152, 2, 14], [294, 165, 12, 2]])} fill={c(R.gold)} />
      <Path d={poly([[289, 154], [311, 154], [306, 146], [294, 146]])} fill={c('#1E7A4A')} />
      <Vignette k={k} color="#02040A" op={0.5} />
    </G>
  );
}

/* ------------------------------------------------------------------ 14. La Sala di Cristallo */

export function SalaDiCristallo({ k }: { k: Ctx }) {
  const { c } = k;
  const Rm = room([200, 40, 400, 150]);
  // Pareti di specchi: pannelli in prospettiva con i riflessi a sbieco.
  const panels: string[] = [];
  const glints: string[] = [];
  for (const sd of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      const t0 = i * 0.2 + 0.015;
      const t1 = t0 + 0.17;
      panels.push(Rm.side(sd, t0, t1, 0.08, 0.86));
      const u = sd < 0 ? 0 : 1;
      const a = Rm.P(t0 + 0.04, u, 0.86);
      const b = Rm.P(t0 + 0.08, u, 0.86);
      const cc = Rm.P(t1 - 0.02, u, 0.08);
      const d = Rm.P(t1 - 0.06, u, 0.08);
      glints.push(poly([a, b, cc, d]));
    }
  }
  const backPanels = [[208, 50, 54, 92], [273, 50, 54, 92], [338, 50, 54, 92]];
  const prisms = starField(41, 26, [0, 0, 600, 120], 1, 2.6);
  return (
    <G>
      <Defs>
        {lin(k, 'side', [[0, '#8AA8DC'], [1, '#D8E8FF']], [0, 0, 1, 0])}
        {lin(k, 'sideR', [[0, '#D8E8FF'], [1, '#8AA8DC']], [0, 0, 1, 0])}
        {lin(k, 'mirror', [[0, '#F2F8FF'], [0.5, '#BCD4F4'], [1, '#E6D8F4']])}
        {lin(k, 'ceil', [[0, '#5A6AAE'], [1, '#C8D8F4']])}
        {lin(k, 'floor', [[0, '#6A7AB8'], [1, '#EAF0FF']], [0, 1, 0, 0])}
      </Defs>
      <Fill k={k} name="ceil" />
      <Path d={Rm.ceil} fill={k.url('ceil')} />
      <Path d={Rm.left} fill={k.url('side')} />
      <Path d={Rm.right} fill={k.url('sideR')} />
      <Path d={panels.join('')} fill={k.url('mirror')} />
      <Path d={panels.join('')} fill="none" stroke={c(R.gold)} strokeWidth={1.4} />
      <Path d={glints.join('')} fill={c('#FFFFFF')} opacity={0.5} />
      {/* Il pavimento lucido come uno specchio d'acqua. */}
      <Path d={Rm.floor} fill={k.url('floor')} />
      <Path d={checker(Rm.flat, 8, 10)} fill={c('#FFFFFF')} opacity={0.22} />
      {/* La parete di fondo: tre specchiere e una porta di luce. */}
      <Path d={rects([[200, 40, 200, 110]])} fill={c('#AFC4EA')} />
      <Path d={arches(backPanels.map(([x, y, w, h]) => [x - 2, y - 2, w + 4, h + 4]))} fill={c(R.gold)} />
      <Path d={arches(backPanels)} fill={k.url('mirror')} />
      <Glow k={k} name="door" x={300} y={100} r={70} color="#FFFFFF" op={0.6} />
      {/* I lampadari di cristallo, lungo la sala. */}
      <Chandelier k={k} name="ch3" x={300} y={52} s={0.45} metal={R.gold} flame="#FFFFFF" glow="#E6F2FF" hang={12} drops />
      <Chandelier k={k} name="ch2" x={300} y={34} s={0.75} metal={R.gold} flame="#FFFFFF" glow="#E6F2FF" hang={30} drops />
      <Chandelier k={k} name="ch1" x={300} y={14} s={1.25} metal={R.gold} flame="#FFFFFF" glow="#E6F2FF" hang={20} drops tiers={3} />
      <Path d={sparkles(prisms)} fill={c('#FFFFFF')} opacity={0.85} />
      <Ground k={k} from={140} color="#1A2A5A" op={0.35} />
      <Path d={chair(250, 200, 1.05, 1) + chair(350, 200, 1.05, -1)} fill={c('#E8EEF8')} />
      <CardTable k={k} x={300} y={170} w={86} felt={R.felt} wood="#C8D4EC" rim={R.gold} back="#4A6ACE" pedestal />
      <Vignette k={k} color="#1A2A6A" op={0.3} />
    </G>
  );
}

/* ------------------------------------------------------------------ 15. Il Palazzo Reale */

export function PalazzoReale({ k }: { k: Ctx }) {
  const { c } = k;
  const Rm = room([150, 34, 450, 150]);
  // Colonne lungo la sala, a coppie, sempre più piccole verso il fondo.
  const ts = [0.08, 0.32, 0.55, 0.76];
  const colsL = ts.map(t => ({ t, p: Rm.P(t, 0.07, 0), b: Rm.P(t, 0.07, 1), s: Rm.sc(t) }));
  const colsR = ts.map(t => ({ t, p: Rm.P(t, 0.93, 0), b: Rm.P(t, 0.93, 1), s: Rm.sc(t) }));
  const wins = ts.slice(0, 3).flatMap(t => [Rm.side(-1, t + 0.06, t + 0.17, 0.12, 0.62), Rm.side(1, t + 0.06, t + 0.17, 0.12, 0.62)]);
  const beams = ts.slice(0, 3).flatMap(t => {
    const a = Rm.P(t + 0.06, 0, 0.62);
    const b = Rm.P(t + 0.17, 0, 0.62);
    const a2 = Rm.P(t + 0.06, 1, 0.62);
    const b2 = Rm.P(t + 0.17, 1, 0.62);
    const fl = (p: number[], dx: number) => [p[0] + dx, Math.min(205, p[1] + 60)] as [number, number];
    return [poly([a, b, fl(b, 60), fl(a, 40)]), poly([a2, b2, fl(b2, -60), fl(a2, -40)])];
  });
  const ceilCoffers = [0.05, 0.25, 0.45, 0.65].map(t => Rm.flat(0, t, t + 0.15, 0.25, 0.75)).join('');
  return (
    <G>
      <Defs>
        {lin(k, 'side', [[0, '#C8C8E4'], [1, '#EEEAF6']], [0, 0, 1, 0])}
        {lin(k, 'sideR', [[0, '#EEEAF6'], [1, '#C8C8E4']], [0, 0, 1, 0])}
        {lin(k, 'ceil', [[0, '#6A5A9A'], [1, '#E6DCF0']])}
        {lin(k, 'floor', [[0, '#4A3A7A'], [1, '#E8E0F4']], [0, 1, 0, 0])}
        {lin(k, 'night', [[0, '#14184A'], [1, '#3A4A9A']])}
        {lin(k, 'beam', [[0, '#D8E6FF', 0.3], [1, '#D8E6FF', 0]])}
        {lin(k, 'col', [[0, '#B8B4D4'], [0.45, '#FFFFFF'], [1, '#A8A4C8']], [0, 0, 1, 0])}
      </Defs>
      <Fill k={k} name="ceil" />
      <Path d={Rm.ceil} fill={k.url('ceil')} />
      <Path d={ceilCoffers} fill={c(R.gold)} opacity={0.4} />
      <Path d={Rm.left} fill={k.url('side')} />
      <Path d={Rm.right} fill={k.url('sideR')} />
      <Path d={wins.join('')} fill={k.url('night')} />
      <Path d={wins.join('')} fill="none" stroke={c(R.gold)} strokeWidth={1.2} />
      <Path d={Rm.floor} fill={k.url('floor')} />
      <Path d={checker(Rm.flat, 10, 12)} fill={c(R.purple)} opacity={0.25} />
      {k.dim ? null : <Path d={beams.join('')} fill={k.url('beam')} />}
      {/* Il fondo: il portale con le tende di porpora e lo stemma. */}
      <Path d={rects([[150, 34, 300, 116]])} fill={c('#E2DCF0')} />
      <Path d={arches([[244, 52, 112, 98]])} fill={c(R.gold)} />
      <Path d={arches([[250, 58, 100, 92]])} fill={k.url('night')} />
      <Path d={dots(starField(9, 14, [254, 64, 346, 120], 0.4, 1.1))} fill={c('#FFFFFF')} />
      <Path d={dots([[322, 82, 7]])} fill={c('#F4F2E0')} />
      <Path d="M250 150V108Q250 58 300 58Q270 70 268 100Q266 120 276 128Q262 134 262 150ZM350 150V108Q350 58 300 58Q330 70 332 100Q334 120 324 128Q338 134 338 150Z" fill={c(R.royal)} />
      <Path d={dots([[272, 128, 3], [328, 128, 3]])} fill={c(R.gold)} />
      <Path d={crown(300, 48, 22)} fill={c(R.gold)} />
      {/* Le colonne di marmo. */}
      {[...colsL, ...colsR].map(({ p, b, s }, i) => (
        <Columns key={i} k={k} xs={[p[0]]} top={p[1] + 4 * s} bottom={b[1] - 2 * s} w={7 * s} shaft={k.url('col')} cap={R.gold} />
      ))}
      {/* La fila di lampadari. */}
      {ts.map((t, i) => {
        const [x, y] = Rm.P(t + 0.05, 0.5, 0.06);
        const s = Rm.sc(t + 0.05) / 2.4;
        return <Chandelier key={i} k={k} name={`ch${i}`} x={x} y={y} s={s} metal={R.gold} glow="#FFF0C8" flame="#FFFBEA" drops hang={y + 4} />;
      })}
      {/* Il tappeto di porpora. */}
      <Path d={Rm.flat(1, 0, 1, 0.38, 0.62)} fill={c(R.royal)} />
      <Path d={Rm.flat(1, 0, 1, 0.4, 0.6)} fill="none" stroke={c(R.gold)} strokeWidth={1.2} />
      <Ground k={k} from={140} color="#14082A" op={0.4} />
      <Path d={chair(250, 200, 1.05, 1) + chair(350, 200, 1.05, -1)} fill={c(R.purpleD)} />
      <CardTable k={k} x={300} y={170} w={86} felt={R.felt} wood={R.purpleD} rim={R.gold} pedestal />
      <Vignette k={k} color="#14082A" op={0.35} />
    </G>
  );
}

/* ------------------------------------------------------------------ 16. La Corte dei Re */

export function CorteDeiRe({ k }: { k: Ctx }) {
  const { c } = k;
  // Le gradinate del trono: tre gradini sempre più stretti.
  const steps = [0, 1, 2].map(i => [300 - 100 + i * 18, 150 - i * 8, 200 - i * 36, 8]);
  const banners = [70, 130, 470, 530];
  return (
    <G>
      <Defs>
        {lin(k, 'wall', [[0, '#2A1E5A'], [1, '#4A3A8A']])}
        {lin(k, 'canopy', [[0, '#8A2EAE'], [1, '#4A1268']])}
        {lin(k, 'curtain', [[0, '#7A2A9E'], [0.5, '#A04AC8'], [1, '#5A1A7A']], [0, 0, 1, 0])}
        {lin(k, 'floor', [[0, '#C8C4E0'], [1, '#5A5490']])}
        {lin(k, 'step', [[0, '#F2EEF8'], [1, '#B8B4D4']])}
        {lin(k, 'banner', [[0, '#2A4A9A'], [1, '#14245A']])}
        {lin(k, 'col', [[0, '#9A96C4'], [0.45, '#F4F2FF'], [1, '#8A86B4']], [0, 0, 1, 0])}
      </Defs>
      <Fill k={k} name="wall" />
      {/* La luce fredda dall'alto e i gigli dorati sulla parete. */}
      <Glow k={k} name="halo" x={300} y={80} r={140} color="#C8DCFF" op={0.45} />
      <Path d={sparkles(Array.from({ length: 24 }, (_, i) => [30 + (i % 12) * 49 + (Math.floor(i / 12) % 2) * 24, 30 + Math.floor(i / 12) * 44, 3]))} fill={c(R.gold)} opacity={0.35} />
      {/* Gli stendardi e le colonne. */}
      {banners.map(x => (
        <G key={x}>
          <Path d={poly([[x - 16, 10], [x + 16, 10], [x + 16, 110], [x, 98], [x - 16, 110]])} fill={k.url('banner')} />
          <Path d={crown(x, 50, 18)} fill={c(R.gold)} />
          <Path d={rects([[x - 18, 6, 36, 5]])} fill={c(R.gold)} />
          <Path d={poly([[x - 16, 104], [x, 92], [x + 16, 104], [x + 16, 110], [x, 98], [x - 16, 110]])} fill={c(R.gold)} />
        </G>
      ))}
      <Columns k={k} xs={[24, 176, 424, 576]} top={14} bottom={164} w={14} shaft={k.url('col')} cap={R.gold} />
      {/* Il baldacchino con le tende di velluto. */}
      <Path d="M206 20H394L384 36H216Z" fill={k.url('canopy')} />
      <Path d={Array.from({ length: 9 }, (_, i) => `M${216 + i * 21} 36q10.5 9 21 0z`).join('')} fill={c(R.gold)} />
      <Path d={rects([[202, 16, 196, 5]])} fill={c(R.gold)} />
      <Path d={crown(300, 16, 26)} fill={c(R.gold)} />
      <Path d="M216 36H252Q236 90 246 150H212Q206 90 216 36ZM384 36H348Q364 90 354 150H388Q394 90 384 36Z" fill={k.url('curtain')} />
      <Path d="M252 36Q240 76 230 82M348 36Q360 76 370 82" stroke={c(R.gold)} strokeWidth={1.6} fill="none" />
      <Path d={rects([[252, 36, 96, 114]])} fill={c('#2A0E44')} />
      <Path d={shield(300, 44, 26)} fill={c(R.purple)} />
      <Path d={shield(300, 44, 26)} fill="none" stroke={c(R.gold)} strokeWidth={1.4} />
      {/* Il trono sui gradini. */}
      <Glow k={k} name="throne" x={300} y={110} r={60} color="#FFE6A0" op={0.45} />
      <Path d={rects([[0, 150, 600, 50]])} fill={k.url('floor')} />
      <Path d={rects(steps)} fill={k.url('step')} />
      <Path d={rects(steps.map(([x, y, w]) => [x, y, w, 1.6]))} fill={c(R.gold)} />
      <Throne k={k} x={300} y={124} s={0.86} />
      <Path d={poly([[264, 150], [336, 150], [380, 204], [220, 204]])} fill={c(R.royal)} />
      <Path d={poly([[268, 150], [332, 150], [372, 204], [228, 204]])} fill="none" stroke={c(R.gold)} strokeWidth={1.2} />
      <Ground k={k} from={140} color="#0E0626" op={0.4} />
      <Path d={chair(244, 200, 1.05, 1) + chair(356, 200, 1.05, -1)} fill={c(R.purpleD)} />
      <CardTable k={k} x={300} y={174} w={84} felt={R.felt} wood={R.purpleD} rim={R.gold} pedestal />
      <Vignette k={k} color="#0E0626" op={0.4} />
    </G>
  );
}

/* ------------------------------------------------------------------ 17. La Sala degli Imperatori */

export function SalaDegliImperatori({ k }: { k: Ctx }) {
  const { c } = k;
  // L'abside con il mosaico d'oro a tessere.
  const tiles: number[][] = [];
  for (let y = 26; y < 140; y += 7) for (let x = 216 + ((y / 7) % 2) * 3.5; x < 384; x += 7) {
    const dx = (x - 300) / 84;
    const dy = (y - 110) / 84;
    if (y < 110 && dx * dx + dy * dy > 1) continue;
    tiles.push([x, y, 5.4, 5.4]);
  }
  const bustList = [[60, 150, 56], [140, 150, 56], [460, 150, 56], [540, 150, 56]];
  return (
    <G>
      <Defs>
        {lin(k, 'wall', [[0, '#3A1240'], [1, '#5A1E5A']])}
        {lin(k, 'apse', [[0, '#FFE8A0'], [0.6, '#E8B44A'], [1, '#A8701E']])}
        {lin(k, 'porphyry', [[0, '#5A1428'], [0.45, '#A8304A'], [1, '#4A1020']], [0, 0, 1, 0])}
        {lin(k, 'floor', [[0, '#E8E4F0'], [1, '#7A6A8A']])}
        {lin(k, 'marble', [[0, '#FFFFFF'], [1, '#B8BCD0']], [0, 0, 1, 0])}
      </Defs>
      <Fill k={k} name="wall" />
      {/* L'abside dorata, con i raggi di un sole al centro. */}
      <Glow k={k} name="apse" x={300} y={90} r={150} color="#FFD878" op={0.5} />
      <Path d={arches([[208, 18, 184, 132]])} fill={c('#F2EEF8')} />
      <Path d={arches([[216, 26, 168, 124]])} fill={k.url('apse')} />
      <Path d={rects(tiles)} fill={c('#FFF4C8')} opacity={0.22} />
      <Path d={rays(300, 96, 72, 16, Math.PI, Math.PI * 2, 0.08)} fill={c('#FFFBEA')} opacity={0.35} />
      <Path d={dots([[300, 96, 14]])} fill={c('#FFF8DA')} />
      {/* La corona d'alloro sopra l'abside. */}
      <Path d={Array.from({ length: 7 }, (_, i) => {
        const a = Math.PI * (0.62 + i * 0.07);
        const x = 300 + Math.cos(a) * 26;
        const y = 70 + Math.sin(a) * 26;
        const x2 = 300 - Math.cos(a) * 26;
        return `M${r1(x)} ${r1(y)}q-4 -5 0 -9q4 4 0 9zM${r1(x2)} ${r1(y)}q4 -5 0 -9q-4 4 0 9z`;
      }).join('')} fill={c('#5A7A2A')} />
      {/* Le colonne di porfido e i busti dei grandi. */}
      <Columns k={k} xs={[196, 404]} top={20} bottom={150} w={14} shaft={k.url('porphyry')} cap={R.gold} />
      <Columns k={k} xs={[100, 500]} top={30} bottom={150} w={12} shaft={k.url('porphyry')} cap={R.gold} />
      <Path d={busts(bustList)} fill={k.url('marble')} />
      <Path d={rects(bustList.map(([x, y]) => [x - 13, y - 37 * (56 / 60), 26, 3]))} fill={c(R.gold)} />
      {/* I drappi di porpora che scendono dall'alto. */}
      <Path d="M0 0H80Q60 30 30 36Q10 38 0 30ZM600 0H520Q540 30 570 36Q590 38 600 30Z" fill={c(R.royal)} />
      <Path d="M0 30Q10 38 30 36Q60 30 80 0" stroke={c(R.gold)} strokeWidth={2} fill="none" />
      <Path d="M600 30Q590 38 570 36Q540 30 520 0" stroke={c(R.gold)} strokeWidth={2} fill="none" />
      {/* Il pavimento a intarsi di marmo con il cerchio di porfido. */}
      <Path d={rects([[0, 150, 600, 50]])} fill={k.url('floor')} />
      <Path d={ovals([[300, 182, 150, 18]])} fill={c('#8A2440')} />
      <Path d={ovals([[300, 182, 138, 15]])} fill={c('#E8E4F0')} />
      <Path d={ovals([[300, 182, 120, 12]])} fill="none" stroke={c(R.gold)} strokeWidth={1.4} />
      <Path d="M0 160H600" stroke={c(R.gold)} strokeWidth={1.4} opacity={0.6} />
      <Ground k={k} from={140} color="#1A0620" op={0.4} />
      <Path d={chair(246, 200, 1.05, 1) + chair(354, 200, 1.05, -1)} fill={c(R.purpleD)} />
      <CardTable k={k} x={300} y={172} w={86} felt="#6A1E3A" wood={R.purpleD} rim={R.gold} back="#2A4E9A" pedestal />
      <Vignette k={k} color="#1A0620" op={0.4} />
    </G>
  );
}

/* ------------------------------------------------------------------ 18. Il Trono delle Carte */

export function TronoDelleCarte({ k }: { k: Ctx }) {
  const { c } = k;
  // Il trono è fatto di carte: dorsi in piedi a ventaglio per lo schienale, impilati per la seduta.
  // Lo schienale: un ventaglio di carte ruotate attorno al centro della seduta.
  const fan = Array.from({ length: 13 }, (_, i) => -66 + i * 11);
  const card = cardBacks([[-11, -70, 22, 64]]);
  const seat: number[][] = [];
  for (let r = 0; r < 3; r++) for (let j = 0; j < 4 - (r % 2); j++) seat.push([254 + (r % 2) * 11 + j * 22.5, 120 + r * 9, 21, 9]);
  const seatB = cardBacks(seat);
  // Le pile di carte ai lati, come colonne.
  const piles: number[][] = [];
  for (const x of [120, 480]) for (let r = 0; r < 12; r++) piles.push([x - 14 + (r % 2) * 1.5, 150 - r * 9, 28, 8]);
  const pilesB = cardBacks(piles);
  const stars = starField(77, 40, [0, 0, 600, 110], 0.4, 1.4);
  return (
    <G>
      <Defs>
        {lin(k, 'wall', [[0, '#0E0A34'], [0.6, '#2A1A6A'], [1, '#4A2A8A']])}
        {lin(k, 'floor', [[0, '#3A2A7A'], [1, '#120A2E']])}
        {lin(k, 'step', [[0, '#FFF0B0'], [1, '#C8902E']])}
        {lin(k, 'card', [[0, '#C8283A'], [1, '#7A0E22']])}
        {lin(k, 'gold', [[0, '#FFF4C8'], [1, '#E8B44A']])}
      </Defs>
      <Fill k={k} name="wall" />
      <Path d={dots(stars)} fill={c('#FFFFFF')} opacity={0.8} />
      {/* La raggiera d'oro dietro il trono. */}
      <Glow k={k} name="halo" x={300} y={84} r={160} color="#FFD878" op={0.6} />
      <Path d={rays(300, 90, 260, 28, Math.PI * 1.02, Math.PI * 1.98, 0.05)} fill={c(R.gold)} opacity={0.22} />
      <Path d={rays(300, 90, 180, 14, Math.PI * 1.06, Math.PI * 1.94, 0.04)} fill={c(R.goldL)} opacity={0.3} />
      {/* Le colonne di carte impilate. */}
      <Path d={pilesB.outer} fill={c('#FFF8EA')} />
      <Path d={pilesB.inner} fill={k.url('card')} />
      <Path d={rects([[100, 50, 40, 6], [460, 50, 40, 6]])} fill={k.url('gold')} />
      <Path d={crown(120, 50, 22) + crown(480, 50, 22)} fill={k.url('gold')} />
      {/* I gradini d'oro. */}
      <Path d={rects([[196, 146, 208, 10], [214, 140, 172, 7], [228, 134, 144, 7]])} fill={k.url('step')} />
      <Path d={rects([[196, 146, 208, 1.6], [214, 140, 172, 1.4], [228, 134, 144, 1.4]])} fill={c('#FFFFFF')} opacity={0.6} />
      {/* Il trono di carte. */}
      {fan.map(deg => (
        <G key={deg} transform={`translate(300 122) rotate(${deg})`}>
          <Path d={card.outer} fill={c('#FFF8EA')} />
          <Path d={card.inner} fill={k.url('card')} />
          <Path d={card.mark} fill={c(R.gold)} />
          <Path d={rects([[-11, -70, 0.8, 64]])} fill={c('#000000')} opacity={0.18} />
        </G>
      ))}
      <Path d={seatB.outer} fill={c('#FFF8EA')} />
      <Path d={seatB.inner} fill={k.url('card')} />
      <Path d={rects([[248, 117, 104, 4]])} fill={k.url('gold')} />
      <Path d={crown(300, 50, 34)} fill={k.url('gold')} />
      <Path d={dots([[300, 40, 2.6], [288, 44, 1.8], [312, 44, 1.8]])} fill={c('#E8384E')} />
      <Path d={sparkles([[252, 40, 5], [348, 48, 4], [300, 18, 4], [214, 92, 3], [386, 86, 3.4]])} fill={c('#FFFFFF')} />
      <Path d={rects([[0, 156, 600, 44]])} fill={k.url('floor')} />
      <Path d={poly([[262, 156], [338, 156], [384, 204], [216, 204]])} fill={c(R.royal)} />
      <Path d={poly([[266, 156], [334, 156], [376, 204], [224, 204]])} fill="none" stroke={c(R.gold)} strokeWidth={1.2} />
      <Ground k={k} from={140} color="#06041A" op={0.45} />
      <Path d={chair(244, 200, 1.05, 1) + chair(356, 200, 1.05, -1)} fill={c(R.goldD)} />
      <CardTable k={k} x={300} y={176} w={86} felt={R.felt} wood={R.goldD} rim={R.goldL} pedestal />
      <Vignette k={k} color="#06041A" op={0.45} />
    </G>
  );
}

