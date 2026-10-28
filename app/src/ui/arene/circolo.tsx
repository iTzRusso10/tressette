// Capitolo II, «I giocatori esperti»: il circolo. Sale di circoli e palazzi nella sera dorata: boiserie
// di noce, velluto bordeaux, ottone, lampadari accesi e finestre alte sul cielo del tramonto. Il Casinò
// di Venezia è l'unica scena all'aperto: archi inflessi veneziani e acqua.

import { Defs, G, Path } from 'react-native-svg';
import {
  arches,
  CardTable,
  chair,
  Chandelier,
  checker,
  type Ctx,
  dots,
  Fill,
  Glow,
  Ground,
  lin,
  mix,
  ogees,
  ovals,
  poly,
  r1,
  rects,
  room,
  sparkles,
  Vignette,
} from './kit';

/** I colori del circolo. */
const C = {
  walnut: '#5A2E1E',
  walnutD: '#3A1A12',
  walnutL: '#8A4E30',
  bordeaux: '#7A1A2A',
  gold: '#E2B456',
  goldL: '#FFE2A0',
  flame: '#FFF2C8',
  felt: '#1E6E50',
  dusk: ['#3A2A6E', '#C8507A', '#FFB060'] as const,
};

/** Una finestra alta ad arco sul tramonto, con le tende di velluto: [x, y, w, h]. */
function TallWindow({ k, x, y, w, h, name, curtain = C.bordeaux }: { k: Ctx; x: number; y: number; w: number; h: number; name: string; curtain?: string }) {
  const { c } = k;
  return (
    <>
      <Defs>{lin(k, name, [[0, C.dusk[0]], [0.55, C.dusk[1]], [1, C.dusk[2]]])}</Defs>
      <Path d={arches([[x - 4, y - 4, w + 8, h + 6]])} fill={c(C.gold)} />
      <Path d={arches([[x, y, w, h]])} fill={k.url(name)} />
      <Path d={rects([[x + w / 2 - 1, y + w / 2, 2, h - w / 2], [x, y + h * 0.55, w, 2]])} fill={c(C.walnutD)} opacity={0.8} />
      <Path d={dots([[x + w * 0.7, y + w * 0.62, w * 0.09]])} fill={c('#FFE6B8')} opacity={0.9} />
      <Path
        d={`M${r1(x - 8)} ${r1(y - 6)}H${r1(x + w * 0.22)}Q${r1(x + w * 0.1)} ${r1(y + h * 0.5)} ${r1(x + w * 0.16)} ${r1(y + h + 2)}H${r1(x - 10)}Z` +
          `M${r1(x + w + 8)} ${r1(y - 6)}H${r1(x + w * 0.78)}Q${r1(x + w * 0.9)} ${r1(y + h * 0.5)} ${r1(x + w * 0.84)} ${r1(y + h + 2)}H${r1(x + w + 10)}Z`}
        fill={c(curtain)}
      />
      <Path d={rects([[x - 12, y - 10, w + 24, 6]])} fill={c(C.gold)} />
    </>
  );
}

/** Una poltrona di velluto vista di tre quarti: base in (x, y), dir verso il centro. */
function armchair(x: number, y: number, s: number, dir: number) {
  const b = x - dir * 10 * s;
  return {
    back: `M${r1(b - 7 * s)} ${r1(y - 14 * s)}V${r1(y - 32 * s)}Q${r1(b)} ${r1(y - 38 * s)} ${r1(b + 7 * s)} ${r1(y - 32 * s)}V${r1(y - 14 * s)}Z`,
    seat: rects([[x - 14 * s, y - 16 * s, 28 * s, 9 * s]]),
    arm: rects([[x + dir * 6 * s - 4 * s, y - 22 * s, 8 * s, 15 * s]]),
    legs: rects([[x - 12 * s, y - 7 * s, 2.4 * s, 7 * s], [x + 9.6 * s, y - 7 * s, 2.4 * s, 7 * s]]),
  };
}

function Armchairs({ k, list, color = C.bordeaux }: { k: Ctx; list: [number, number, number, number][]; color?: string }) {
  const a = list.map(([x, y, s, d]) => armchair(x, y, s, d));
  const { c } = k;
  return (
    <>
      <Path d={a.map(p => p.back).join('')} fill={c(mix(color, '#000000', 0.2))} />
      <Path d={a.map(p => p.seat).join('')} fill={c(color)} />
      <Path d={a.map(p => p.arm).join('')} fill={c(mix(color, '#FFFFFF', 0.12))} />
      <Path d={a.map(p => p.legs).join('')} fill={c(C.walnutD)} />
    </>
  );
}

/** Una coppa da trofeo con le anse: base in (x, y), alta h. */
export function cup(x: number, y: number, h: number) {
  const w = h * 0.6;
  return (
    `M${r1(x - w / 2)} ${r1(y - h)}H${r1(x + w / 2)}Q${r1(x + w / 2)} ${r1(y - h * 0.45)} ${r1(x + w * 0.08)} ${r1(y - h * 0.36)}` +
    `V${r1(y - h * 0.14)}H${r1(x + w * 0.32)}V${r1(y)}H${r1(x - w * 0.32)}V${r1(y - h * 0.14)}H${r1(x - w * 0.08)}V${r1(y - h * 0.36)}` +
    `Q${r1(x - w / 2)} ${r1(y - h * 0.45)} ${r1(x - w / 2)} ${r1(y - h)}Z` +
    `M${r1(x - w / 2)} ${r1(y - h * 0.94)}Q${r1(x - w * 0.95)} ${r1(y - h * 0.9)} ${r1(x - w * 0.45)} ${r1(y - h * 0.58)}L${r1(x - w * 0.4)} ${r1(y - h * 0.66)}Q${r1(x - w * 0.72)} ${r1(y - h * 0.84)} ${r1(x - w / 2)} ${r1(y - h * 0.84)}Z` +
    `M${r1(x + w / 2)} ${r1(y - h * 0.94)}Q${r1(x + w * 0.95)} ${r1(y - h * 0.9)} ${r1(x + w * 0.45)} ${r1(y - h * 0.58)}L${r1(x + w * 0.4)} ${r1(y - h * 0.66)}Q${r1(x + w * 0.72)} ${r1(y - h * 0.84)} ${r1(x + w / 2)} ${r1(y - h * 0.84)}Z`
  );
}

/** Uno scudo araldico: centro in alto (x, y), largo w. */
export function shield(x: number, y: number, w: number) {
  const h = w * 1.2;
  return `M${r1(x - w / 2)} ${r1(y)}H${r1(x + w / 2)}V${r1(y + h * 0.5)}Q${r1(x + w / 2)} ${r1(y + h * 0.85)} ${r1(x)} ${r1(y + h)}Q${r1(x - w / 2)} ${r1(y + h * 0.85)} ${r1(x - w / 2)} ${r1(y + h * 0.5)}Z`;
}

/* ------------------------------------------------------------------ 7. Il Circolo d'Oro */

export function CircoloDOro({ k }: { k: Ctx }) {
  const { c } = k;
  const panels: number[][] = [];
  for (let x = 6; x < 600; x += 50) panels.push([x, 128, 40, 40]);
  return (
    <G>
      <Defs>
        {lin(k, 'wall', [[0, '#8A3A2E'], [1, '#5A2420']])}
        {lin(k, 'boiserie', [[0, C.walnutL], [1, C.walnut]])}
        {lin(k, 'floor', [[0, '#6A3A24'], [1, '#2E140C']])}
        {lin(k, 'cone', [[0, '#FFE6A8', 0.45], [1, '#FFE6A8', 0.03]])}
      </Defs>
      <Fill k={k} name="wall" />
      {/* La tappezzeria a righe sottili e la boiserie. */}
      <Path d={rects(Array.from({ length: 40 }, (_, i) => [i * 15 + 5, 0, 5, 122]))} fill={c('#000000')} opacity={0.08} />
      <TallWindow k={k} name="w1" x={64} y={24} w={52} h={92} />
      <TallWindow k={k} name="w2" x={484} y={24} w={52} h={92} />
      <Path d={rects([[0, 120, 600, 56]])} fill={k.url('boiserie')} />
      <Path d={rects(panels)} fill={c(C.walnutD)} opacity={0.35} />
      <Path d={rects(panels.map(([x, y, w, h]) => [x + 3, y + 3, w - 6, h - 6]))} fill={c(C.walnutL)} opacity={0.5} />
      <Path d={rects([[0, 118, 600, 4]])} fill={c(C.gold)} />
      {/* Il grande specchio dorato con la cimasa e i candelieri. */}
      <Path d={rects([[234, 34, 132, 80]])} fill={c(C.gold)} />
      <Path d={poly([[240, 34], [360, 34], [330, 22], [300, 16], [270, 22]])} fill={c(C.gold)} />
      <Path d={rects([[240, 40, 120, 72]])} fill={c('#C88A64')} />
      <Path d={rects([[246, 46, 108, 66]])} fill={c('#E2AE84')} opacity={0.55} />
      <Path d="M262 112L306 46H322L278 112Z" fill={c('#FFFFFF')} opacity={0.16} />
      <Path d={dots([[300, 26, 3]])} fill={c(C.bordeaux)} />
      <Path d={rects([[208, 112, 184, 8]])} fill={c(C.walnutD)} />
      <Path d={rects([[208, 112, 184, 2]])} fill={c(C.gold)} />
      <Path d={rects([[220, 92, 6, 20], [374, 92, 6, 20]])} fill={c(C.gold)} />
      <Path d={dots([[223, 88, 2.4], [377, 88, 2.4]])} fill={c(C.flame)} />
      <Glow k={k} name="c1" x={223} y={88} r={20} color="#FFE6A8" op={0.6} />
      <Glow k={k} name="c2" x={377} y={88} r={20} color="#FFE6A8" op={0.6} />
      {/* Il lampadario. */}
      <Chandelier k={k} name="ch" x={300} y={46} s={1.1} metal={C.gold} glow="#FFE6A8" hang={48} drops />
      {/* Il pavimento a spina di pesce e il tappeto. */}
      <Path d={rects([[0, 176, 600, 24]])} fill={k.url('floor')} />
      <Path d={Array.from({ length: 40 }, (_, i) => `M${i * 16} 176L${i * 16 + 8} 200M${i * 16 + 16} 176L${i * 16 + 8} 200`).join('')} stroke={c('#000000')} strokeWidth={0.8} opacity={0.2} />
      <Path d={poly([[150, 182], [450, 182], [500, 204], [100, 204]])} fill={c(C.bordeaux)} />
      <Path d={poly([[160, 185], [440, 185], [482, 204], [118, 204]])} fill="none" stroke={c(C.gold)} strokeWidth={1.4} />
      <Ground k={k} from={130} color="#1A0604" op={0.4} />
      {k.dim ? null : <Path d={poly([[276, 46], [324, 46], [372, 176], [228, 176]])} fill={k.url('cone')} />}
      <Armchairs k={k} list={[[110, 188, 1.15, 1], [490, 188, 1.15, -1]]} />
      <Path d={chair(246, 200, 1.05, 1) + chair(354, 200, 1.05, -1)} fill={c(C.walnutD)} />
      <CardTable k={k} x={300} y={168} w={90} felt={C.felt} wood={C.walnut} rim={C.gold} />
      <Vignette k={k} color="#1A0604" op={0.4} />
    </G>
  );
}

/* ------------------------------------------------------------------ 8. La Sala dei Maestri */

export function SalaDeiMaestri({ k }: { k: Ctx }) {
  const { c } = k;
  const R = room([210, 44, 390, 150]);
  // I ritratti lungo le pareti: cornici d'oro con dentro solo un fondo scuro e uno stemma.
  const frames = [0.04, 0.3, 0.52, 0.7].flatMap(t => [R.side(-1, t, t + 0.14, 0.2, 0.62), R.side(1, t, t + 0.14, 0.2, 0.62)]);
  const inner = [0.04, 0.3, 0.52, 0.7].flatMap(t => [R.side(-1, t + 0.02, t + 0.12, 0.25, 0.57), R.side(1, t + 0.02, t + 0.12, 0.25, 0.57)]);
  const lamps = [0.17, 0.42, 0.62].flatMap(t => [R.P(t, 0, 0.18), R.P(t, 1, 0.18)]);
  const pil = [0, 0.2, 0.46, 0.66, 0.84].flatMap(t => [R.side(-1, t - 0.025, t + 0.025, 0, 1), R.side(1, t - 0.025, t + 0.025, 0, 1)]);
  const carpet = R.flat(1, 0, 1, 0.3, 0.7);
  const border = R.flat(1, 0, 1, 0.33, 0.67);
  const coffers = [0.1, 0.3, 0.5, 0.7, 0.88].map(t => R.flat(0, t, t + 0.12, 0.2, 0.8)).join('');
  return (
    <G>
      <Defs>
        {lin(k, 'side', [[0, '#3E1A1E'], [1, '#7A2E30']], [0, 0, 1, 0])}
        {lin(k, 'sideR', [[0, '#7A2E30'], [1, '#3E1A1E']], [0, 0, 1, 0])}
        {lin(k, 'ceil', [[0, '#2A1210'], [1, '#6A3420']])}
        {lin(k, 'floor', [[0, '#2A1210'], [1, '#8A5A3A']], [0, 1, 0, 0])}
        {lin(k, 'end', [[0, C.dusk[0]], [0.5, C.dusk[1]], [1, C.dusk[2]]])}
      </Defs>
      <Fill k={k} name="ceil" />
      <Path d={R.ceil} fill={k.url('ceil')} />
      <Path d={coffers} fill={c(C.gold)} opacity={0.35} />
      <Path d={R.left} fill={k.url('side')} />
      <Path d={R.right} fill={k.url('sideR')} />
      <Path d={R.floor} fill={k.url('floor')} />
      <Path d={checker(R.flat, 10, 8, 0, 1)} fill={c('#000000')} opacity={0.12} />
      {/* In fondo: la vetrata sul tramonto e il ritratto più grande, quello del primo campione. */}
      <Path d={rects([[210, 44, 180, 106]])} fill={c('#5A2226')} />
      <Path d={arches([[232, 54, 38, 80], [330, 54, 38, 80]])} fill={k.url('end')} />
      <Path d={rects([[274, 58, 52, 66]])} fill={c(C.gold)} />
      <Path d={rects([[279, 63, 42, 56]])} fill={c('#2A1418')} />
      <Path d={shield(300, 74, 20)} fill={c(C.bordeaux)} />
      <Path d={shield(300, 74, 20)} fill="none" stroke={c(C.gold)} strokeWidth={1.4} />
      <Path d={sparkles([[300, 86, 5]])} fill={c(C.goldL)} />
      {/* Le lesene, i ritratti e le appliques. */}
      <Path d={pil.join('')} fill={c('#2A1012')} opacity={0.5} />
      <Path d={frames.join('')} fill={c(C.gold)} />
      <Path d={inner.join('')} fill={c('#2A1418')} />
      {[0.04, 0.3, 0.52, 0.7].flatMap((t, i) => [-1, 1].map(sd => {
        const [x, y] = R.P(t + 0.07, sd < 0 ? 0 : 1, 0.36);
        const s = R.sc(t + 0.07);
        return <Path key={`${i}${sd}`} d={shield(x, y, 9 * s / 1.6)} fill={c(['#2E5A8A', C.bordeaux, '#2E7A5A', '#6A3A8A'][i])} />;
      }))}
      {lamps.map(([x, y], i) => (
        <Glow key={i} k={k} name={`l${i}`} x={x} y={y} r={16 * R.sc(0.3)} color="#FFE6A8" op={0.55} />
      ))}
      <Path d={dots(lamps.map(([x, y], i) => [x, y, Math.max(1.6, 5 - i * 0.6)]))} fill={c(C.flame)} />
      {/* Il tappeto rosso fino in fondo. */}
      <Path d={carpet} fill={c(C.bordeaux)} />
      <Path d={border} fill="none" stroke={c(C.gold)} strokeWidth={1.2} />
      <Chandelier k={k} name="ch1" x={300} y={30} s={0.7} metal={C.gold} glow="#FFE6A8" hang={40} />
      <Ground k={k} from={140} color="#1A0604" op={0.45} />
      <Path d={chair(250, 200, 1.05, 1) + chair(350, 200, 1.05, -1)} fill={c(C.walnutD)} />
      <CardTable k={k} x={300} y={170} w={82} felt={C.felt} wood={C.walnut} rim={C.gold} />
      <Vignette k={k} color="#1A0604" op={0.4} />
    </G>
  );
}

/* ------------------------------------------------------------------ 9. Il Palazzo delle Carte */

export function PalazzoDelleCarte({ k }: { k: Ctx }) {
  const { c } = k;
  // Lo scalone a due rampe che salgono ai lati verso il ballatoio.
  const flight = (sd: number) => {
    const steps: string[] = [];
    const n = 9;
    for (let i = 0; i < n; i++) {
      const y = 170 - i * 8;
      const xa = 300 + sd * (40 + i * 13);
      const xb = 300 + sd * (40 + (i + 1) * 13 + 70);
      steps.push(poly([[xa, y], [xb, y], [xb, y - 8], [xa, y - 8]]));
    }
    return steps.join('');
  };
  const balusters: number[][] = [];
  for (let x = 128; x < 472; x += 9) balusters.push([x, 84, 3.4, 12]);
  return (
    <G>
      <Defs>
        {lin(k, 'wall', [[0, '#C88A5A'], [0.6, '#E8B47A'], [1, '#A8683E']])}
        {lin(k, 'stair', [[0, '#F2E2C8'], [1, '#C8A47E']])}
        {lin(k, 'floor', [[0, '#E8D2B0'], [1, '#8A6A4E']])}
        {lin(k, 'portal', [[0, C.dusk[0]], [0.5, C.dusk[1]], [1, C.dusk[2]]])}
      </Defs>
      <Fill k={k} name="wall" />
      {/* Il ballatoio con il portale aperto sul tramonto. */}
      <Path d={arches([[262, 22, 76, 74]])} fill={c(C.gold)} />
      <Path d={arches([[268, 28, 64, 68]])} fill={k.url('portal')} />
      <Path d={rects([[299, 46, 2, 50], [268, 66, 64, 2]])} fill={c(C.walnutD)} opacity={0.6} />
      <Path d={arches([[140, 30, 46, 66], [414, 30, 46, 66]])} fill={c('#7A3A28')} />
      <Path d={arches([[146, 36, 34, 60], [420, 36, 34, 60]])} fill={c('#5A2620')} />
      <Path d={rects([[120, 96, 360, 8]])} fill={c('#F2E2C8')} />
      <Path d={rects(balusters)} fill={c('#F2E2C8')} />
      <Path d={rects([[120, 82, 360, 4]])} fill={c('#F2E2C8')} />
      {/* Le colonne binate ai lati. */}
      <Path d={rects([[20, 20, 16, 160], [44, 20, 16, 160], [540, 20, 16, 160], [564, 20, 16, 160]])} fill={c('#F0DEC0')} />
      <Path d={rects([[16, 14, 48, 8], [536, 14, 48, 8], [16, 176, 48, 8], [536, 176, 48, 8]])} fill={c(C.gold)} />
      {/* Le due rampe e il pianerottolo. */}
      <Path d={flight(-1) + flight(1)} fill={k.url('stair')} />
      <Path d={[-1, 1].map(sd => Array.from({ length: 9 }, (_, i) => {
        const y = 170 - i * 8;
        return `M${300 + sd * (40 + i * 13)} ${y}H${300 + sd * (40 + (i + 1) * 13 + 70)}`;
      }).join('')).join('')} stroke={c('#A8825A')} strokeWidth={1} />
      <Path d={[-1, 1].map(sd => `M${300 + sd * 40} 170L${300 + sd * 157} 98`).join('')} stroke={c(C.gold)} strokeWidth={3} />
      <Path d={[-1, 1].map(sd => `M${300 + sd * 40} 162L${300 + sd * 157} 90`).join('')} stroke={c(C.walnut)} strokeWidth={2} />
      <Path d={rects([[30, 176, 540, 24]])} fill={k.url('floor')} />
      <Path d={poly([[260, 176], [340, 176], [380, 204], [220, 204]])} fill={c(C.bordeaux)} />
      {/* Il grande lampadario a tre ordini. */}
      <Chandelier k={k} name="ch" x={300} y={34} s={1.3} metal={C.gold} glow="#FFE6A8" hang={36} drops tiers={3} />
      <Ground k={k} from={130} color="#2A0A06" op={0.4} />
      <Path d={chair(246, 200, 1.05, 1) + chair(354, 200, 1.05, -1)} fill={c(C.walnutD)} />
      <CardTable k={k} x={300} y={170} w={86} felt={C.felt} wood={C.walnut} rim={C.gold} />
      <Vignette k={k} color="#2A0A06" op={0.35} />
    </G>
  );
}

/* ------------------------------------------------------------------ 10. Il Casinò di Venezia */

export function CasinoDiVenezia({ k }: { k: Ctx }) {
  const { c } = k;
  const sky = '#F2A27A';
  const far = mix('#8A4A6A', sky, 0.5);
  // La polifora al piano nobile e le finestre ai lati.
  const poly5 = [0, 1, 2, 3, 4].map(i => [236 + i * 26, 56, 20, 44]);
  const sideWins = [[160, 60, 16, 36], [184, 60, 16, 36], [400, 60, 16, 36], [424, 60, 16, 36]];
  const lower = [[164, 116, 32, 50], [404, 116, 32, 50]];
  const water = Array.from({ length: 12 }, (_, i) => [100 + ((i * 97) % 400), 172 + (i % 6) * 4.4, 18 + (i % 4) * 8, 1.3]);
  // I pali da ormeggio a righe.
  const poles = [118, 132, 468, 482];
  return (
    <G>
      <Defs>
        {lin(k, 'sky', [[0, '#3A2A6E'], [0.45, '#C8507A'], [0.8, '#FFA060'], [1, '#FFD08A']])}
        {lin(k, 'facade', [[0, '#F2C8A0'], [1, '#D8987A']])}
        {lin(k, 'water', [[0, '#C86A7A'], [0.4, '#5A3A7A'], [1, '#1E1A4A']])}
        {lin(k, 'lit', [[0, '#FFF0B8'], [1, '#FFB050']])}
      </Defs>
      <Fill k={k} name="sky" />
      <Glow k={k} name="sun" x={300} y={150} r={140} color="#FFC870" op={0.5} />
      {/* I palazzi lontani lungo il canale. */}
      <Path d="M0 160V96H40V84H70V100H96V90H130V160ZM470 160V92H500V80H530V98H560V88H600V160Z" fill={c(far)} />
      <Path d="M54 84V66L62 56L70 66V84ZM514 80V60L522 48L530 60V80Z" fill={c(far)} />
      <Path d={ogees([[10, 108, 8, 16], [26, 108, 8, 16], [80, 112, 8, 14], [500, 104, 8, 16], [516, 104, 8, 16], [568, 106, 8, 14]])} fill={c(mix('#FFD08A', far, 0.3))} />
      {/* Il palazzo del casinò. */}
      <Path d={rects([[144, 26, 312, 140]])} fill={k.url('facade')} />
      <Path d={rects([[140, 20, 320, 8], [140, 104, 320, 5]])} fill={c('#FFF0DC')} />
      <Path d={Array.from({ length: 26 }, (_, i) => `M${146 + i * 12} 20l6-8l6 8z`).join('')} fill={c('#FFF0DC')} />
      <Path d={rects([[230, 100, 140, 4]])} fill={c('#FFF0DC')} />
      <Path d={ogees(poly5.map(([x, y, w, h]) => [x - 2, y - 3, w + 4, h + 3]))} fill={c('#FFF0DC')} />
      <Path d={ogees(poly5)} fill={k.url('lit')} />
      <Path d={dots(poly5.slice(0, 4).map(([x]) => [x + 23, 50, 3]))} fill={c('#FFF0DC')} />
      <Path d={ogees(sideWins)} fill={c('#5A2A3A')} />
      <Path d={ogees([sideWins[1], sideWins[2]])} fill={k.url('lit')} />
      <Path d={arches(lower)} fill={c('#5A2A3A')} />
      {/* Il portale d'acqua, illuminato, e la riva. */}
      <Glow k={k} name="portal" x={300} y={140} r={60} color="#FFD080" op={0.6} />
      <Path d={arches([[262, 112, 76, 56]])} fill={c('#FFF0DC')} />
      <Path d={arches([[268, 118, 64, 50]])} fill={k.url('lit')} />
      <Path d={rects([[140, 164, 320, 6]])} fill={c('#E8D2B8')} />
      {/* L'acqua con i riflessi. */}
      <Path d={rects([[0, 160, 600, 40]])} fill={k.url('water')} />
      <Path d={rects([[0, 160, 600, 2]])} fill={c('#FFE0B0')} opacity={0.4} />
      <Path d={rects([[272, 174, 56, 2], [280, 180, 40, 2], [266, 186, 68, 2], [286, 192, 28, 2]])} fill={c('#FFD080')} opacity={0.7} />
      <Path d={rects(water)} fill={c('#FFFFFF')} opacity={0.3} />
      <Path d={rects(poles.map(x => [x - 2, 112, 4, 66]))} fill={c('#2E3A7A')} />
      <Path d={rects(poles.flatMap(x => [[x - 2, 120, 4, 6], [x - 2, 134, 4, 6], [x - 2, 148, 4, 6]]))} fill={c('#FFFFFF')} />
      <Path d={dots(poles.map(x => [x, 111, 3]))} fill={c(C.gold)} />
      {/* La gondola ormeggiata, di profilo. */}
      <Path d="M30 178Q90 186 160 176Q168 172 172 164L176 166Q172 178 160 182Q90 192 26 182Q20 178 18 170L22 170Q24 176 30 178Z" fill={c('#14101E')} />
      <Path d="M168 164L178 160L176 168Z" fill={c('#E8E0D0')} />
      {/* I lampioni della riva. */}
      {[226, 374].map(x => (
        <G key={x}>
          <Glow k={k} name={`p${x}`} x={x} y={128} r={20} color="#FFE0A0" op={0.7} />
          <Path d={`M${x - 1} 164V134h2V164Z`} fill={c('#14101E')} />
          <Path d={poly([[x - 5, 132], [x + 5, 132], [x + 3, 122], [x - 3, 122]])} fill={c('#FFE6A8')} />
        </G>
      ))}
      <Ground k={k} from={150} color="#0E0A2A" op={0.4} />
      <Vignette k={k} color="#1A0A2A" op={0.35} />
    </G>
  );
}

/* ------------------------------------------------------------------ 11. La Loggia dei Nobili */

export function LoggiaDeiNobili({ k }: { k: Ctx }) {
  const { c } = k;
  const sky = '#F4A878';
  const hills = mix('#6A3A6A', sky, 0.45);
  const bays = [[116, 40, 80, 136], [204, 40, 80, 136], [292, 40, 80, 136], [380, 40, 80, 136]].map(([x, y, w, h]) => [x - 2 + 10, y, w, h]);
  const openings = bays;
  const colsX = [116, 204, 292, 380, 468].map(x => x + 4);
  const shields = [[166, 16], [254, 16], [342, 16], [430, 16]];
  const balust: number[][] = [];
  for (let x = 120; x < 474; x += 8) balust.push([x, 158, 3.6, 14]);
  return (
    <G>
      <Defs>
        {lin(k, 'sky', [[0, '#4A2A7A'], [0.45, '#C85A7A'], [0.85, '#FFA868'], [1, '#FFD49A']])}
        {lin(k, 'stone', [[0, '#E8C8A0'], [1, '#B88A6A']])}
        {lin(k, 'vault', [[0, '#7A4A3A'], [1, '#A8705A']])}
        {lin(k, 'floor', [[0, '#C8A07A'], [1, '#6A4A3A']])}
      </Defs>
      <Fill k={k} name="sky" />
      <Glow k={k} name="sun" x={300} y={150} r={120} color="#FFD08A" op={0.7} />
      {/* La città lontana e le colline al tramonto, viste attraverso gli archi. */}
      <Path d="M0 160V132Q80 112 160 126Q240 108 320 124Q420 106 500 122Q560 114 600 120V160Z" fill={c(hills)} />
      <Path d="M220 140V112H228V104H236V112H244V140ZM360 140V100L366 90L372 100V140ZM300 140V118H316V140ZM180 140V122H200V140ZM400 140V120H420V140Z" fill={c(mix('#5A2A5A', sky, 0.3))} />
      {/* La loggia: muro, archi, volta e stemmi. */}
      <Path d={rects([[0, 0, 600, 200]]) + arches(openings)} fillRule="evenodd" fill={k.url('stone')} />
      <Path d={arches(openings.map(([x, y, w, h]) => [x - 5, y - 5, w + 10, h + 5])) + arches(openings)} fillRule="evenodd" fill={c('#FFF0DC')} />
      <Path d={rects(colsX.map(x => [x - 5, 80, 10, 96]))} fill={c('#F6E6CC')} />
      <Path d={rects(colsX.flatMap(x => [[x - 8, 76, 16, 6], [x - 8, 170, 16, 6]]))} fill={c('#FFF4E0')} />
      <Path d={rects([[0, 0, 600, 10], [0, 172, 600, 4]])} fill={c('#A8705A')} opacity={0.5} />
      {shields.map(([x, y], i) => (
        <G key={i}>
          <Path d={shield(x, y, 16)} fill={c(['#2E5A8A', C.bordeaux, '#2E7A5A', C.gold][i])} />
          <Path d={shield(x, y, 16)} fill="none" stroke={c(C.gold)} strokeWidth={1.4} />
          <Path d={i % 2 ? rects([[x - 8, y + 7, 16, 3]]) : rects([[x - 1.5, y, 3, 19]])} fill={c('#FFF0DC')} opacity={0.8} />
        </G>
      ))}
      {/* I muri pieni ai lati, con le lanterne. */}
      <Path d={rects([[0, 0, 116, 200], [484, 0, 116, 200]])} fill={c('#C8946E')} />
      <Path d={arches([[30, 56, 46, 86], [524, 56, 46, 86]])} fill={c('#7A3A3A')} />
      <Path d={arches([[36, 62, 34, 80], [530, 62, 34, 80]])} fill={c('#5A2226')} />
      {[96, 504].map(x => (
        <G key={x}>
          <Glow k={k} name={`l${x}`} x={x} y={96} r={28} color="#FFD890" op={0.7} />
          <Path d={poly([[x - 6, 104], [x + 6, 104], [x + 4, 88], [x - 4, 88]])} fill={c('#2A1410')} />
          <Path d={poly([[x - 4, 102], [x + 4, 102], [x + 3, 90], [x - 3, 90]])} fill={c('#FFE2A0')} />
        </G>
      ))}
      {/* La balaustra e il pavimento della loggia. */}
      <Path d={rects(balust)} fill={c('#F6E6CC')} />
      <Path d={rects([[116, 154, 368, 5], [116, 172, 368, 4]])} fill={c('#FFF4E0')} />
      <Path d={rects([[0, 176, 600, 24]])} fill={k.url('floor')} />
      <Path d={Array.from({ length: 16 }, (_, i) => `M${i * 40} 176L${i * 40 - 20} 200`).join('')} stroke={c('#5A3A2A')} strokeWidth={0.8} opacity={0.4} />
      <Ground k={k} from={140} color="#2A0A1A" op={0.35} />
      <Armchairs k={k} list={[[244, 200, 1.1, 1], [356, 200, 1.1, -1]]} color="#2E4A7A" />
      <CardTable k={k} x={300} y={172} w={84} felt={C.felt} wood={C.walnut} rim={C.gold} />
      <Vignette k={k} color="#2A0A1A" op={0.3} />
    </G>
  );
}

/* ------------------------------------------------------------------ 12. Il Salone dei Campioni */

export function SaloneDeiCampioni({ k }: { k: Ctx }) {
  const { c } = k;
  // Le vetrine: [x, y, w, h], con le coppe sui ripiani.
  const cases = [[30, 34, 100, 136], [150, 26, 90, 120], [360, 26, 90, 120], [470, 34, 100, 136]];
  const cups: string[] = [];
  const shelves: number[][] = [];
  for (const [x, y, w, h] of cases) {
    const rows = 3;
    for (let r = 0; r < rows; r++) {
      const sy = y + ((r + 1) * h) / rows - 4;
      shelves.push([x + 4, sy, w - 8, 2.5]);
      const n = 3;
      for (let j = 0; j < n; j++) cups.push(cup(x + (w * (j + 0.5)) / n, sy, 18 - r * 2 + (j === 1 ? 4 : 0)));
    }
  }
  return (
    <G>
      <Defs>
        {lin(k, 'wall', [[0, '#3A1418'], [0.6, '#6A2228'], [1, '#2A0E12']])}
        {lin(k, 'case', [[0, '#5A2A1E'], [1, '#2A120C']])}
        {lin(k, 'glass', [[0, '#FFE6B8', 0.22], [1, '#FFE6B8', 0.04]])}
        {lin(k, 'gold', [[0, '#FFF0B0'], [0.5, '#E8B44A'], [1, '#A8701E']])}
        {lin(k, 'floor', [[0, '#3A1A12'], [1, '#120604']])}
        {lin(k, 'spot', [[0, '#FFF0C8', 0.55], [1, '#FFF0C8', 0]])}
        {lin(k, 'banner', [[0, '#1E4A8A'], [1, '#12285A']])}
      </Defs>
      <Fill k={k} name="wall" />
      {/* Lo stendardo del campione con la coppa grande, al centro. */}
      <Path d={poly([[262, 0], [338, 0], [338, 108], [300, 96], [262, 108]])} fill={k.url('banner')} />
      <Path d={rects([[262, 0, 76, 4]]) + poly([[262, 104], [300, 92], [338, 104], [338, 108], [300, 96], [262, 108]])} fill={c(C.gold)} />
      <Glow k={k} name="big" x={300} y={54} r={56} color="#FFE6A0" op={0.6} />
      <Path d={cup(300, 84, 54)} fill={k.url('gold')} />
      <Path d={rects([[284, 84, 32, 6]])} fill={c(C.walnutD)} />
      <Path d={sparkles([[284, 36, 4], [318, 44, 3], [304, 24, 2.6]])} fill={c('#FFFFFF')} />
      {/* Le vetrine con le coppe. */}
      <Path d={rects(cases.map(([x, y, w, h]) => [x - 5, y - 8, w + 10, h + 34]))} fill={k.url('case')} />
      <Path d={rects(cases.map(([x, y, w, h]) => [x - 7, y - 12, w + 14, 6]))} fill={c(C.gold)} />
      <Path d={rects(cases)} fill={c('#2A0E0A')} />
      <Path d={rects(shelves)} fill={c(C.gold)} opacity={0.8} />
      <Path d={cups.join('')} fill={k.url('gold')} />
      <Path d={rects(cases)} fill={k.url('glass')} />
      <Path d={cases.map(([x, y, w, h]) => poly([[x + w * 0.1, y + h], [x + w * 0.24, y + h], [x + w * 0.7, y], [x + w * 0.56, y]])).join('')} fill={c('#FFFFFF')} opacity={0.12} />
      {/* I faretti dall'alto. */}
      {k.dim ? null : <Path d={poly([[296, 0], [304, 0], [370, 180], [230, 180]])} fill={k.url('spot')} />}
      <Path d={rects([[0, 176, 600, 24]])} fill={k.url('floor')} />
      <Path d={ovals([[300, 186, 120, 10]])} fill={c(C.bordeaux)} />
      <Path d={ovals([[300, 186, 112, 8]])} fill="none" stroke={c(C.gold)} strokeWidth={1.4} />
      <Ground k={k} from={140} color="#0A0204" op={0.45} />
      <Armchairs k={k} list={[[236, 200, 1.15, 1], [364, 200, 1.15, -1]]} />
      <CardTable k={k} x={300} y={168} w={92} felt={C.felt} wood={C.walnutD} rim={C.gold} pedestal />
      <Vignette k={k} color="#0A0204" op={0.45} />
    </G>
  );
}

