// Capitolo IV, «I maestri»: il santuario. Il crepuscolo mistico: indaco, viola e un filo d'ambra
// all'orizzonte, pietra antica, candele, una luce turchese che viene da dentro. Si sale: dal santuario
// alla cripta, alla fortezza, alla torre sopra le nuvole, fino alle colonne dell'Olimpo e agli immortali.

import { Defs, G, Path } from 'react-native-svg';
import { crown } from './borgo';
import { shield } from './circolo';
import {
  arches,
  Candles,
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
  room,
  seeded,
  sparkles,
  starField,
  Vignette,
} from './kit';

/** I colori del santuario. */
const S = {
  indigo: '#1A1648',
  indigoD: '#0C0A26',
  violet: '#4A2A7A',
  magenta: '#A0408A',
  amber: '#FFB060',
  teal: '#3EE0D0',
  tealD: '#1A7A8A',
  stone: '#5A5478',
  stoneL: '#8A84AA',
  stoneD: '#2E2A4A',
  gold: '#F2C860',
  felt: '#1E5A6A',
};

/** Il cielo del crepuscolo, dall'indaco all'ambra. */
const duskSky = (k: Ctx, name: string) => lin(k, name, [[0, '#120E3A'], [0.45, '#3A2470'], [0.75, '#8A3A86'], [1, '#FFA868']]);

/** Una vetrata a rosone: cerchio con petali di colore, senza figure. */
function Rose({ k, x, y, r }: { k: Ctx; x: number; y: number; r: number }) {
  const { c } = k;
  const petals = (n: number, rr: number, rot: number) =>
    Array.from({ length: n }, (_, i) => {
      const a = rot + (i * Math.PI * 2) / n;
      return [x + Math.cos(a) * rr, y + Math.sin(a) * rr, r * 0.2];
    });
  return (
    <>
      <Glow k={k} name="rose" x={x} y={y} r={r * 2.4} color="#8AE6FF" op={0.5} />
      <Path d={dots([[x, y, r + 3]])} fill={c(S.stoneD)} />
      <Path d={dots([[x, y, r]])} fill={c('#2A3A9A')} />
      <Path d={dots(petals(12, r * 0.72, 0))} fill={c('#E8507A')} />
      <Path d={dots(petals(12, r * 0.72, Math.PI / 12).map(([a, b]) => [a, b, r * 0.11]))} fill={c(S.gold)} />
      <Path d={dots(petals(6, r * 0.38, Math.PI / 6))} fill={c(S.teal)} />
      <Path d={dots([[x, y, r * 0.2]])} fill={c('#FFF0B0')} />
      <Path d={rays(x, y, r, 12, 0, Math.PI * 2, 0.03)} fill={c(S.stoneD)} opacity={0.7} />
    </>
  );
}

/** Una statua stilizzata: un panneggio a campana, le spalle e la testa ovale. Base in (x, y), alta h. */
export function statue(x: number, y: number, h: number, pose = 0) {
  const s = h / 100;
  const body = `M${r1(x - 16 * s)} ${r1(y)}Q${r1(x - 18 * s)} ${r1(y - 50 * s)} ${r1(x - 13 * s)} ${r1(y - 70 * s)}Q${r1(x)} ${r1(y - 78 * s)} ${r1(x + 13 * s)} ${r1(y - 70 * s)}Q${r1(x + 18 * s)} ${r1(y - 50 * s)} ${r1(x + 16 * s)} ${r1(y)}Z`;
  const head = `M${r1(x - 6 * s)} ${r1(y - 84 * s)}a${r1(6 * s)} ${r1(8 * s)} 0 1 0 ${r1(12 * s)} 0a${r1(6 * s)} ${r1(8 * s)} 0 1 0 ${r1(-12 * s)} 0z`;
  // Il braccio: piegato sul petto (0) o alzato a reggere qualcosa (1).
  const arm =
    pose === 0
      ? `M${r1(x - 12 * s)} ${r1(y - 66 * s)}Q${r1(x - 2 * s)} ${r1(y - 52 * s)} ${r1(x + 10 * s)} ${r1(y - 56 * s)}L${r1(x + 10 * s)} ${r1(y - 50 * s)}Q${r1(x - 4 * s)} ${r1(y - 44 * s)} ${r1(x - 14 * s)} ${r1(y - 58 * s)}Z`
      : `M${r1(x + 10 * s)} ${r1(y - 68 * s)}L${r1(x + 22 * s)} ${r1(y - 96 * s)}L${r1(x + 27 * s)} ${r1(y - 94 * s)}L${r1(x + 16 * s)} ${r1(y - 64 * s)}Z`;
  const folds = [-8, 0, 8].map(dx => `M${r1(x + dx * s)} ${r1(y - 4 * s)}Q${r1(x + dx * 1.2 * s)} ${r1(y - 34 * s)} ${r1(x + dx * 0.7 * s)} ${r1(y - 62 * s)}`).join('');
  const plinth = rects([[x - 20 * s, y, 40 * s, 10 * s], [x - 23 * s, y + 8 * s, 46 * s, 4 * s]]);
  return { body: body + head + arm, folds, plinth };
}

/* ------------------------------------------------------------------ 19. Il Santuario del Gioco */

export function SantuarioDelGioco({ k }: { k: Ctx }) {
  const { c } = k;
  const Rm = room([214, 40, 386, 156], [-90, -60, 690, 270]);
  // Le arcate gotiche della navata, in prospettiva.
  const bays = [0.05, 0.3, 0.52, 0.72, 0.88];
  const archL = bays.map(t => {
    const [x0, y0] = Rm.P(t, 0, 0.12);
    const [, y1] = Rm.P(t, 0, 1);
    const w = 24 * Rm.sc(t);
    return [x0 - w * 0.1, y0, w, y1 - y0];
  });
  const archR = bays.map(t => {
    const [x0, y0] = Rm.P(t, 1, 0.12);
    const [, y1] = Rm.P(t, 1, 1);
    const w = 24 * Rm.sc(t);
    return [x0 - w * 0.9, y0, w, y1 - y0];
  });
  // File di candele che salgono verso l'altare.
  const candles: number[][] = [];
  for (const [u, n] of [[0.18, 6], [0.82, 6]] as const)
    for (let i = 0; i < n; i++) {
      const t = 0.08 + i * 0.15;
      const [x, y] = Rm.P(t, u, 1);
      const s = Rm.sc(t) / 2.6;
      candles.push([x, y - 2, 14 * s, 3 * s]);
    }
  const altar = [[252, 124, 18, 3.6], [264, 124, 12, 3], [336, 124, 12, 3], [348, 124, 18, 3.6]];
  return (
    <G>
      <Defs>
        {lin(k, 'side', [[0, '#1E1A44'], [1, '#3E3470']], [0, 0, 1, 0])}
        {lin(k, 'sideR', [[0, '#3E3470'], [1, '#1E1A44']], [0, 0, 1, 0])}
        {lin(k, 'ceil', [[0, '#0C0A26'], [1, '#2A2458']])}
        {lin(k, 'floor', [[0, '#14102E'], [1, '#5A4A80']], [0, 1, 0, 0])}
        {lin(k, 'apse', [[0, '#2A2A6A'], [1, '#6A3A7A']])}
        {lin(k, 'shaft', [[0, '#8AE6FF', 0.35], [1, '#8AE6FF', 0]])}
      </Defs>
      <Fill k={k} name="ceil" />
      <Path d={Rm.ceil} fill={k.url('ceil')} />
      {/* Le nervature della volta. */}
      <Path d={bays.map(t => {
        const a = Rm.P(t, 0, 0.12);
        const b = Rm.P(t, 1, 0.12);
        const m = Rm.P(t, 0.5, -0.12);
        return `M${r1(a[0])} ${r1(a[1])}Q${r1(m[0])} ${r1(m[1] - 30 * Rm.sc(t) / 3)} ${r1(b[0])} ${r1(b[1])}`;
      }).join('')} stroke={c(S.stoneL)} strokeWidth={2} fill="none" opacity={0.5} />
      <Path d={Rm.left} fill={k.url('side')} />
      <Path d={Rm.right} fill={k.url('sideR')} />
      <Path d={pointed([...archL, ...archR])} fill={c(S.indigoD)} opacity={0.6} />
      <Path d={Rm.floor} fill={k.url('floor')} />
      <Path d={Rm.flat(1, 0, 1, 0.4, 0.6)} fill={c(S.violet)} opacity={0.6} />
      {/* L'abside con il rosone e i raggi di luce turchese. */}
      <Path d={rects([[214, 40, 172, 116]])} fill={k.url('apse')} />
      <Path d={pointed([[244, 52, 112, 104]])} fill={c(S.indigoD)} />
      <Rose k={k} x={300} y={86} r={26} />
      {k.dim ? null : <Path d={poly([[284, 112], [316, 112], [372, 200], [228, 200]])} fill={k.url('shaft')} />}
      <Path d={rects([[244, 124, 112, 5], [252, 129, 96, 27]])} fill={c(S.stoneD)} />
      <Path d={rects([[244, 124, 112, 1.6]])} fill={c(S.gold)} />
      <Path d={poly([[300, 131], [308, 142], [300, 153], [292, 142]])} fill={c(S.gold)} opacity={0.85} />
      <Candles k={k} list={altar} />
      <Candles k={k} list={candles} />
      <Path d={sparkles(starField(5, 14, [180, 20, 420, 140], 1, 2.2))} fill={c('#CFF6FF')} opacity={0.7} />
      <Ground k={k} from={140} color="#06041A" op={0.45} />
      <Path d={chair(250, 200, 1.05, 1) + chair(350, 200, 1.05, -1)} fill={c(S.indigoD)} />
      <CardTable k={k} x={300} y={172} w={84} felt={S.felt} wood={S.stoneD} rim={S.gold} back="#8A2A5A" pedestal />
      <Vignette k={k} color="#06041A" op={0.45} />
    </G>
  );
}

/* ------------------------------------------------------------------ 20. La Cripta dei Maestri */

export function CriptaDeiMaestri({ k }: { k: Ctx }) {
  const { c } = k;
  // Le volte a crociera una dietro l'altra: archi ribassati, sempre più piccoli.
  const rings = [0, 1, 2, 3, 4].map(i => {
    const s = Math.pow(0.68, i);
    const hw = 330 * s;
    const top = 100 - 140 * s;
    const foot = 100 + 100 * s;
    return { hw, top, foot, t: 22 * s, s };
  });
  const tone = ['#2A2850', '#3A3668', '#4E4880', '#625C96', '#7670AA'];
  // Le tombe dei maestri ai lati: sarcofagi semplici con il coperchio a spiovente.
  const tombs = (x: number, y: number, w: number) => ({
    box: rects([[x - w / 2, y - w * 0.3, w, w * 0.3]]),
    lid: poly([[x - w * 0.55, y - w * 0.3], [x + w * 0.55, y - w * 0.3], [x + w * 0.45, y - w * 0.42], [x - w * 0.45, y - w * 0.42]]),
  });
  const tl = [tombs(96, 184, 110), tombs(504, 184, 110), tombs(186, 156, 60), tombs(414, 156, 60)];
  return (
    <G>
      <Defs>
        {lin(k, 'end', [[0, '#1A6A7A'], [1, '#0E2A40']])}
        {lin(k, 'floor', [[0, '#3A3668'], [1, '#0E0C26']])}
        {lin(k, 'stone', [[0, '#7A74A0'], [1, '#4A4470']])}
      </Defs>
      <Path d={rects([[0, 0, 600, 200]])} fill={c(S.indigoD)} />
      {/* Dal fondo verso di noi: ogni volta è un anello di pietra sopra il buio. */}
      {[4, 3, 2, 1, 0].map(i => {
        const { hw, top, foot, t } = rings[i];
        const outer = `M${r1(300 - hw)} ${r1(foot)}V${r1(top + hw * 0.35)}Q${r1(300 - hw)} ${r1(top)} 300 ${r1(top)}Q${r1(300 + hw)} ${r1(top)} ${r1(300 + hw)} ${r1(top + hw * 0.35)}V${r1(foot)}Z`;
        const ih = hw - t;
        const it = top + t;
        const inner = `M${r1(300 - ih)} ${r1(foot)}V${r1(it + ih * 0.35)}Q${r1(300 - ih)} ${r1(it)} 300 ${r1(it)}Q${r1(300 + ih)} ${r1(it)} ${r1(300 + ih)} ${r1(it + ih * 0.35)}V${r1(foot)}Z`;
        return (
          <G key={i}>
            {i === 4 ? <Path d={inner} fill={k.url('end')} /> : null}
            <Path d={outer + inner} fillRule="evenodd" fill={c(tone[4 - i])} />
            <Path d={`M${r1(300 - ih)} ${r1(foot)}V${r1(it + ih * 0.35)}Q${r1(300 - ih)} ${r1(it)} 300 ${r1(it)}`} stroke={c('#000000')} strokeOpacity={0.25} strokeWidth={t * 0.25} fill="none" />
          </G>
        );
      })}
      {/* La lapide luminosa in fondo. */}
      <Glow k={k} name="tomb" x={300} y={128} r={70} color={S.teal} op={0.5} />
      <Path d={arches([[288, 108, 24, 40]])} fill={c('#BFF6F0')} />
      <Path d={shield(300, 118, 10)} fill={c(S.tealD)} />
      <Path d={poly([[180, 204], [420, 204], [330, 150], [270, 150]])} fill={k.url('floor')} />
      {/* I sarcofagi e le candele. */}
      <Path d={tl.map(t => t.box).join('')} fill={k.url('stone')} />
      <Path d={tl.map(t => t.lid).join('')} fill={c('#9A94BE')} />
      <Path d={rects([[60, 166, 72, 2], [468, 166, 72, 2]])} fill={c(S.gold)} opacity={0.7} />
      <Path d={crown(96, 162, 14) + crown(504, 162, 14)} fill={c(S.gold)} />
      <Candles k={k} list={[[34, 190, 22, 4], [44, 192, 14, 3.4], [566, 190, 22, 4], [556, 192, 14, 3.4], [150, 140, 10, 2.4], [450, 140, 10, 2.4], [222, 148, 8, 2], [378, 148, 8, 2]]} />
      <Path d={sparkles(starField(13, 16, [140, 30, 460, 150], 0.8, 2))} fill={c('#BFF6F0')} opacity={0.6} />
      <Ground k={k} from={140} color="#04030E" op={0.5} />
      <Path d={chair(252, 200, 1.05, 1) + chair(348, 200, 1.05, -1)} fill={c(S.indigoD)} />
      <CardTable k={k} x={300} y={174} w={80} felt={S.felt} wood={S.stoneD} rim="#9A94BE" back="#8A2A5A" />
      <Vignette k={k} color="#04030E" op={0.55} />
    </G>
  );
}

/* ------------------------------------------------------------------ 21. La Fortezza degli Assi */

/** Una torre quadrata con la merlatura, il tetto a punta e la bandiera: base in (x, y). */
function tower(x: number, y: number, w: number, h: number) {
  const merl: number[][] = [];
  for (let i = 0; i < 4; i++) merl.push([x - w / 2 - 2 + i * ((w + 4) / 3.5), y - h - 6, (w + 4) / 7, 6]);
  return {
    body: rects([[x - w / 2, y - h, w, h], [x - w / 2 - 2, y - h - 2, w + 4, 4], ...merl]),
    roof: poly([[x - w / 2 - 1, y - h - 6], [x + w / 2 + 1, y - h - 6], [x, y - h - 6 - w * 1.1]]),
    win: pointed([[x - w * 0.12, y - h * 0.7, w * 0.24, w * 0.5]]),
    pole: [x, y - h - 6 - w * 1.1] as [number, number],
  };
}

export function FortezzaDegliAssi({ k }: { k: Ctx }) {
  const { c } = k;
  const sky = '#8A3A86';
  const hills = mix('#2A1A4A', sky, 0.35);
  // Quattro torri, una per seme: il colore della bandiera dice il seme (niente disegni dei semi).
  const towers = [
    { t: tower(196, 150, 30, 92), flag: '#E8B83A' },
    { t: tower(250, 150, 26, 70), flag: '#C8283A' },
    { t: tower(350, 150, 26, 70), flag: '#2E6ACE' },
    { t: tower(404, 150, 30, 92), flag: '#2E9A5A' },
  ];
  const wallMerl: number[][] = [];
  for (let x = 210; x < 392; x += 9) wallMerl.push([x, 96, 5, 6]);
  return (
    <G>
      <Defs>
        {duskSky(k, 'sky')}
        {lin(k, 'wall', [[0, '#6A5A8A'], [1, '#3A3060']])}
        {lin(k, 'cliff', [[0, '#2E2450'], [1, '#120E2A']])}
        {lin(k, 'gate', [[0, '#FFE6A0'], [1, '#FF9A4A']])}
      </Defs>
      <Fill k={k} name="sky" />
      <Path d={dots(starField(21, 40, [0, 0, 600, 80], 0.4, 1.2))} fill={c('#FFFFFF')} opacity={0.8} />
      <Path d={dots([[110, 40, 12]])} fill={c('#FFF2D8')} />
      <Path d={dots([[115, 37, 10.5]])} fill={c('#2A1E58')} />
      <Glow k={k} name="horizon" x={300} y={190} r={240} color="#FFB060" op={0.45} />
      {/* Le montagne lontane. */}
      <Path d="M0 160L60 120L110 138L170 104L230 130L300 112L370 132L430 100L500 132L560 116L600 130V200H0Z" fill={c(hills)} />
      {/* La rupe e la fortezza. */}
      <Path d="M120 200L150 156Q200 146 300 148Q400 146 450 156L480 200Z" fill={k.url('cliff')} />
      <Path d={rects([[210, 102, 180, 50]])} fill={k.url('wall')} />
      <Path d={rects(wallMerl)} fill={c('#6A5A8A')} />
      {towers.map(({ t }, i) => (
        <G key={i}>
          <Path d={t.body} fill={k.url('wall')} />
          <Path d={t.roof} fill={c('#2A2050')} />
          <Path d={t.win} fill={c('#FFD890')} />
        </G>
      ))}
      {towers.map(({ t, flag }, i) => (
        <G key={`f${i}`}>
          <Path d={`M${t.pole[0]} ${t.pole[1]}v-16`} stroke={c('#1A1430')} strokeWidth={1.4} />
          <Path d={`M${t.pole[0]} ${t.pole[1] - 16}h14l-4 4l4 4h-14z`} fill={c(flag)} />
        </G>
      ))}
      {/* Il portone acceso con il ponte levatoio. */}
      <Glow k={k} name="gate" x={300} y={134} r={50} color="#FFC870" op={0.6} />
      <Path d={arches([[282, 114, 36, 38]])} fill={c('#2A2050')} />
      <Path d={arches([[287, 119, 26, 33]])} fill={k.url('gate')} />
      <Path d={poly([[284, 152], [316, 152], [326, 170], [274, 170]])} fill={c('#5A3A2A')} />
      <Path d={Array.from({ length: 5 }, (_, i) => `M${276 + i * 1} ${155 + i * 3}H${324 - i * 1}`).join('')} stroke={c('#2A1A14')} strokeWidth={0.8} />
      {/* Le finestre accese sulle mura. */}
      <Path d={pointed([[226, 118, 6, 10], [242, 118, 6, 10], [352, 118, 6, 10], [368, 118, 6, 10]])} fill={c('#FFD890')} />
      {/* La terrazza davanti, con le torce. */}
      <Path d="M0 200V172Q300 160 600 172V200Z" fill={c('#1A1434')} />
      <Path d="M0 172Q300 160 600 172" stroke={c(S.stoneL)} strokeWidth={2} fill="none" opacity={0.6} />
      {[150, 450].map(x => (
        <G key={x}>
          <Glow k={k} name={`t${x}`} x={x} y={150} r={30} color="#FFB060" op={0.7} />
          <Path d={rects([[x - 1.5, 152, 3, 22]])} fill={c('#2A1A14')} />
          <Path d={`M${x} 136Q${x + 6} 146 ${x + 3} 152H${x - 3}Q${x - 6} 146 ${x} 136Z`} fill={c(k.dim ? '#6A6080' : '#FFB040')} />
        </G>
      ))}
      <Ground k={k} from={150} color="#06041A" op={0.45} />
      <Path d={chair(250, 200, 1.05, 1) + chair(350, 200, 1.05, -1)} fill={c(S.indigoD)} />
      <CardTable k={k} x={300} y={178} w={82} felt={S.felt} wood="#2A2050" rim={S.gold} back="#8A2A5A" />
      <Vignette k={k} color="#06041A" op={0.35} />
    </G>
  );
}

/* ------------------------------------------------------------------ 22. La Torre dei Campioni */

export function TorreDeiCampioni({ k }: { k: Ctx }) {
  const { c } = k;
  const merl: number[][] = [];
  for (let x = -6; x < 606; x += 30) merl.push([x, 150, 16, 18]);
  return (
    <G>
      <Defs>
        {lin(k, 'sky', [[0, '#0E0C34'], [0.5, '#3A2A78'], [0.8, '#A04A8A'], [1, '#FFB070']])}
        {lin(k, 'sea', [[0, '#E8A0B0'], [1, '#6A4A9A']])}
        {lin(k, 'sea2', [[0, '#B080C0'], [1, '#4A3080']])}
        {lin(k, 'stone', [[0, '#5A5080'], [1, '#2E2850']])}
        {lin(k, 'floor', [[0, '#4A4270'], [1, '#1A1638']])}
      </Defs>
      <Fill k={k} name="sky" />
      <Path d={dots(starField(31, 60, [0, 0, 600, 90], 0.4, 1.4))} fill={c('#FFFFFF')} opacity={0.85} />
      <Path d={sparkles([[90, 30, 4], [520, 22, 5], [440, 54, 3]])} fill={c('#FFFFFF')} />
      {/* Il sole che tramonta sotto le nuvole e il mare di nuvole. */}
      <Glow k={k} name="sun" x={300} y={128} r={200} color="#FFC070" op={0.65} />
      <Path d={dots([[300, 112, 24]])} fill={c('#FFE8B0')} />
      <Path d={cloudBank(4, -20, 620, 118, 22)} fill={k.url('sea')} />
      <Path d={cloudBank(9, -20, 620, 134, 28)} fill={k.url('sea2')} />
      {/* Le altre torri lontane che bucano le nuvole. */}
      <Path d="M70 128V84H82V78H90V84H102V128ZM516 128V92H526V86H534V92H544V128Z" fill={c(mix('#3A2A70', '#B080C0', 0.4))} />
      <Path d="M86 78L86 66M530 86V74" stroke={c(mix('#3A2A70', '#B080C0', 0.4))} strokeWidth={1.4} />
      {/* La cima della torre: la merlatura che ci circonda. */}
      <Path d={rects([[0, 166, 600, 40]])} fill={k.url('floor')} />
      <Path d={rects(merl)} fill={k.url('stone')} />
      <Path d={rects([[0, 164, 600, 6]])} fill={c('#6A6090')} />
      <Path d={rects(merl.map(([x, y, w]) => [x, y, w, 2]))} fill={c('#8A80B0')} />
      {/* Lo stendardo del campione sul pennone, al centro. */}
      <Path d="M300 166V40" stroke={c('#2A2048')} strokeWidth={2.6} />
      <Path d={dots([[300, 38, 3]])} fill={c(S.gold)} />
      <Path d="M301 44H350L340 62L350 80H301Z" fill={c('#C8283A')} />
      <Path d={crown(322, 68, 14)} fill={c(S.gold)} />
      {/* I bracieri ai lati. */}
      {[210, 390].map(x => (
        <G key={x}>
          <Glow k={k} name={`b${x}`} x={x} y={150} r={34} color="#FFB060" op={0.7} />
          <Path d={poly([[x - 9, 156], [x + 9, 156], [x + 5, 164], [x - 5, 164]]) + rects([[x - 2, 164, 4, 10], [x - 6, 172, 12, 3]])} fill={c('#2A2048')} />
          <Path d={`M${x} 136Q${x + 9} 148 ${x + 6} 156H${x - 6}Q${x - 9} 148 ${x} 136Z`} fill={c(k.dim ? '#6A6080' : '#FFB040')} />
          <Path d={`M${x} 144Q${x + 4} 150 ${x + 3} 156H${x - 3}Q${x - 4} 150 ${x} 144Z`} fill={c(k.dim ? '#8A84A0' : '#FFF0B0')} />
        </G>
      ))}
      <Ground k={k} from={150} color="#06041A" op={0.45} />
      <Path d={chair(252, 200, 1.05, 1) + chair(348, 200, 1.05, -1)} fill={c(S.indigoD)} />
      <CardTable k={k} x={300} y={178} w={82} felt="#2A3A8A" wood="#2A2048" rim={S.gold} back="#C8283A" pedestal />
      <Vignette k={k} color="#06041A" op={0.3} />
    </G>
  );
}

/* ------------------------------------------------------------------ 23. L'Olimpo delle Carte */

export function OlimpoDelleCarte({ k }: { k: Ctx }) {
  const { c } = k;
  // Un tempio rotondo di colonne bianche: le colonne sono distribuite su un'ellisse e quelle davanti
  // sono più grandi e più chiare.
  const n = 10;
  const cols = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + Math.PI / n;
    return { x: 300 + Math.cos(a) * 92, z: Math.sin(a) };
  }).sort((a, b) => a.z - b.z);
  return (
    <G>
      <Defs>
        {lin(k, 'sky', [[0, '#3A2470'], [0.4, '#C86A8A'], [0.75, '#FFC070'], [1, '#FFE6A8']])}
        {lin(k, 'col', [[0, '#C8C0DA'], [0.45, '#FFFFFF'], [1, '#B0A8C8']], [0, 0, 1, 0])}
        {lin(k, 'colB', [[0, '#A89CC0'], [1, '#D8D0E6']], [0, 0, 1, 0])}
        {lin(k, 'cloud', [[0, '#FFF0E0'], [1, '#E0A8C0']])}
        {lin(k, 'cloud2', [[0, '#FFE6D8'], [1, '#B880B0']])}
        {lin(k, 'dome', [[0, '#FFF4C8'], [1, '#E8B44A']])}
      </Defs>
      <Fill k={k} name="sky" />
      <Glow k={k} name="sun" x={300} y={84} r={240} color="#FFF0C0" op={0.7} />
      <Path d={rays(300, 90, 320, 22, Math.PI, Math.PI * 2, 0.06)} fill={c('#FFF4D0')} opacity={0.2} />
      <Path d={dots(starField(17, 22, [0, 0, 600, 50], 0.4, 1.1))} fill={c('#FFFFFF')} opacity={0.7} />
      {/* Le nuvole lontane e le altre colonne spezzate tra le nuvole. */}
      <Path d={cloudBank(3, -20, 620, 138, 20)} fill={c(mix('#E0A8C0', '#FFC070', 0.4))} opacity={0.7} />
      <Path d={rects([[64, 96, 10, 46], [84, 110, 10, 32], [520, 100, 10, 42], [540, 112, 10, 30]])} fill={c(mix('#FFFFFF', '#FFC070', 0.4))} />
      {/* Il basamento a gradini. */}
      <Path d={ovals([[300, 146, 120, 14]])} fill={c('#D8D0E6')} />
      <Path d={rects([[180, 146, 240, 10]])} fill={c('#D8D0E6')} />
      <Path d={ovals([[300, 156, 120, 14]])} fill={c('#B8B0D0')} />
      <Path d={ovals([[300, 140, 110, 12]])} fill={c('#F4F0FA')} />
      {/* Le colonne, prima quelle dietro. */}
      {cols.map(({ x, z }, i) => {
        const front = z > 0;
        const yb = 140 + z * 10;
        const w = 9 + z * 2;
        return <Columns key={i} k={k} xs={[x]} top={70 + z * 2} bottom={yb} w={w} shaft={front ? k.url('col') : k.url('colB')} cap={front ? '#FFFFFF' : '#C8C0DA'} />;
      })}
      {/* La trabeazione e la cupola d'oro. */}
      <Path d={ovals([[300, 66, 108, 12]])} fill={c('#E8E2F2')} />
      <Path d={rects([[192, 58, 216, 10]])} fill={c('#FFFFFF')} />
      <Path d={rects([[192, 62, 216, 2]])} fill={c(S.gold)} />
      <Path d="M200 58Q200 14 300 10Q400 14 400 58Z" fill={k.url('dome')} />
      <Path d="M230 58Q236 24 300 14M370 58Q364 24 300 14M300 14V58" stroke={c('#C8902E')} strokeWidth={1.2} fill="none" opacity={0.6} />
      <Path d={dots([[300, 8, 4]])} fill={c(S.gold)} />
      <Path d={sparkles([[300, -2, 6], [228, 30, 3], [372, 30, 3]])} fill={c('#FFFFFF')} />
      {/* Il mare di nuvole davanti. */}
      <Path d={cloudBank(7, -30, 630, 168, 26)} fill={k.url('cloud2')} />
      <Path d={cloudBank(12, -30, 630, 186, 22)} fill={k.url('cloud')} />
      <Ground k={k} from={150} color="#4A2A6A" op={0.3} />
      <Path d={chair(252, 196, 1.05, 1) + chair(348, 196, 1.05, -1)} fill={c('#E8E2F2')} />
      <CardTable k={k} x={300} y={168} w={82} felt="#2A4E9A" wood="#E8E2F2" rim={S.gold} back="#C8283A" pedestal shadow={0.15} />
      <Vignette k={k} color="#3A1A5A" op={0.3} />
    </G>
  );
}

/* ------------------------------------------------------------------ 24. La Sala degli Immortali */

export function SalaDegliImmortali({ k }: { k: Ctx }) {
  const { c } = k;
  // Le statue nelle nicchie: due giganti ai lati del tavolo, le altre in fila sul fondo.
  const niches = [[40, 40, 70, 136], [130, 52, 58, 116], [412, 52, 58, 116], [490, 40, 70, 136]];
  const small = niches.map(([x, y, w, h], i) => statue(x + w / 2, y + h - 12, h * 0.68, i % 2));
  const giants = [statue(206, 160, 118, 1), statue(394, 160, 118, 0)];
  const rnd = seeded(8);
  const motes = Array.from({ length: 30 }, () => [200 + rnd() * 200, 20 + rnd() * 150, 0.6 + rnd() * 1.2]);
  return (
    <G>
      <Defs>
        {lin(k, 'wall', [[0, '#120E30'], [1, '#2A2456']])}
        {lin(k, 'niche', [[0, '#0A0820'], [1, '#2A2A5A']])}
        {lin(k, 'marble', [[0, '#F4F2FF'], [1, '#A8A2CE']], [0, 0, 1, 0])}
        {lin(k, 'marbleG', [[0, '#FFFFFF'], [0.6, '#D8D4F0'], [1, '#8A84B8']], [0, 0, 1, 0])}
        {lin(k, 'floor', [[0, '#3A3468'], [1, '#100C2A']])}
        {lin(k, 'beam', [[0, '#9AF0FF', 0.4], [1, '#9AF0FF', 0]])}
        {rad(k, 'portal', [[0, '#E8FFFF'], [0.5, '#5AD8E0'], [1, '#2A3A8A']], 300, 90, 60)}
      </Defs>
      <Fill k={k} name="wall" />
      {/* Il portale di luce in fondo, tra i due giganti. */}
      <Glow k={k} name="halo" x={300} y={90} r={150} color={S.teal} op={0.45} />
      <Path d={pointed([[256, 22, 88, 138]])} fill={c(S.stoneD)} />
      <Path d={pointed([[264, 30, 72, 130]])} fill={k.url('portal')} />
      <Path d={rays(300, 70, 60, 12, 0, Math.PI * 2, 0.06)} fill={c('#FFFFFF')} opacity={0.25} />
      {k.dim ? null : <Path d={poly([[270, 140], [330, 140], [400, 200], [200, 200]])} fill={k.url('beam')} />}
      {/* Le nicchie con le statue piccole. */}
      <Path d={arches(niches.map(([x, y, w, h]) => [x - 4, y - 4, w + 8, h + 4]))} fill={c(S.stone)} />
      <Path d={arches(niches)} fill={k.url('niche')} />
      <Path d={small.map(s => s.body).join('')} fill={k.url('marble')} />
      <Path d={small.map(s => s.folds).join('')} stroke={c('#6A64A0')} strokeWidth={1} fill="none" opacity={0.5} />
      <Path d={small.map(s => s.plinth).join('')} fill={c(S.stoneL)} />
      {/* I due giganti di marmo. */}
      <Path d={giants.map(s => s.body).join('')} fill={k.url('marbleG')} />
      <Path d={giants.map(s => s.folds).join('')} stroke={c('#6A64A0')} strokeWidth={1.4} fill="none" opacity={0.5} />
      <Path d={giants.map(s => s.plinth).join('')} fill={c('#9A94C4')} />
      <Path d={crown(206, 52, 16) + crown(394, 52, 16)} fill={c(S.gold)} />
      {/* La fiaccola del gigante a sinistra e la sfera di quello a destra. */}
      <Glow k={k} name="torch" x={232} y={44} r={28} color={S.teal} op={0.7} />
      <Path d="M232 30Q238 40 234 48H230Q226 40 232 30Z" fill={c(k.dim ? '#8A84A0' : '#BFFAFF')} />
      <Path d={rects([[0, 172, 600, 28]])} fill={k.url('floor')} />
      <Path d={ovals([[300, 186, 130, 12]])} fill="none" stroke={c(S.teal)} strokeWidth={1.4} opacity={0.6} />
      <Path d={dots(motes)} fill={c('#CFFAFF')} opacity={0.7} />
      <Ground k={k} from={150} color="#04030E" op={0.45} />
      <Path d={chair(254, 200, 1.05, 1) + chair(346, 200, 1.05, -1)} fill={c(S.stoneL)} />
      <CardTable k={k} x={300} y={176} w={78} felt={S.felt} wood={S.stone} rim="#E8E4F8" back="#8A2A5A" pedestal />
      <Vignette k={k} color="#04030E" op={0.5} />
    </G>
  );
}
