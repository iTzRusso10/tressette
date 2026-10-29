// L'avatar del giocatore con la sua cornice: nel profilo, nelle classifiche, tra gli amici, sul palco della
// personalizzazione. Disegnato in SVG in una tela 100×100, nitido a ogni misura: un simbolo (o la foto, o
// l'iniziale) su un fondo «da mazzo», e intorno la cornice di metallo (src/ui/arte/cornici.ts).
//
// Export:
// - `PlayerAvatar` { avatar?, photo?, name, frame?, size, badge? }   FIRMA INVARIATA (la usano 15 file). La misura
//                  comprende la cornice. Sempre ferma: nelle liste, nelle classifiche, nei banner e nel profilo (dove
//                  il pacchetto B2 decide la vita della vetrina) niente si muove da solo.
// - `AvatarCornice` gli stessi props più `vivo?: boolean` (default false) e `seme?`: la versione da vetrina, che si
//                  anima secondo la rarità. La usano il palco della personalizzazione e /dev/cornici; il profilo può
//                  passarle `vivo` al posto del suo riflesso.
// - `PlayerAvatarProps`
//
// Livelli di dettaglio (la scala delle rarità resta leggibile anche in piccolo, §5.7):
//   < 56 pt   anello, fascia, gemme, cimiero e pendente; niente zigrinature, motivi fini, bagliori. Fermo.
//   ≥ 56 pt   tutti i dettagli, ombra portata. Fermo.
//   ≥ 64 pt   con `vivo`, dall'epico: il riflesso passa (epico 8 s, leggendario e mitico 6 s); il leggendario ha in
//             più le gemme che brillano (0,6 ↔ 1) e 8 scintille; il mitico la madreperla iridescente (12 s) e 16
//             granelli. Al massimo 3 elementi animati per cornice (§5.7).
//             Tutto fermo con riduci movimento, schermata non a fuoco, app in background (useAmbient).
// Luce: dall'alto a sinistra (ore 11), come tutta Lampara: il metallo è un gradiente a 160° nello spazio della
// tela, quindi ogni ornamento prende luce secondo dove sta; i fili di rilievo sono chiari in alto a sinistra e
// scuri in basso a destra; il rimbalzo freddo sfiora il basso a destra.
import { Image } from 'expo-image';
import { LinearGradient as LG } from 'expo-linear-gradient';
import { memo, useId, useMemo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { css } from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';
import { seeded } from '@/engine/rng';
import { avatarById, type AvatarGlyph } from '@/meta/avatars';
import { fondoAvatar, stileCornice, type FondoAvatar, type Metallo, type StileCornice } from './arte/cornici';
import { mov } from './arte/movimento';
import { puoAnimare, rarita } from './arte/rarita';
import { fontArte, mescola } from './arte/token';
import { useAmbient } from './arte/useAmbient';
import { Text } from './Text';

/* ------------------------------------------------------------------ simboli (in una tela 100×100) */

const GLYPH: Partial<Record<AvatarGlyph, (c: string, chiaro: string) => ReactNode>> = {
  coppa: c => (
    <G fill={c}>
      <Path d="M32 26h36c0 16-6 27-18 29-12-2-18-13-18-29z" />
      <Path d="M46 55h8v12h-8z" />
      <Path d="M36 70c4-4 24-4 28 0v5H36z" />
      <Path d="M30 24h40v5H30z" opacity={0.85} />
    </G>
  ),
  denaro: (c, chiaro) => (
    <G>
      <Circle cx={50} cy={50} r={25} fill={c} />
      <Circle cx={50} cy={50} r={18} fill="none" stroke={chiaro} strokeWidth={3} opacity={0.9} />
      <Path d="M50 37l3.6 7.4 8.1 1.2-5.9 5.7 1.4 8.1L50 55.6l-7.2 3.8 1.4-8.1-5.9-5.7 8.1-1.2z" fill={chiaro} />
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
  bastone: (c, chiaro) => (
    <G fill={c}>
      <Path d="M44 18c4-3 10-2 12 3l-4 60c-1 4-7 4-8 0z" />
      <Circle cx={48} cy={34} r={4} fill={chiaro} opacity={0.6} />
      <Circle cx={51} cy={52} r={3.5} fill={chiaro} opacity={0.6} />
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
      <Path d="M8 80L38 38h8l4 6 4-6h8l30 42z" fill={c} />
      <Path d="M48 34c-2-8 4-12 2-18 6 4 10 10 6 18z" fill={c} opacity={0.55} />
    </G>
  ),
  limone: c => (
    <G>
      <Path d="M26 54c0-14 12-24 26-24s24 10 24 22c0 14-12 22-26 22S26 66 26 54z" fill={c} transform="rotate(-20 50 52)" />
      <Path d="M62 28c8-8 18-6 20-4-4 8-12 10-20 4z" fill="#3E9A5A" />
    </G>
  ),
  corno: c => <Path d="M30 24c22 2 38 22 36 46-1 8-6 12-10 8 2-22-8-38-28-46-4-2-2-8 2-8z" fill={c} />,
  sette: c => <Path d="M30 24h40v8L50 78h-10l19-46H30z" fill={c} />,
  stella: c => <Path d="M50 18l9.4 19 21 3-15.2 14.8 3.6 21L50 66l-18.8 9.8 3.6-21L19.6 40l21-3z" fill={c} />,
};

/* ------------------------------------------------------------------ geometria (tela 100) */

const C = 50;
const n2 = (x: number) => Math.round(x * 100) / 100;
const rad = (g: number) => (g * Math.PI) / 180;

/** Un punto in coordinate locali: u lungo la tangente (in senso orario), v verso l'esterno da r0, all'angolo θ. */
function luogo(theta: number, r0: number) {
  const a = rad(theta);
  const nx = Math.cos(a);
  const ny = Math.sin(a);
  return (u: number, v: number) => `${n2(C + nx * (r0 + v) - ny * u)} ${n2(C + ny * (r0 + v) + nx * u)}`;
}

const cerchio = (cx: number, cy: number, r: number) => `M${n2(cx - r)} ${n2(cy)}a${n2(r)} ${n2(r)} 0 1 0 ${n2(2 * r)} 0a${n2(r)} ${n2(r)} 0 1 0 ${n2(-2 * r)} 0Z`;
const punto = (r: number, theta: number): [number, number] => [C + r * Math.cos(rad(theta)), C + r * Math.sin(rad(theta))];
/** Arco di raggio r da a0 ad a1 gradi (orario). */
function arco(r: number, a0: number, a1: number) {
  const [x0, y0] = punto(r, a0);
  const [x1, y1] = punto(r, a1);
  return `M${n2(x0)} ${n2(y0)}A${n2(r)} ${n2(r)} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${n2(x1)} ${n2(y1)}`;
}
/** Anello come tracciato unico (esterno orario, interno antiorario: il buco vale con la regola nonzero). */
function anello(rEst: number, rInt: number, cx = C, cy = C) {
  return (
    `M${n2(cx - rEst)} ${n2(cy)}A${n2(rEst)} ${n2(rEst)} 0 1 1 ${n2(cx + rEst)} ${n2(cy)}A${n2(rEst)} ${n2(rEst)} 0 1 1 ${n2(cx - rEst)} ${n2(cy)}Z` +
    `M${n2(cx - rInt)} ${n2(cy)}A${n2(rInt)} ${n2(rInt)} 0 1 0 ${n2(cx + rInt)} ${n2(cy)}A${n2(rInt)} ${n2(rInt)} 0 1 0 ${n2(cx - rInt)} ${n2(cy)}Z`
  );
}
/** Una foglia appuntita centrata in (cx, cy), lunga L e larga W, orientata di `ang` gradi. */
function foglia(cx: number, cy: number, L: number, W: number, ang: number) {
  const a = rad(ang);
  const P = (u: number, v: number) => `${n2(cx + u * Math.cos(a) - v * Math.sin(a))} ${n2(cy + u * Math.sin(a) + v * Math.cos(a))}`;
  return `M${P(-L / 2, 0)}Q${P(0, -W)} ${P(L / 2, 0)}Q${P(0, W)} ${P(-L / 2, 0)}Z`;
}
/** Una stella a quattro punte (il bagliore delle gemme, le stelle dello smalto). */
function stella4(cx: number, cy: number, r: number, k = 0.28) {
  const q = r * k;
  return `M${n2(cx)} ${n2(cy - r)}L${n2(cx + q)} ${n2(cy - q)}L${n2(cx + r)} ${n2(cy)}L${n2(cx + q)} ${n2(cy + q)}L${n2(cx)} ${n2(cy + r)}L${n2(cx - q)} ${n2(cy + q)}L${n2(cx - r)} ${n2(cy)}L${n2(cx - q)} ${n2(cy - q)}Z`;
}
function stella5(cx: number, cy: number, r: number) {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.42 : r;
    const [x, y] = [cx + rr * Math.cos(rad(-90 + i * 36)), cy + rr * Math.sin(rad(-90 + i * 36))];
    d += `${i ? 'L' : 'M'}${n2(x)} ${n2(y)}`;
  }
  return d + 'Z';
}

/** Le posizioni (angoli) delle gemme di una cornice. */
const angoliGemme = (st: StileCornice) => (st.gemme ? Array.from({ length: st.gemme.n }, (_, i) => st.gemme!.da + (i * 360) / st.gemme!.n) : []);

/* ------------------------------------------------------------------ pezzi della cornice */

interface Ctx {
  st: StileCornice;
  /** Raggio del foro, spessore, raggio medio ed esterno (tela 100). */
  Rf: number;
  T: number;
  Rm: number;
  Ro: number;
  /** 0 piccolo (< 56 pt), 1 medio, 2 grande (≥ 96 pt). */
  det: 0 | 1 | 2;
  /** Spessore minimo di una linea, in unità della tela (mezzo punto). */
  lw: number;
  id: (s: string) => string;
  m: Metallo;
}

/** Una gemma: cabochon (cupola liscia) o brillante (ottagono a faccette), con il castone o le griffe. */
function Gemma({ x, y, r, tinta, taglio, ctx }: { x: number; y: number; r: number; tinta: string; taglio: 'cabochon' | 'brillante'; ctx: Ctx }) {
  const chiaro = mescola(tinta, '#FFFFFF', 0.55);
  const scuro = mescola(tinta, '#000000', 0.5);
  const castone = <Circle cx={x + 0.15} cy={y + 0.3} r={r * 1.22} fill={ctx.m[2]} />;
  const anelloC = <Circle cx={x} cy={y} r={r * 1.18} fill={`url(#${ctx.id('met')})`} />;
  if (taglio === 'cabochon' || ctx.det === 0) {
    return (
      <G>
        {castone}
        {anelloC}
        <Circle cx={x} cy={y} r={r} fill={`url(#${ctx.id('cab')})`} />
        <Circle cx={x} cy={y} r={r} fill={tinta} opacity={0.62} />
        <Circle cx={x} cy={y} r={r} fill={`url(#${ctx.id('cupola')})`} />
        <Ellipse cx={x - r * 0.32} cy={y - r * 0.36} rx={r * 0.34} ry={r * 0.2} fill="#FFFFFF" opacity={0.85} transform={`rotate(-30 ${n2(x - r * 0.32)} ${n2(y - r * 0.36)})`} />
      </G>
    );
  }
  // Brillante: tavola chiara al centro, otto faccette alternate chiare e scure, griffe ai quattro lati.
  const ott = (rr: number, off = 22.5) => Array.from({ length: 8 }, (_, i) => [x + rr * Math.cos(rad(off + i * 45)), y + rr * Math.sin(rad(off + i * 45))] as const);
  const est = ott(r);
  const tav = ott(r * 0.52);
  const facce = est.map((p, i) => {
    const q = est[(i + 1) % 8];
    const t0 = tav[i];
    const t1 = tav[(i + 1) % 8];
    return { d: `M${n2(p[0])} ${n2(p[1])}L${n2(q[0])} ${n2(q[1])}L${n2(t1[0])} ${n2(t1[1])}L${n2(t0[0])} ${n2(t0[1])}Z`, i };
  });
  // Le faccette verso la luce (in alto a sinistra) sono le più chiare.
  const tono = (i: number) => {
    const a = 22.5 + i * 45 + 22.5;
    const verso = Math.cos(rad(a - 225));
    return verso > 0.3 ? chiaro : verso < -0.3 ? scuro : tinta;
  };
  return (
    <G>
      {castone}
      {[45, 135, 225, 315].map(a => {
        const [gx, gy] = [x + r * 1.08 * Math.cos(rad(a)), y + r * 1.08 * Math.sin(rad(a))];
        return <Circle key={a} cx={gx} cy={gy} r={r * 0.24} fill={`url(#${ctx.id('met')})`} />;
      })}
      {facce.map(f => (
        <Path key={f.i} d={f.d} fill={tono(f.i)} />
      ))}
      <Path d={`M${tav.map(p => `${n2(p[0])} ${n2(p[1])}`).join('L')}Z`} fill={mescola(tinta, '#FFFFFF', 0.25)} />
      <Path d={`M${est.map(p => `${n2(p[0])} ${n2(p[1])}`).join('L')}Z`} fill="none" stroke={scuro} strokeWidth={ctx.lw * 0.8} strokeOpacity={0.7} />
      <Path d={stella4(x - r * 0.28, y - r * 0.3, r * 0.5)} fill="#FFFFFF" opacity={0.9} />
    </G>
  );
}

/** Il corpo dell'anello, secondo il profilo, con i fili di rilievo. */
function Corpo({ ctx }: { ctx: Ctx }) {
  const { st, Rf, T, Rm, Ro, id, lw, det } = ctx;
  const met = `url(#${id('met')})`;
  if (st.profilo === 'doppio') {
    const r1 = Ro - T * 0.22;
    const r2 = Rf + T * 0.2;
    return (
      <G>
        <Path d={anello(Ro, Rf)} fill={ctx.m[2]} opacity={0.75} />
        {[
          [r1, T * 0.44],
          [r2, T * 0.4],
        ].map(([r, w], i) => (
          <G key={i}>
            <Circle cx={C} cy={C} r={r} fill="none" stroke={met} strokeWidth={w} />
            <Path d={arco(r - w * 0.12, 196, 262)} stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={Math.max(lw, w * 0.22)} strokeLinecap="round" fill="none" />
          </G>
        ))}
      </G>
    );
  }
  const piatto = st.profilo === 'piatto';
  return (
    <G>
      <Circle cx={C} cy={C} r={Rm} fill="none" stroke={met} strokeWidth={T} />
      {/* la sezione: un toro lucido (tondo) o una piastra con lo smusso (piatto) */}
      <Circle cx={C} cy={C} r={Rm} fill="none" stroke={`url(#${id(piatto ? 'piastra' : 'toro')})`} strokeWidth={T} />
      {piatto ? (
        <>
          {/* smusso esterno: luce in alto a sinistra; smusso interno: il contrario (guarda verso il centro) */}
          <Circle cx={C} cy={C} r={Ro - T * 0.09} fill="none" stroke={`url(#${id('filo')})`} strokeWidth={T * 0.18} />
          <Circle cx={C} cy={C} r={Rf + T * 0.09} fill="none" stroke={`url(#${id('filoInv')})`} strokeWidth={T * 0.18} />
        </>
      ) : null}
      {/* il riflesso statico della lampada: un tratto netto in alto a sinistra, uno morbido più largo */}
      <Path d={arco(Rm + T * (piatto ? 0.05 : -0.08), 198, 252)} stroke="#FFFFFF" strokeOpacity={rarita(st.rarita).riflesso.opacita * 0.7} strokeWidth={T * 0.36} strokeLinecap="round" fill="none" />
      <Path d={arco(Rm + T * (piatto ? 0.05 : -0.08), 210, 238)} stroke="#FFFFFF" strokeOpacity={0.35 + rarita(st.rarita).riflesso.nitidezza * 0.5} strokeWidth={Math.max(lw, T * (0.08 + 0.1 * (1 - rarita(st.rarita).riflesso.nitidezza)))} strokeLinecap="round" fill="none" />
      {det > 0 ? <Path d={arco(Rm + T * 0.18, 18, 72)} stroke="#CFE2FF" strokeOpacity={0.3} strokeWidth={T * 0.16} strokeLinecap="round" fill="none" /> : null}
    </G>
  );
}

/** Zigrinatura o perline sul bordo esterno. */
function Bordo({ ctx }: { ctx: Ctx }) {
  const { st, Ro, det, lw } = ctx;
  if (!st.bordo || det === 0) return null;
  if (st.bordo === 'zigrinato') {
    const n = Math.round((2 * Math.PI * Ro) / 1.5);
    let d = '';
    for (let i = 0; i < n; i++) {
      const a = (i * 360) / n;
      const [x0, y0] = punto(Ro - 1.5, a);
      const [x1, y1] = punto(Ro - 0.1, a);
      d += `M${n2(x0)} ${n2(y0)}L${n2(x1)} ${n2(y1)}`;
    }
    return <Path d={d} stroke="#000000" strokeOpacity={0.4} strokeWidth={Math.max(lw * 0.7, 0.45)} />;
  }
  const n = Math.round((2 * Math.PI * Ro) / 2.7);
  let corpo = '';
  let luce = '';
  for (let i = 0; i < n; i++) {
    const [x, y] = punto(Ro - 0.35, (i * 360) / n);
    corpo += cerchio(x, y, 1.05);
    luce += cerchio(x - 0.35, y - 0.35, 0.36);
  }
  return (
    <G>
      <Path d={corpo} fill={ctx.m[2]} transform="translate(0.2 0.3)" />
      <Path d={corpo} fill={ctx.m[1]} />
      <Path d={luce} fill="#FFFFFF" opacity={0.75} />
    </G>
  );
}

/** La fascia di smalto, madreperla o onice al centro dell'anello, con il cloisonné d'ottone ai bordi. */
function Fascia({ ctx }: { ctx: Ctx }) {
  const { st, Rm, T, id, det, lw } = ctx;
  const f = st.fascia;
  if (!f) return null;
  const Tf = T * (st.profilo === 'tondo' ? 0.42 : 0.52);
  let motivo: ReactNode = null;
  if (det > 0 && f.motivo === 'maiolica') {
    const n = Math.max(8, Math.round((2 * Math.PI * Rm) / (Tf * 1.9)));
    let petali = '';
    let centri = '';
    let foglie = '';
    for (let i = 0; i < n; i++) {
      const a = (i * 360) / n;
      const [x, y] = punto(Rm, a);
      const p = Tf * 0.2;
      petali += cerchio(x - p, y, p * 0.78) + cerchio(x + p, y, p * 0.78) + cerchio(x, y - p, p * 0.78) + cerchio(x, y + p, p * 0.78);
      centri += cerchio(x, y, p * 0.55);
      const [fx, fy] = punto(Rm, a + 180 / n);
      foglie += foglia(fx, fy, Tf * 0.5, Tf * 0.22, a + 180 / n + 90);
    }
    const [c0, c1, c2] = f.colori ?? ['#1E4F99', '#F2C230', '#2E7D57'];
    motivo = (
      <G>
        <Path d={foglie} fill={c2} />
        <Path d={petali} fill={c0} />
        <Path d={centri} fill={c1} />
      </G>
    );
  } else if (det > 0 && f.motivo === 'onde') {
    const k = 18;
    let d = '';
    for (let i = 0; i <= 360; i += 2) {
      const r = Rm + Tf * 0.2 * Math.sin(rad(i * k));
      const [x, y] = punto(r, i);
      d += `${i ? 'L' : 'M'}${n2(x)} ${n2(y)}`;
    }
    motivo = (
      <G>
        <Path d={d} fill="none" stroke={f.colori?.[0] ?? '#D6EAFF'} strokeWidth={Math.max(lw, Tf * 0.16)} strokeOpacity={0.9} />
        <Path d={d} fill="none" stroke={f.colori?.[0] ?? '#D6EAFF'} strokeWidth={Math.max(lw * 0.6, Tf * 0.08)} strokeOpacity={0.45} transform={`rotate(${180 / k} 50 50)`} />
      </G>
    );
  } else if (f.motivo === 'stelle') {
    const n = det === 0 ? 8 : 14;
    let d = '';
    for (let i = 0; i < n; i++) {
      const [x, y] = punto(Rm, (i * 360) / n + 6);
      d += stella5(x, y, Tf * (i % 2 ? 0.26 : 0.36));
    }
    motivo = <Path d={d} fill={`url(#${id('met')})`} />;
  } else if (det > 0 && f.motivo === 'scritta') {
    // Una legenda incisa come sulle monete: tratti di lettere e due punti divisori, in alto e in basso.
    const rnd = seeded(st.id.length * 31 + 7);
    let d = '';
    let a = -78;
    while (a < 258) {
      if (Math.abs(a - 90) < 9 || Math.abs(a + 90) < 9 || Math.abs(a - 270) < 9) {
        const [x, y] = punto(Rm, a + 4.5);
        d += cerchio(x, y, Tf * 0.12);
        a += 9;
        continue;
      }
      const passo = 2.4 + rnd() * 2.6;
      const r0 = Rm - Tf * 0.24;
      const r1 = Rm + Tf * 0.24;
      const [x0, y0] = punto(r0, a);
      const [x1, y1] = punto(r1, a + (rnd() < 0.3 ? passo * 0.6 : 0));
      d += `M${n2(x0)} ${n2(y0)}L${n2(x1)} ${n2(y1)}`;
      a += passo;
    }
    motivo = <Path d={d} fill={f.colori?.[0] ?? '#F6E3B0'} stroke={f.colori?.[0] ?? '#F6E3B0'} strokeWidth={Math.max(lw * 0.7, Tf * 0.1)} strokeLinecap="round" opacity={0.85} />;
  } else if (f.motivo === 'tre') {
    const col = f.colori ?? ['#B5532A', '#D8485A', '#1E4F99'];
    motivo = (
      <G>
        {col.map((cc, i) => (
          <Path key={i} d={arco(Rm, -90 + i * 120 + 4, -90 + (i + 1) * 120 - 4)} stroke={cc} strokeWidth={Tf} fill="none" />
        ))}
      </G>
    );
  }
  return (
    <G>
      <Circle cx={C} cy={C} r={Rm} fill="none" stroke={f.tipo === 'madreperla' ? `url(#${id('madre')})` : f.tipo === 'onice' ? '#14101C' : f.tinta} strokeWidth={Tf} />
      {f.tipo === 'madreperlaNera' ? <Circle cx={C} cy={C} r={Rm} fill="none" stroke={`url(#${id('madre')})`} strokeWidth={Tf} opacity={0.22} /> : null}
      {f.tipo === 'smalto' ? <Circle cx={C} cy={C} r={Rm} fill="none" stroke={`url(#${id('smalto')})`} strokeWidth={Tf} /> : null}
      {motivo}
      {/* vetro dello smalto: lucido in alto a sinistra, profondo in basso a destra */}
      <Circle cx={C} cy={C} r={Rm} fill="none" stroke={`url(#${id('vetro')})`} strokeWidth={Tf} />
      {/* cloisonné: i fili d'ottone che tengono lo smalto */}
      <Circle cx={C} cy={C} r={Rm - Tf / 2} fill="none" stroke={`url(#${id('met')})`} strokeWidth={Math.max(lw, T * 0.07)} />
      <Circle cx={C} cy={C} r={Rm + Tf / 2} fill="none" stroke={`url(#${id('met')})`} strokeWidth={Math.max(lw, T * 0.07)} />
    </G>
  );
}

/** L'ornamento che corre intorno: perle, alloro, raggi, foglie, gigli, fiamme, semi, castoni. */
function GiroOrnamento({ ctx, fase }: { ctx: Ctx; fase: 'dietro' | 'davanti' }) {
  const { st, T, Rm, Ro, id, det, lw, m } = ctx;
  const g = st.giro;
  if (!g) return null;
  const met = `url(#${id('met')})`;
  // Raggi, alloro, foglie e fiamme stanno dietro l'anello (escono dalla sagoma); il resto sopra.
  const dietro = g.tipo === 'raggi' || g.tipo === 'alloro' || g.tipo === 'fiamme' || g.tipo === 'foglie';
  if ((fase === 'dietro') !== dietro) return null;
  switch (g.tipo) {
    case 'perle': {
      const sopraFascia = !!st.fascia;
      const r = sopraFascia ? T * 0.2 : T * 0.47;
      let corpo = '';
      let luce = '';
      let ombraP = '';
      const n = det === 0 && !sopraFascia ? Math.min(g.n, 16) : g.n;
      for (let i = 0; i < n; i++) {
        const [x, y] = punto(Rm, (i * 360) / n + (sopraFascia ? 15 : 0));
        ombraP += cerchio(x + r * 0.15, y + r * 0.3, r);
        corpo += cerchio(x, y, r);
        luce += cerchio(x - r * 0.32, y - r * 0.34, r * 0.32);
      }
      return (
        <G>
          <Path d={ombraP} fill="#000000" opacity={0.35} />
          <Path d={corpo} fill={`url(#${id('perla')})`} />
          {det > 0 ? <Path d={luce} fill="#FFFFFF" opacity={0.95} /> : null}
        </G>
      );
    }
    case 'alloro': {
      const per = g.n / 2;
      let foglie = '';
      let nervi = '';
      for (const s of [-1, 1]) {
        for (let i = 0; i < per; i++) {
          const th = 90 + s * (16 + (i * 150) / per);
          const fuori = i % 2 === 0;
          const r = fuori ? Ro + 1.6 : Ro - 0.2;
          const [x, y] = punto(r, th);
          const ang = th + s * 90 + (fuori ? -s * 28 : s * 8);
          const L = det === 0 ? 9 : 8.4;
          foglie += foglia(x, y, L, 3.1, ang);
          const a = rad(ang);
          nervi += `M${n2(x - (L / 2.6) * Math.cos(a))} ${n2(y - (L / 2.6) * Math.sin(a))}L${n2(x + (L / 2.6) * Math.cos(a))} ${n2(y + (L / 2.6) * Math.sin(a))}`;
        }
      }
      const verde = g.tinte?.[0] ?? '#2E7D57';
      return (
        <G>
          <Path d={arco(Ro + 0.4, 94, 254)} stroke={m[2]} strokeWidth={Math.max(lw, 0.9)} fill="none" />
          <Path d={arco(Ro + 0.4, -74, 86)} stroke={m[2]} strokeWidth={Math.max(lw, 0.9)} fill="none" />
          <Path d={foglie} fill="#000000" opacity={0.35} transform="translate(0.3 0.6)" />
          <Path d={foglie} fill={g.oro ? met : verde} stroke={g.oro ? m[2] : met} strokeWidth={Math.max(lw * 0.8, 0.5)} />
          {!g.oro ? <Path d={foglie} fill={`url(#${id('vetroPieno')})`} /> : null}
          {det > 0 ? <Path d={nervi} stroke={g.oro ? m[0] : met} strokeOpacity={0.9} strokeWidth={Math.max(lw * 0.6, 0.4)} /> : null}
        </G>
      );
    }
    case 'raggi': {
      // Raggi scolpiti a due falde: la falda verso la luce chiara, l'altra scura.
      let chiare = '';
      let scure = '';
      for (let i = 0; i < g.n; i++) {
        const th = (i * 360) / g.n - 90;
        const lungo = Math.min(4.8, 49.2 - Ro);
        const L = i % 2 ? lungo * 0.58 : lungo;
        const hw = ((Math.PI * Ro) / g.n) * 0.72;
        const P = luogo(th, Ro - 0.8);
        const a = `M${P(-hw, 0)}L${P(0, L + 0.8)}L${P(0, 0)}Z`;
        const b = `M${P(0, 0)}L${P(0, L + 0.8)}L${P(hw, 0)}Z`;
        // la falda «antioraria» guarda la luce nella metà destra del giro, l'altra nella sinistra
        const versoLuce = Math.sin(rad(th + 35)) < 0;
        chiare += versoLuce ? a : b;
        scure += versoLuce ? b : a;
      }
      return (
        <G>
          <Path d={chiare + scure} fill="#000000" opacity={0.3} transform="translate(0.3 0.6)" />
          <Path d={chiare} fill={met} />
          <Path d={scure} fill={met} />
          <Path d={scure} fill="#000000" opacity={0.28} />
          <Path d={chiare} fill="#FFFFFF" opacity={0.14} />
        </G>
      );
    }
    case 'foglie': {
      let d = '';
      let nervi = '';
      for (let i = 0; i < g.n; i++) {
        const th = (i * 360) / g.n - 90;
        const hw = ((Math.PI * Ro) / g.n) * 0.95;
        const P = luogo(th, Ro - 1.4);
        d += `M${P(-hw, 0)}Q${P(-hw * 0.9, 2.6)} ${P(0, 3.6)}Q${P(hw * 0.9, 2.6)} ${P(hw, 0)}Z`;
        nervi += `M${P(0, 0.4)}L${P(0, 3)}`;
      }
      return (
        <G>
          <Path d={d} fill="#000000" opacity={0.3} transform="translate(0.3 0.5)" />
          <Path d={d} fill={met} stroke={m[2]} strokeWidth={Math.max(lw * 0.7, 0.4)} />
          {det > 0 ? <Path d={nervi} stroke={m[2]} strokeOpacity={0.7} strokeWidth={Math.max(lw * 0.6, 0.35)} /> : null}
        </G>
      );
    }
    case 'gigli': {
      let d = '';
      for (let i = 0; i < g.n; i++) {
        const th = (i * 360) / g.n - 90;
        const P = luogo(th, Ro - T * 0.55);
        const k = (Math.min(Ro + 6.2, 49.4) - (Ro - T * 0.55)) / 10;
        const Q = (u: number, v: number) => P(u * k, v * k);
        d += `M${Q(0, 0)}C${Q(-1.6, 3)} ${Q(-1.6, 7)} ${Q(0, 10)}C${Q(1.6, 7)} ${Q(1.6, 3)} ${Q(0, 0)}Z`;
        d += `M${Q(-0.6, 2)}C${Q(-3, 2)} ${Q(-4.8, 4)} ${Q(-4, 7.2)}C${Q(-3, 5.4)} ${Q(-1.8, 4.8)} ${Q(-0.6, 4)}Z`;
        d += `M${Q(0.6, 2)}C${Q(3, 2)} ${Q(4.8, 4)} ${Q(4, 7.2)}C${Q(3, 5.4)} ${Q(1.8, 4.8)} ${Q(0.6, 4)}Z`;
        d += `M${Q(-2.6, 2.2)}L${Q(2.6, 2.2)}L${Q(2.6, 3.4)}L${Q(-2.6, 3.4)}Z`;
      }
      return (
        <G>
          <Path d={d} fill="#000000" opacity={0.4} transform="translate(0.3 0.6)" />
          <Path d={d} fill={met} stroke={m[2]} strokeWidth={Math.max(lw * 0.8, 0.45)} />
        </G>
      );
    }
    case 'fiamme': {
      let fuori = '';
      let dentro = '';
      for (let i = 0; i < g.n; i++) {
        const th = (i * 360) / g.n - 90;
        const alto = Math.min(6.6, 48.2 - Ro);
        const L = i % 2 ? alto * 0.72 : alto;
        const hw = ((Math.PI * Ro) / g.n) * 0.82;
        const P = luogo(th, Ro - 1.2);
        fuori += `M${P(-hw, 0)}Q${P(-hw * 0.3, L * 0.5)} ${P(hw * 0.5, L + 1.2)}Q${P(hw * 0.2, L * 0.45)} ${P(hw, 0)}Z`;
        dentro += `M${P(-hw * 0.45, 0.6)}Q${P(-hw * 0.1, L * 0.4)} ${P(hw * 0.25, L * 0.7)}Q${P(hw * 0.1, L * 0.3)} ${P(hw * 0.45, 0.6)}Z`;
      }
      return (
        <G>
          <Path d={fuori} fill="#000000" opacity={0.3} transform="translate(0.3 0.6)" />
          <Path d={fuori} fill={met} />
          <Path d={dentro} fill={g.tinte?.[0] ?? '#E0461E'} opacity={0.9} />
          <Path d={dentro} fill={`url(#${id('vetroPieno')})`} />
        </G>
      );
    }
    case 'semi': {
      // I quattro semi napoletani in quattro medaglioni smaltati di bianco.
      const semi: AvatarGlyph[] = ['coppa', 'denaro', 'spada', 'bastone'];
      const col = ['#B5312B', '#C8861A', '#2B4E8C', '#3E6E3A'];
      return (
        <G>
          {semi.map((s, i) => {
            const th = -45 + i * 90;
            const [x, y] = punto(Rm, th);
            const r = T * 0.66;
            const glifo = GLYPH[s];
            return (
              <G key={s}>
                <Circle cx={x + 0.2} cy={y + 0.4} r={r * 1.18} fill="#000000" opacity={0.35} />
                <Circle cx={x} cy={y} r={r * 1.18} fill={met} />
                <Circle cx={x} cy={y} r={r} fill="#F4F1EA" />
                {det > 0 && glifo ? <G transform={`translate(${n2(x - r)} ${n2(y - r)}) scale(${n2((2 * r) / 100)})`}>{glifo(col[i], '#F4F1EA')}</G> : <Circle cx={x} cy={y} r={r * 0.45} fill={col[i]} />}
                <Ellipse cx={x - r * 0.3} cy={y - r * 0.4} rx={r * 0.45} ry={r * 0.22} fill="#FFFFFF" opacity={0.45} />
              </G>
            );
          })}
        </G>
      );
    }
    case 'castoni': {
      const tinte = g.tinte ?? ['#E8F2FF'];
      const sfasa = st.gemme ? 180 / g.n : 0;
      return (
        <G>
          {Array.from({ length: g.n }, (_, i) => {
            const [x, y] = punto(Rm, (i * 360) / g.n - 90 + sfasa);
            return <Gemma key={i} x={x} y={y} r={T * (det === 0 ? 0.3 : 0.26)} tinta={tinte[i % tinte.length]} taglio="brillante" ctx={ctx} />;
          })}
        </G>
      );
    }
  }
}

/** In cima: corona d'oro, corona di corallo (Partenope), la luna sul golfo. */
function Cimiero({ ctx }: { ctx: Ctx }) {
  const { st, Rf, id, lw, m, det } = ctx;
  const met = `url(#${id('met')})`;
  const base = C - Rf + 0.6; // la parte bassa scende fino al bordo del foro, non oltre
  if (st.cimiero === 'corona') {
    // Corona a cinque punte con i lati concavi, perle in cima, la fascia gemmata che abbraccia l'anello e il
    // berretto di velluto rosso che si vede tra le punte.
    const w = 23;
    const fascia = base - 4;
    const p = (x: number, y: number) => `${n2(C + x)} ${n2(y)}`;
    const punte: [number, number][] = [
      [-w + 0.8, 5.6],
      [-w * 0.5, 2.6],
      [0, 0.9],
      [w * 0.5, 2.6],
      [w - 0.8, 5.6],
    ];
    const valli = [-w * 0.75, -w * 0.25, w * 0.25, w * 0.75];
    let d = `M${p(-w, base)}L${p(-w - 0.6, fascia)}`;
    punte.forEach(([x, y], i) => {
      const da = i === 0 ? -w - 0.6 : valli[i - 1];
      const a2 = i === 4 ? w + 0.6 : valli[i];
      // lato concavo in salita fino alla punta, poi in discesa fino alla valle
      d += `Q${p((da + x) / 2 + (x - da) * 0.18, fascia - (fascia - y) * 0.25)} ${p(x, y)}`;
      d += `Q${p((x + a2) / 2 - (a2 - x) * 0.18, fascia - (fascia - y) * 0.25)} ${p(a2, i === 4 ? fascia : fascia - 1.4)}`;
    });
    d += `L${p(w, base)}Q${p(0, base - 2.6)} ${p(-w, base)}Z`;
    const cuffia = `M${p(-w * 0.8, fascia)}Q${p(-w * 0.62, 3.2)} ${p(0, 2.6)}Q${p(w * 0.62, 3.2)} ${p(w * 0.8, fascia)}Z`;
    const banda = `M${p(-w, base)}L${p(-w - 0.6, fascia)}Q${p(0, fascia - 2.6)} ${p(w + 0.6, fascia)}L${p(w, base)}Q${p(0, base - 2.6)} ${p(-w, base)}Z`;
    return (
      <G>
        <Path d={d} fill="#000000" opacity={0.42} transform="translate(0.5 1)" />
        <Path d={cuffia} fill="#7A1426" />
        {det > 0 ? <Path d={cuffia} fill={`url(#${id('vetroPieno')})`} opacity={0.7} /> : null}
        <Path d={d} fill={met} stroke={m[2]} strokeWidth={Math.max(lw, 0.55)} strokeLinejoin="round" />
        {det > 0
          ? punte.map(([x, y], i) => (
              // la nervatura di ogni punta: luce a sinistra, ombra a destra
              <G key={i}>
                <Path d={`M${p(x, y + 1.6)}L${p(x, fascia - 1.6)}`} stroke={m[0]} strokeOpacity={0.8} strokeWidth={Math.max(lw, 0.55)} />
                <Path d={`M${p(x + 0.5, y + 1.8)}L${p(x + 0.5, fascia - 1.6)}`} stroke={m[2]} strokeOpacity={0.6} strokeWidth={Math.max(lw * 0.7, 0.4)} />
              </G>
            ))
          : null}
        <Path d={banda} fill={met} />
        <Path d={banda} fill="#000000" opacity={0.12} />
        <Path d={`M${p(-w - 0.5, fascia + 0.3)}Q${p(0, fascia - 2.3)} ${p(w + 0.5, fascia + 0.3)}`} stroke={m[0]} strokeOpacity={0.9} strokeWidth={Math.max(lw, 0.6)} fill="none" />
        {punte.map(([x, y], i) => (
          <G key={i}>
            <Circle cx={C + x + 0.2} cy={y + 0.3} r={1.7} fill="#000000" opacity={0.35} />
            <Circle cx={C + x} cy={y} r={1.7} fill={`url(#${id('perla')})`} />
            <Circle cx={C + x - 0.55} cy={y - 0.55} r={0.55} fill="#FFFFFF" />
          </G>
        ))}
        <Gemma x={C} y={(base + fascia) / 2 - 0.9} r={1.9} tinta="#B0182C" taglio="brillante" ctx={ctx} />
        <Gemma x={C - w * 0.52} y={(base + fascia) / 2 - 0.4} r={1.3} tinta="#2450B8" taglio="cabochon" ctx={ctx} />
        <Gemma x={C + w * 0.52} y={(base + fascia) / 2 - 0.4} r={1.3} tinta="#2450B8" taglio="cabochon" ctx={ctx} />
      </G>
    );
  }
  if (st.cimiero === 'corallo') {
    // La corona di corallo di Partenope: rami che si aprono a ventaglio, punte tonde, perle tra i rami.
    const rami: [number, number, number, number, number, number][] = [
      // x0, y0, cx, cy, x1, y1
      [0, base - 1, 0, 8, 0, 1],
      [-2, base - 1, -6, 9, -9, 2.4],
      [2, base - 1, 6, 9, 9, 2.4],
      [-4, base, -12, 10, -16.5, 5],
      [4, base, 12, 10, 16.5, 5],
      [-6.5, 9, -4, 5.5, -4.6, 3.2],
      [6.5, 9, 4, 5.5, 4.6, 3.2],
      [-10, 8.4, -12.5, 6.5, -12.4, 4],
      [10, 8.4, 12.5, 6.5, 12.4, 4],
    ];
    const d = rami.map(([x0, y0, cx, cy, x1, y1]) => `M${n2(C + x0)} ${n2(y0)}Q${n2(C + cx)} ${n2(cy)} ${n2(C + x1)} ${n2(y1)}`).join('');
    const punte = rami.map(([, , , , x1, y1]) => cerchio(C + x1, y1, 1.15)).join('');
    return (
      <G>
        <Path d={d} stroke="#000000" strokeOpacity={0.35} strokeWidth={2.8} strokeLinecap="round" fill="none" transform="translate(0.4 0.8)" />
        <Path d={d} stroke="#9A2032" strokeWidth={2.8} strokeLinecap="round" fill="none" />
        <Path d={d} stroke="#E25A66" strokeWidth={1.7} strokeLinecap="round" fill="none" />
        <Path d={d} stroke="#FFB0B4" strokeOpacity={0.7} strokeWidth={0.6} strokeLinecap="round" fill="none" transform="translate(-0.4 -0.3)" />
        <Path d={punte} fill="#F07A84" />
        {[-7.5, 7.5].map(x => (
          <G key={x}>
            <Circle cx={C + x} cy={base - 3.2} r={1.5} fill={`url(#${id('perla')})`} />
            <Circle cx={C + x - 0.45} cy={base - 3.65} r={0.5} fill="#FFFFFF" />
          </G>
        ))}
      </G>
    );
  }
  if (st.cimiero === 'luna') {
    // La luna sul golfo, d'argento brunito, con una stella accanto.
    const cy = 7.2;
    const r = 7;
    const luna = `M${n2(C - r * 0.2)} ${n2(cy - r)}A${r} ${r} 0 1 0 ${n2(C + r * 0.95)} ${n2(cy + r * 0.35)}A${n2(r * 0.8)} ${n2(r * 0.8)} 0 1 1 ${n2(C - r * 0.2)} ${n2(cy - r)}Z`;
    return (
      <G>
        <Circle cx={C} cy={cy} r={r * 1.5} fill={`url(#${id('alone')})`} />
        <Path d={luna} fill="#000000" opacity={0.4} transform="translate(0.4 0.8)" />
        <Path d={luna} fill={`url(#${id('argentoLuna')})`} stroke="#2E2022" strokeWidth={Math.max(lw, 0.5)} />
        <Path d={stella4(C + 9.5, cy - 4, 2.2, 0.22)} fill="#F6E8C8" />
      </G>
    );
  }
  return null;
}

/** In basso: il nastro, la goccia, la conchiglia, la lampara. Il nastro sta dietro l'anello (fase 'dietro'). */
function Pendente({ ctx, fase }: { ctx: Ctx; fase: 'dietro' | 'davanti' }) {
  const { st, Ro, Rm, id, lw, m, det } = ctx;
  const p = st.pendente;
  if (!p) return null;
  const met = `url(#${id('met')})`;
  if (p === 'nastro') {
    const t = st.tintaPendente ?? '#A8323C';
    const y0 = C + Ro - 3;
    if (fase === 'dietro') {
      const coda = (s: 1 | -1) => {
        const x = (v: number) => n2(C + s * v);
        return `M${x(1)} ${n2(y0)}L${x(9.6)} ${n2(99.4)}L${x(12.2)} ${n2(96.8)}L${x(15.4)} ${n2(98.6)}L${x(6.4)} ${n2(y0 - 1.6)}Z`;
      };
      return (
        <G>
          <Path d={coda(-1) + coda(1)} fill={t} />
          <Path d={coda(-1)} fill="#FFFFFF" opacity={0.16} />
          <Path d={coda(1)} fill="#000000" opacity={0.22} />
        </G>
      );
    }
    return (
      <G>
        <Ellipse cx={C + 0.3} cy={y0 + 0.6} rx={3.4} ry={2.6} fill="#000000" opacity={0.35} />
        <Ellipse cx={C} cy={y0} rx={3.4} ry={2.6} fill={t} />
        <Ellipse cx={C - 0.8} cy={y0 - 0.8} rx={1.4} ry={0.8} fill="#FFFFFF" opacity={0.35} />
      </G>
    );
  }
  if (fase === 'dietro') return null;
  if (p === 'gemma') {
    const y = C + Rm + 1;
    const t = st.tintaPendente ?? '#2450B8';
    const goccia = `M${C} ${n2(y - 4.6)}C${C + 3.4} ${n2(y - 1)} ${C + 3.2} ${n2(y + 3.6)} ${C} ${n2(y + 3.8)}C${C - 3.2} ${n2(y + 3.6)} ${C - 3.4} ${n2(y - 1)} ${C} ${n2(y - 4.6)}Z`;
    return (
      <G>
        <Path d={goccia} fill="#000000" opacity={0.4} transform="translate(0.3 0.6) scale(1)" />
        <Path d={goccia} fill={met} transform={`translate(${n2(-C * 0.18)} ${n2(-y * 0.18)}) scale(1.18)`} />
        <Path d={goccia} fill={t} />
        <Path d={goccia} fill={`url(#${id('cupola')})`} />
        <Path d={stella4(C - 1, y - 1.4, 1.5, 0.25)} fill="#FFFFFF" opacity={0.9} />
      </G>
    );
  }
  if (p === 'conchiglia') {
    // La conchiglia di madreperla, con le coste.
    const y = C + Rm + 2;
    const w = 7.4;
    const h = 7.4;
    const guscio = `M${n2(C - w)} ${n2(y - 1)}Q${n2(C - w)} ${n2(y - h)} ${C} ${n2(y - h)}Q${n2(C + w)} ${n2(y - h)} ${n2(C + w)} ${n2(y - 1)}L${n2(C + 2)} ${n2(y + 3)}L${n2(C - 2)} ${n2(y + 3)}Z`;
    let coste = '';
    for (let i = -3; i <= 3; i++) coste += `M${C} ${n2(y + 2.4)}L${n2(C + i * (w / 3.4))} ${n2(y - h + Math.abs(i) * 0.9 + 0.6)}`;
    return (
      <G>
        <Path d={guscio} fill="#000000" opacity={0.4} transform="translate(0.4 0.8)" />
        <Path d={guscio} fill={`url(#${id('madre')})`} stroke={m[2]} strokeWidth={Math.max(lw, 0.5)} />
        {det > 0 ? <Path d={coste} stroke="#B89AA8" strokeOpacity={0.8} strokeWidth={Math.max(lw * 0.7, 0.45)} /> : null}
        <Path d={`M${n2(C - 2.4)} ${n2(y + 1.6)}h4.8v2.2h-4.8z`} fill={met} />
      </G>
    );
  }
  // La lampara: la barca dei pescatori con la lampada accesa, sull'onda.
  const y = C + Ro - 1.2;
  return (
    <G>
      <Circle cx={C} cy={y - 3.2} r={7} fill={`url(#${id('fiamma')})`} />
      <Path d={`M${C - 8.5} ${n2(y)}Q${C} ${n2(y + 5.2)} ${C + 8.5} ${n2(y)}Z`} fill="#000000" opacity={0.4} transform="translate(0.3 0.7)" />
      <Path d={`M${C - 8.5} ${n2(y)}Q${C} ${n2(y + 5.2)} ${C + 8.5} ${n2(y)}Z`} fill="#5A3A26" stroke="#2E1A10" strokeWidth={Math.max(lw, 0.5)} />
      <Path d={`M${C - 7.6} ${n2(y + 0.7)}Q${C} ${n2(y + 2.6)} ${C + 7.6} ${n2(y + 0.7)}`} stroke="#C9A15A" strokeWidth={Math.max(lw, 0.55)} fill="none" />
      <Path d={`M${C + 3} ${n2(y)}V${n2(y - 5.4)}`} stroke="#2E1A10" strokeWidth={Math.max(lw, 0.7)} />
      <Circle cx={C + 3} cy={y - 6.2} r={1.5} fill="#FFE4B0" />
      <Circle cx={C + 3} cy={y - 6.2} r={0.7} fill="#FFFFFF" />
    </G>
  );
}

/** Le gemme incastonate nell'anello. */
function GemmeAnello({ ctx }: { ctx: Ctx }) {
  const { st, Rm } = ctx;
  if (!st.gemme) return null;
  const g = st.gemme;
  return (
    <G>
      {angoliGemme(st).map((a, i) => {
        const [x, y] = punto(Rm, a);
        return <Gemma key={i} x={x} y={y} r={g.misura} tinta={g.tinta} taglio={g.taglio} ctx={ctx} />;
      })}
    </G>
  );
}

/* ------------------------------------------------------------------ fondo dell'avatar */

function FondoSvg({ f, Rf, id, det, seme }: { f: FondoAvatar; Rf: number; id: (s: string) => string; det: 0 | 1 | 2; seme: number }) {
  let extra: ReactNode = null;
  if (f.tipo === 'carta') {
    // Il doppio filetto stampato delle napoletane, nel colore del seme.
    extra = (
      <G>
        <Circle cx={C} cy={C} r={Rf * 0.9} fill="none" stroke={f.filo} strokeWidth={det === 0 ? 1.6 : 1.1} strokeOpacity={0.85} />
        {det > 0 ? <Circle cx={C} cy={C} r={Rf * 0.84} fill="none" stroke={f.filo} strokeWidth={0.45} strokeOpacity={0.7} /> : null}
      </G>
    );
  } else if (f.tipo === 'notte' && det > 0) {
    const rnd = seeded(seme);
    let d = '';
    for (let i = 0; i < 9; i++) {
      const a = rnd() * 360;
      const r = Rf * (0.55 + rnd() * 0.32);
      const [x, y] = punto(r, a);
      d += cerchio(x, y, 0.35 + rnd() * 0.45);
    }
    extra = <Path d={d} fill="#F6EBD9" opacity={0.75} />;
  } else if (f.tipo === 'panno' && det > 0) {
    extra = <Circle cx={C} cy={C} r={Rf * 0.86} fill="none" stroke={f.filo} strokeOpacity={0.55} strokeWidth={0.7} strokeDasharray="2.2 1.6" />;
  } else if (f.tipo === 'cielo') {
    // Il golfo: una striscia di mare sotto il Vesuvio, con il riflesso del sole.
    extra = (
      <G>
        <Path d={`M${C - Rf} ${C + Rf * 0.42}H${C + Rf}V${C + Rf}H${C - Rf}Z`} fill="#3A2A52" opacity={0.85} />
        {det > 0 ? <Path d={`M${C - 6} ${C + Rf * 0.52}h12M${C - 3.5} ${C + Rf * 0.64}h7`} stroke="#F6D6A8" strokeOpacity={0.6} strokeWidth={0.8} strokeLinecap="round" /> : null}
      </G>
    );
  } else if (f.tipo === 'velluto' || f.tipo === 'smalto' || f.tipo === 'notte') {
    extra = det > 0 ? <Circle cx={C} cy={C} r={Rf * 0.9} fill="none" stroke={f.filo} strokeOpacity={0.5} strokeWidth={0.5} /> : null;
  }
  return (
    <G>
      <Circle cx={C} cy={C} r={Rf + 0.4} fill={`url(#${id('fondo')})`} />
      {f.tipo === 'velluto' ? <Circle cx={C} cy={C} r={Rf + 0.4} fill={`url(#${id('pelo')})`} /> : null}
      {extra}
    </G>
  );
}

/* ------------------------------------------------------------------ animazioni (solo in vetrina) */
// Sono animazioni CSS di Reanimated 4 (css.keyframes + animationName): sul web diventano animazioni del browser
// (nessun lavoro JS a ogni fotogramma), sul nativo girano sul thread grafico. Solo opacity e transform. Partono
// solo quando useAmbient è vero (niente riduci movimento, schermata a fuoco, app attiva): altrimenti non si montano
// e resta il metallo con il suo riflesso statico. Curve: cubic-bezier di ease.move (inOut cubic) e lineare.

// 'ease-in-out' (cubic-bezier(0.42, 0, 0.58, 1)): la curva simmetrica, vicina a ease.move, valida anche sul web.
const INOUT = 'ease-in-out' as const;

/** Il riflesso passa: un tratto di luce che sale lungo il fianco sinistro fino in alto (da ore 7 a ore 12, dove batte
 *  la lampada) in 1,2 s, poi si riposa. */
function rifl(p: number) {
  const k = mov.riflesso / (mov.riflesso + p);
  // I selettori sono percentuali scritte ('30%'): un numero nudo vale come frazione (0…1).
  const pc = (x: number) => `${Math.round(x * 1000) / 10}%`;
  return css.keyframes({
    '0%': { opacity: 0, transform: [{ rotate: '-95deg' }] },
    [pc(k * 0.5)]: { opacity: 1, transform: [{ rotate: '-35deg' }] },
    [pc(k)]: { opacity: 0, transform: [{ rotate: '25deg' }] },
    '100%': { opacity: 0, transform: [{ rotate: '25deg' }] },
  });
}
const RIFL = { 6000: rifl(6000), 8000: rifl(8000) } as const;
const RESPIRO = css.keyframes({ from: { opacity: 1 }, to: { opacity: 0.6 } });
const DISSOLVE = css.keyframes({ from: { opacity: 0 }, to: { opacity: 1 } });

function RiflessoAnello({ size, Rm, T, pausa, intensita }: { size: number; Rm: number; T: number; pausa: number; intensita: number }) {
  const uid = 'ra' + useId().replace(/[^a-zA-Z0-9]/g, '');
  // il tratto: un arco di 46° centrato in alto, sfumato ai capi
  const a0 = -113;
  const a1 = -67;
  const [x0, y0] = punto(Rm, a0);
  const [x1, y1] = punto(Rm, a1);
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { opacity: 0, animationName: pausa <= 6000 ? RIFL[6000] : RIFL[8000], animationDuration: mov.riflesso + pausa, animationDelay: 900, animationIterationCount: 'infinite', animationTimingFunction: INOUT }]}
    >
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id={uid} x1={x0} y1={y0} x2={x1} y2={y1} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="#FFFCF0" stopOpacity={0} />
            <Stop offset="0.5" stopColor="#FFFCF0" stopOpacity={intensita} />
            <Stop offset="1" stopColor="#FFFCF0" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path d={arco(Rm, a0, a1)} stroke={`url(#${uid})`} strokeWidth={T * 0.9} strokeLinecap="round" fill="none" />
        <Path d={arco(Rm - T * 0.12, a0 + 10, a1 - 10)} stroke="#FFFFFF" strokeOpacity={intensita} strokeWidth={Math.max(0.7, T * 0.2)} strokeLinecap="round" fill="none" />
      </Svg>
    </Animated.View>
  );
}

/** Le gemme che brillano (leggendario): un bagliore a quattro punte su ogni gemma, opacità 1 ↔ 0,6 in 5 s. */
function Bagliore({ size, punti }: { size: number; punti: [number, number, number][] }) {
  const d = punti.map(([x, y, r]) => stella4(x, y, r, 0.16)).join('');
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { animationName: RESPIRO, animationDuration: 5000, animationIterationCount: 'infinite', animationDirection: 'alternate', animationTimingFunction: INOUT }]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Path d={d} fill="#FFFFFF" opacity={0.95} />
      </Svg>
    </Animated.View>
  );
}

/** La madreperla iridescente (mitico): due strati di madreperla con le tinte sfasate che si danno il cambio in 6 s. */
function Iridescenza({ size, Rm, T }: { size: number; Rm: number; T: number }) {
  const uid = 'ir' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const strato = (id: string, colori: string[], x1: number, y1: number, x2: number, y2: number) => (
    <Svg width={size} height={size} viewBox="0 0 100 100" style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id={id} x1={x1} y1={y1} x2={x2} y2={y2} gradientUnits="userSpaceOnUse">
          {colori.map((c, i) => (
            <Stop key={i} offset={i / (colori.length - 1)} stopColor={c} />
          ))}
        </LinearGradient>
      </Defs>
      <Circle cx={C} cy={C} r={Rm} fill="none" stroke={`url(#${id})`} strokeWidth={T * 0.42} opacity={0.4} />
    </Svg>
  );
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {strato(uid + 'a', ['#FFB8D0', '#B8F0E0', '#C8B8FF', '#FFE8B8'], 10, 10, 90, 90)}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: 0, animationName: DISSOLVE, animationDuration: 6000, animationIterationCount: 'infinite', animationDirection: 'alternate', animationTimingFunction: INOUT }]}>
        {strato(uid + 'b', ['#C8B8FF', '#FFE8B8', '#B8F0E0', '#FFB8D0'], 90, 10, 10, 90)}
      </Animated.View>
    </View>
  );
}

/** I granelli di madreperla (mitico): salgono piano e svaniscono, ognuno col suo tempo (seeded, niente Math.random). */
const salite = new Map<number, ReturnType<typeof css.keyframes>>();
function salita(px: number) {
  const k = Math.round(px);
  if (!salite.has(k))
    salite.set(
      k,
      css.keyframes({
        '0%': { opacity: 0, transform: [{ translateY: 0 }] },
        '30%': { opacity: 1, transform: [{ translateY: -k * 0.3 }] },
        '70%': { opacity: 1, transform: [{ translateY: -k * 0.7 }] },
        '100%': { opacity: 0, transform: [{ translateY: -k }] },
      }),
    );
  return salite.get(k)!;
}

/** Granelli di madreperla (mitico) o scintille d'oro a quattro punte (leggendario), sullo stesso movimento. */
function Granelli({ size, n, seme, tipo = 'granello' }: { size: number; n: number; seme: number; tipo?: 'granello' | 'scintilla' }) {
  const lista = useMemo(() => {
    const rnd = seeded(seme * 977 + 13);
    return Array.from({ length: n }, () => {
      // sull'anello o appena fuori, mai sopra il simbolo
      const a = rnd() * Math.PI * 2;
      const r = size * (0.4 + rnd() * 0.1);
      return { x: size / 2 + Math.cos(a) * r, y: size / 2 + Math.sin(a) * r, s: Math.max(2, size * (0.012 + rnd() * 0.014)), ritardo: Math.round(rnd() * 6000), durata: 5000 + Math.round(rnd() * 2500), luce: 0.55 + rnd() * 0.45 };
    });
  }, [n, seme, size]);
  const anim = salita(size * 0.08);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {lista.map((p, i) => (
        <View key={i} style={{ position: 'absolute', left: p.x - p.s / 2, top: p.y - p.s / 2, opacity: p.luce }}>
          <Animated.View
            style={[
              tipo === 'granello' ? [styles.granello, { width: p.s, height: p.s, borderRadius: p.s / 2 }] : { width: p.s * 2.2, height: p.s * 2.2 },
              { opacity: 0, animationName: anim, animationDuration: p.durata, animationDelay: p.ritardo, animationIterationCount: 'infinite', animationTimingFunction: 'linear' },
            ]}
          >
            {tipo === 'scintilla' ? (
              <Svg width={p.s * 2.2} height={p.s * 2.2} viewBox="0 0 10 10">
                <Path d={stella4(5, 5, 5, 0.18)} fill="#FFF3C8" />
              </Svg>
            ) : null}
          </Animated.View>
        </View>
      ))}
    </View>
  );
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

/** Il disegno fermo: fondo, simbolo, cornice. Si ricalcola solo se cambiano avatar, cornice o misura. */
const Disegno = memo(function Disegno({ avatar, frame, size, conGlifo, seme }: { avatar?: string; frame?: string; size: number; conGlifo: boolean; seme: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const id = (s: string) => `${s}${uid}`;
  const st = stileCornice(frame);
  const a = avatarById(avatar);
  const f = fondoAvatar(a.id);
  const det: 0 | 1 | 2 = size >= 96 ? 2 : size >= 56 ? 1 : 0;
  const Rf = st.foro * 100;
  const T = st.spessore * 100;
  const ctx: Ctx = { st, Rf, T, Rm: Rf + T / 2, Ro: Rf + T, det, lw: 50 / size, id, m: st.metallo };
  const R = rarita(st.rarita);
  const glifo = GLYPH[a.glyph];
  const metallico = f.tipo !== 'carta' && f.tipo !== 'cielo';
  const [m0, m1, m2, m3] = st.metallo;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" style={StyleSheet.absoluteFill}>
      <Defs>
        {/* il metallo a 160°, nello spazio della tela: ogni pezzo prende luce secondo dove sta */}
        <LinearGradient id={id('met')} x1="18" y1="2" x2="82" y2="98" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={m0} />
          <Stop offset="0.38" stopColor={m1} />
          <Stop offset="0.72" stopColor={m2} />
          <Stop offset="1" stopColor={m3} />
        </LinearGradient>
        <RadialGradient id={id('toro')} cx="50" cy="50" r={ctx.Ro} fx="50" fy="50" gradientUnits="userSpaceOnUse">
          <Stop offset={Rf / ctx.Ro} stopColor="#000000" stopOpacity={0.5} />
          <Stop offset={(Rf + T * 0.3) / ctx.Ro} stopColor="#000000" stopOpacity={0} />
          <Stop offset={(Rf + T * 0.7) / ctx.Ro} stopColor="#000000" stopOpacity={0} />
          <Stop offset="1" stopColor="#000000" stopOpacity={0.5} />
        </RadialGradient>
        <RadialGradient id={id('piastra')} cx="50" cy="50" r={ctx.Ro} fx="50" fy="50" gradientUnits="userSpaceOnUse">
          <Stop offset={Rf / ctx.Ro} stopColor="#000000" stopOpacity={0.35} />
          <Stop offset={(Rf + T * 0.16) / ctx.Ro} stopColor="#000000" stopOpacity={0} />
          <Stop offset={(Rf + T * 0.84) / ctx.Ro} stopColor="#FFFFFF" stopOpacity={0.06} />
          <Stop offset="1" stopColor="#000000" stopOpacity={0.3} />
        </RadialGradient>
        <LinearGradient id={id('filo')} x1="25" y1="5" x2="75" y2="95" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.75} />
          <Stop offset="0.45" stopColor="#FFFFFF" stopOpacity={0.1} />
          <Stop offset="0.55" stopColor="#000000" stopOpacity={0.1} />
          <Stop offset="1" stopColor="#000000" stopOpacity={0.55} />
        </LinearGradient>
        <LinearGradient id={id('filoInv')} x1="25" y1="5" x2="75" y2="95" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#000000" stopOpacity={0.5} />
          <Stop offset="0.45" stopColor="#000000" stopOpacity={0.08} />
          <Stop offset="0.55" stopColor="#FFFFFF" stopOpacity={0.08} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0.6} />
        </LinearGradient>
        <LinearGradient id={id('smalto')} x1="20" y1="0" x2="80" y2="100" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.18} />
          <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={0} />
          <Stop offset="1" stopColor="#000000" stopOpacity={0.3} />
        </LinearGradient>
        <RadialGradient id={id('vetro')} cx="50" cy="50" r={ctx.Rm + T * 0.3} gradientUnits="userSpaceOnUse">
          <Stop offset={(ctx.Rm - T * 0.3) / (ctx.Rm + T * 0.3)} stopColor="#FFFFFF" stopOpacity={0.3} />
          <Stop offset={ctx.Rm / (ctx.Rm + T * 0.3)} stopColor="#FFFFFF" stopOpacity={0} />
          <Stop offset="1" stopColor="#000000" stopOpacity={0.22} />
        </RadialGradient>
        <LinearGradient id={id('vetroPieno')} x1="0" y1="0" x2="0.6" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.35} />
          <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={0} />
          <Stop offset="1" stopColor="#000000" stopOpacity={0.25} />
        </LinearGradient>
        <LinearGradient id={id('madre')} x1="10" y1="10" x2="90" y2="90" gradientUnits="userSpaceOnUse">
          {['#FBF3F6', '#E2F2EE', '#EEE6FA', '#FBEEDF', '#E8EEF8', '#F8E4EC'].map((c, i) => (
            <Stop key={i} offset={i / 5} stopColor={c} />
          ))}
        </LinearGradient>
        <RadialGradient id={id('perla')} cx="38%" cy="34%" r="70%">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="0.55" stopColor="#ECE6EE" />
          <Stop offset="1" stopColor="#9C90A2" />
        </RadialGradient>
        <RadialGradient id={id('cab')} cx="40%" cy="36%" r="70%">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#000000" />
        </RadialGradient>
        <RadialGradient id={id('cupola')} cx="40%" cy="36%" r="66%">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.35} />
          <Stop offset="0.6" stopColor="#FFFFFF" stopOpacity={0} />
          <Stop offset="1" stopColor="#000000" stopOpacity={0.4} />
        </RadialGradient>
        <RadialGradient id={id('fiamma')} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#FFD9A0" stopOpacity={0.6} />
          <Stop offset="1" stopColor="#FFD9A0" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id={id('alone')} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#DCE8F6" stopOpacity={0.35} />
          <Stop offset="1" stopColor="#DCE8F6" stopOpacity={0} />
        </RadialGradient>
        <LinearGradient id={id('argentoLuna')} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="0.5" stopColor="#D6DCE6" />
          <Stop offset="1" stopColor="#8A93A2" />
        </LinearGradient>
        {R.alone ? (
          <RadialGradient id={id('aloneR')} cx="50" cy="50" r="50" gradientUnits="userSpaceOnUse">
            <Stop offset={ctx.Rf / 50} stopColor={R.colore} stopOpacity={0} />
            <Stop offset={ctx.Ro / 50} stopColor={R.colore} stopOpacity={Math.min(0.25, R.alone)} />
            <Stop offset="1" stopColor={R.colore} stopOpacity={0} />
          </RadialGradient>
        ) : null}
        {/* il fondo dell'avatar */}
        {f.tipo === 'velluto' ? (
          <RadialGradient id={id('fondo')} cx="50%" cy="46%" r="54%">
            <Stop offset="0" stopColor={mescola(f.fondo[0], f.fondo[1], 0.35)} />
            <Stop offset="0.78" stopColor={f.fondo[1]} />
            <Stop offset="1" stopColor={mescola(f.fondo[0], '#FFFFFF', 0.06)} />
          </RadialGradient>
        ) : f.tipo === 'cielo' ? (
          <LinearGradient id={id('fondo')} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={f.fondo[1]} />
            <Stop offset="0.62" stopColor={f.fondo[0]} />
            <Stop offset="1" stopColor={mescola(f.fondo[0], '#FFE6B0', 0.4)} />
          </LinearGradient>
        ) : (
          <RadialGradient id={id('fondo')} cx="38%" cy="32%" r="78%">
            <Stop offset="0" stopColor={f.tipo === 'carta' ? f.fondo[0] : mescola(f.fondo[0], '#FFFFFF', 0.1)} />
            <Stop offset="0.6" stopColor={f.tipo === 'carta' ? mescola(f.fondo[0], f.fondo[1], 0.4) : f.fondo[0]} />
            <Stop offset="1" stopColor={f.fondo[1]} />
          </RadialGradient>
        )}
        {f.tipo === 'velluto' ? (
          <LinearGradient id={id('pelo')} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFC8D2" stopOpacity={0.14} />
            <Stop offset="0.25" stopColor="#FFC8D2" stopOpacity={0} />
          </LinearGradient>
        ) : null}
        <LinearGradient id={id('segno')} x1="0.2" y1="0" x2="0.8" y2="1">
          <Stop offset="0" stopColor={mescola(f.segno, '#FFFFFF', 0.45)} />
          <Stop offset="0.5" stopColor={f.segno} />
          <Stop offset="1" stopColor={mescola(f.segno, '#000000', 0.32)} />
        </LinearGradient>
        {/* l'anello fa ombra nel foro: dalla luce in alto a sinistra, più scura in alto a sinistra */}
        <RadialGradient id={id('incavo')} cx={C + 2.5} cy={C + 3.5} r={Rf + 3.5} fx={C + 2.5} fy={C + 3.5} gradientUnits="userSpaceOnUse">
          <Stop offset="0.78" stopColor="#000000" stopOpacity={0} />
          <Stop offset="1" stopColor="#000000" stopOpacity={0.5} />
        </RadialGradient>
      </Defs>

      {/* ombre: contatto (corta) e portata (lunga, spostata a destra di un terzo) */}
      {det > 0 ? <Circle cx={C + 1.6} cy={C + 3.4} r={ctx.Ro + 0.8} fill="#080304" opacity={0.22} /> : null}
      <Circle cx={C + 0.5} cy={C + 1.2} r={ctx.Ro + 0.2} fill="#080304" opacity={det > 0 ? 0.42 : 0.3} />
      {R.alone && det > 0 ? <Circle cx={C} cy={C} r={50} fill={`url(#${id('aloneR')})`} /> : null}

      {/* fondo e simbolo */}
      <FondoSvg f={f} Rf={Rf} id={id} det={det} seme={seme} />
      {conGlifo && glifo ? (
        <G transform={`translate(${n2(C - Rf)} ${n2(C - Rf)}) scale(${n2((2 * Rf) / 100)})`}>{glifo(metallico ? `url(#${id('segno')})` : f.segno, f.tipo === 'carta' ? '#F7EDDB' : mescola(f.fondo[1], '#000000', 0.2))}</G>
      ) : null}
      <Circle cx={C} cy={C} r={Rf + 0.4} fill={`url(#${id('incavo')})`} />

      {/* la cornice, dal fondo al davanti */}
      <Pendente ctx={ctx} fase="dietro" />
      <GiroOrnamento ctx={ctx} fase="dietro" />
      <Corpo ctx={ctx} />
      <Bordo ctx={ctx} />
      <Fascia ctx={ctx} />
      <GiroOrnamento ctx={ctx} fase="davanti" />
      <GemmeAnello ctx={ctx} />
      <Pendente ctx={ctx} fase="davanti" />
      <Cimiero ctx={ctx} />
    </Svg>
  );
});

/** I punti dove brillano le gemme (tela 100): gemme dell'anello, castoni, gemme della corona. */
function puntiBagliore(st: StileCornice): [number, number, number][] {
  const Rm = (st.foro + st.spessore / 2) * 100;
  const out: [number, number, number][] = angoliGemme(st).map(a => {
    const [x, y] = punto(Rm, a);
    return [x - st.gemme!.misura * 0.25, y - st.gemme!.misura * 0.3, st.gemme!.misura * 1.15];
  });
  if (st.giro?.tipo === 'castoni') {
    const sfasa = st.gemme ? 180 / st.giro.n : 0;
    for (let i = 0; i < st.giro.n; i += 2) {
      const [x, y] = punto(Rm, (i * 360) / st.giro.n - 90 + sfasa);
      out.push([x - 0.6, y - 0.6, st.spessore * 100 * 0.4]);
    }
  }
  if (st.cimiero === 'corona') out.push([C - 0.5, 9.2, 3]);
  return out;
}

export interface AvatarCorniceProps extends PlayerAvatarProps {
  /** Le animazioni della rarità (solo dall'epico e da 64 punti in su). Default false. */
  vivo?: boolean;
  /** Seme delle particelle e delle stelle del fondo. */
  seme?: number;
}

/** L'avatar dentro la sua cornice, con le animazioni della rarità se `vivo`. La misura comprende la cornice. */
export const AvatarCornice = memo(function AvatarCornice({ avatar, photo, name, frame, size, badge, vivo, seme = 5 }: AvatarCorniceProps) {
  const a = avatarById(avatar);
  const st = stileCornice(frame);
  const R = rarita(st.rarita);
  const usePhoto = (a.glyph === 'foto' && !!photo) || (a.glyph === 'iniziale' && !!photo && avatar === undefined);
  const glyph = GLYPH[a.glyph];
  const inner = st.foro * size * 2;
  const f = fondoAvatar(a.id);
  const anima = !!vivo && size >= 64 && puoAnimare(st.rarita, size);
  // useAmbient: niente animazioni con riduci movimento, schermata non a fuoco o app in background.
  const vetrina = useAmbient(anima);
  const Rf = st.foro * 100;
  // Le gemme brillano solo nel leggendario (2 movimenti): il mitico ha riflesso, madreperla e granelli (§5.7).
  const punti = useMemo(() => (R.movimenti === 2 ? puntiBagliore(st) : []), [R.movimenti, st]);
  return (
    <View style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Disegno avatar={avatar} frame={frame} size={size} conGlifo={!usePhoto} seme={seme} />
      {usePhoto ? (
        <Image
          source={{ uri: photo! }}
          style={{ position: 'absolute', left: size / 2 - st.foro * size, top: size / 2 - st.foro * size, width: inner, height: inner, borderRadius: st.foro * size }}
          contentFit="cover"
          transition={null}
        />
      ) : null}
      {!usePhoto && !glyph ? (
        <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
          <Text style={{ fontFamily: fontArte.bodoni, fontSize: inner * 0.5, lineHeight: inner * 0.62, color: f.segno, marginTop: -inner * 0.02 }} allowFontScaling={false}>
            {(name || 'T').slice(0, 1).toUpperCase()}
          </Text>
        </View>
      ) : null}
      {vetrina ? (
        <>
          {st.fascia?.tipo === 'madreperla' || st.fascia?.tipo === 'madreperlaNera' ? <Iridescenza size={size} Rm={Rf + (st.spessore * 100) / 2} T={st.spessore * 100} /> : null}
          <RiflessoAnello size={size} Rm={Rf + (st.spessore * 100) / 2} T={st.spessore * 100} pausa={R.pausaRiflesso ?? mov.pausaRiflesso.epico} intensita={Math.min(0.95, R.riflesso.opacita + 0.3)} />
          {punti.length ? <Bagliore size={size} punti={punti} /> : null}
          {R.particelle ? <Granelli size={size} n={R.particelle} seme={seme} tipo={st.rarita === 'mitico' ? 'granello' : 'scintilla'} /> : null}
        </>
      ) : null}
      {badge ? <Medaglia badge={badge} size={size} /> : null}
    </View>
  );
});

/** Il livello (o il grado di Prestigio) su una medaglia d'ottone, in basso a destra. */
function Medaglia({ badge, size }: { badge: string; size: number }) {
  const prestigio = badge.startsWith('P');
  const h = Math.max(20, size * 0.3);
  return (
    <View style={[styles.badge, { minWidth: h, height: h, borderRadius: h / 2, borderColor: prestigio ? '#3A0810' : '#4A3410' }]}>
      <LG
        colors={prestigio ? ['#C8424C', '#8E1A26', '#5A0E18'] : ['#FFF0C0', '#D9B060', '#8A6526']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: h / 2 }]}
      />
      <Text
        allowFontScaling={false}
        style={[
          styles.badgeText,
          { fontSize: Math.max(10, size * 0.14), lineHeight: Math.max(13, size * 0.18), color: prestigio ? '#F6E3B0' : '#2A1810' },
          prestigio ? styles.incisoScuro : styles.inciso,
        ]}
      >
        {badge}
      </Text>
    </View>
  );
}

/** L'avatar dentro la sua cornice. La misura comprende la cornice. Sempre fermo. */
export const PlayerAvatar = memo(function PlayerAvatar(p: PlayerAvatarProps) {
  return <AvatarCornice {...p} />;
});

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  granello: { position: 'absolute', left: 0, top: 0, backgroundColor: '#F8F2FA' },
  badge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    paddingHorizontal: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    boxShadow: '0px 1px 2px rgba(8,3,4,0.5)',
  },
  badgeText: { fontFamily: fontArte.soraExtra, fontVariant: ['tabular-nums'] },
  inciso: { textShadowColor: 'rgba(255,240,200,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 0 },
  incisoScuro: { textShadowColor: 'rgba(8,3,4,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 0 },
});
