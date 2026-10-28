// Strumenti di geometria per il tavolo: una penna che ruota e specchia quello che disegna, il giro di
// un rettangolo arrotondato percorso a velocità costante, curve morbide e stelle con seme fisso.
// Tutto puro: le stesse misure danno sempre lo stesso disegno (niente Math.random).

export { seeded } from '@/engine/rng';

/** Due decimali bastano: path più corti, stesso disegno. */
export const f = (n: number) => Math.round(n * 100) / 100;

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export const rad = (deg: number) => (deg * Math.PI) / 180;

export const polar = (r: number, deg: number): [number, number] => [r * Math.cos(rad(deg)), r * Math.sin(rad(deg))];

export type P = [number, number];

/**
 * Un costruttore di path con una trasformazione affine: sposta, ruota (gradi), specchia (sx, sy = ±1)
 * o schiaccia quello che disegna. `swap()` dà una penna che scambia x e y (lo specchio sulla diagonale).
 */
export class Pen {
  d = '';
  /** p(x, y) = (a·x + c·y + e, b·x + d·y + f). */
  m: [number, number, number, number, number, number];
  constructor(ox = 0, oy = 0, angle = 0, sx = 1, sy = 1) {
    const c = Math.cos(rad(angle));
    const s = Math.sin(rad(angle));
    this.m = [c * sx, s * sx, -s * sy, c * sy, ox, oy];
  }
  static affine(m: [number, number, number, number, number, number]) {
    const p = new Pen();
    p.m = m;
    return p;
  }
  /** La stessa penna con x e y scambiati. */
  swap() {
    const [a, b, c, d, e, f] = this.m;
    return Pen.affine([c, d, a, b, e, f]);
  }
  p(x: number, y: number): P {
    const [a, b, c, d, e, f] = this.m;
    return [a * x + c * y + e, b * x + d * y + f];
  }
  private t(x: number, y: number) {
    const [a, b] = this.p(x, y);
    return `${f(a)} ${f(b)}`;
  }
  /** Un arco di cerchio (gradi, a0 → a1) con curve cubiche: segue la trasformazione della penna. */
  arc(cx: number, cy: number, r: number, a0: number, a1: number, move = true) {
    const n = Math.max(1, Math.ceil(Math.abs(a1 - a0) / 90));
    const da = (a1 - a0) / n;
    const k = (4 / 3) * Math.tan(rad(da) / 4);
    const at = (a: number): P => [cx + r * Math.cos(rad(a)), cy + r * Math.sin(rad(a))];
    if (move) this.M(...at(a0));
    else this.L(...at(a0));
    for (let i = 0; i < n; i++) {
      const s = a0 + i * da;
      const e = s + da;
      const [x0, y0] = at(s);
      const [x3, y3] = at(e);
      const t0: P = [-Math.sin(rad(s)), Math.cos(rad(s))];
      const t1: P = [-Math.sin(rad(e)), Math.cos(rad(e))];
      this.C(x0 + t0[0] * r * k, y0 + t0[1] * r * k, x3 - t1[0] * r * k, y3 - t1[1] * r * k, x3, y3);
    }
    return this;
  }
  M(x: number, y: number) {
    this.d += `M${this.t(x, y)}`;
    return this;
  }
  L(x: number, y: number) {
    this.d += `L${this.t(x, y)}`;
    return this;
  }
  Q(x1: number, y1: number, x: number, y: number) {
    this.d += `Q${this.t(x1, y1)} ${this.t(x, y)}`;
    return this;
  }
  C(x1: number, y1: number, x2: number, y2: number, x: number, y: number) {
    this.d += `C${this.t(x1, y1)} ${this.t(x2, y2)} ${this.t(x, y)}`;
    return this;
  }
  Z() {
    this.d += 'Z';
    return this;
  }
  /** Una spezzata (aperta o chiusa). */
  poly(pts: P[], close = false) {
    pts.forEach(([x, y], i) => (i ? this.L(x, y) : this.M(x, y)));
    return close ? this.Z() : this;
  }
  /** Un'ellisse con quattro curve: ruota e si specchia con la penna. */
  ellipse(cx: number, cy: number, rx: number, ry: number, a = 0) {
    const k = 0.5523;
    const c = Math.cos(rad(a));
    const s = Math.sin(rad(a));
    const q = (x: number, y: number): P => [cx + x * c - y * s, cy + x * s + y * c];
    const pts: P[] = [
      q(rx, 0),
      q(rx, ry * k),
      q(rx * k, ry),
      q(0, ry),
      q(-rx * k, ry),
      q(-rx, ry * k),
      q(-rx, 0),
      q(-rx, -ry * k),
      q(-rx * k, -ry),
      q(0, -ry),
      q(rx * k, -ry),
      q(rx, -ry * k),
    ];
    this.M(...pts[0]);
    for (let i = 1; i < 12; i += 3) this.C(...pts[i], ...pts[i + 1], ...pts[(i + 2) % 12]);
    return this.Z();
  }
  circle(x: number, y: number, r: number) {
    return this.ellipse(x, y, r, r);
  }
  /** Un petalo a punta (una lente) da (x0,y0) a (x1,y1), largo `w` nel mezzo. */
  petal(x0: number, y0: number, x1: number, y1: number, w: number) {
    const mx = (x0 + x1) / 2;
    const my = (y0 + y1) / 2;
    const len = Math.hypot(x1 - x0, y1 - y0) || 1;
    const nx = (-(y1 - y0) / len) * w;
    const ny = ((x1 - x0) / len) * w;
    return this.M(x0, y0)
      .Q(mx + nx, my + ny, x1, y1)
      .Q(mx - nx, my - ny, x0, y0)
      .Z();
  }
  /** Una foglia: più piena verso la base, a punta in cima (da (x0,y0) a (x1,y1)). */
  leaf(x0: number, y0: number, x1: number, y1: number, w: number) {
    const len = Math.hypot(x1 - x0, y1 - y0) || 1;
    const ux = (x1 - x0) / len;
    const uy = (y1 - y0) / len;
    const nx = -uy * w;
    const ny = ux * w;
    const a = (t: number) => [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t];
    const [ax, ay] = a(0.3);
    const [bx, by] = a(0.75);
    return this.M(x0, y0)
      .C(ax + nx, ay + ny, bx + nx * 0.7, by + ny * 0.7, x1, y1)
      .C(bx - nx * 0.7, by - ny * 0.7, ax - nx, ay - ny, x0, y0)
      .Z();
  }
  diamond(x: number, y: number, rx: number, ry = rx) {
    return this.M(x, y - ry)
      .L(x + rx, y)
      .L(x, y + ry)
      .L(x - rx, y)
      .Z();
  }
  /** Una stella a `n` punte. */
  star(x: number, y: number, R: number, r: number, n = 5, a0 = -90) {
    const pts: P[] = [];
    for (let i = 0; i < n * 2; i++) {
      const [px, py] = polar(i % 2 ? r : R, a0 + (i * 180) / n);
      pts.push([x + px, y + py]);
    }
    return this.poly(pts, true);
  }
  /** Una curva morbida che passa per tutti i punti (Catmull-Rom). */
  smooth(pts: P[], close = false) {
    if (pts.length < 2) return this;
    const n = pts.length;
    const at = (i: number) => (close ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
    this.M(...pts[0]);
    const last = close ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const p0 = at(i - 1);
      const p1 = at(i);
      const p2 = at(i + 1);
      const p3 = at(i + 2);
      this.C(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
    }
    return close ? this.Z() : this;
  }
  rrect(x: number, y: number, w: number, h: number, r: number) {
    const rr = Math.max(0, Math.min(r, w / 2, h / 2));
    this.M(x + rr, y)
      .L(x + w - rr, y)
      .Q(x + w, y, x + w, y + rr)
      .L(x + w, y + h - rr)
      .Q(x + w, y + h, x + w - rr, y + h);
    return this.L(x + rr, y + h)
      .Q(x, y + h, x, y + h - rr)
      .L(x, y + rr)
      .Q(x, y, x + rr, y)
      .Z();
  }
}

/** Un rettangolo arrotondato con angoli davvero circolari (combacia con <Rect rx>). */
export function roundRect(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  const a = (ex: number, ey: number) => `A${f(rr)} ${f(rr)} 0 0 1 ${f(ex)} ${f(ey)}`;
  return (
    `M${f(x + rr)} ${f(y)}H${f(x + w - rr)}${a(x + w, y + rr)}V${f(y + h - rr)}${a(x + w - rr, y + h)}` +
    `H${f(x + rr)}${a(x, y + h - rr)}V${f(y + rr)}${a(x + rr, y)}Z`
  );
}

/**
 * Il giro di un rettangolo arrotondato percorso in senso orario a velocità costante, partendo
 * dall'inizio del lato alto: `pt(s, n)` è il punto a distanza `s` lungo il giro, spostato di `n`
 * verso l'interno. Serve a far correre un motivo lungo il bordo, angoli compresi.
 */
export class Loop {
  len: number;
  private seg: number[];
  constructor(
    private x: number,
    private y: number,
    private w: number,
    private h: number,
    private r: number,
  ) {
    const a = (Math.PI * r) / 2;
    this.seg = [w - 2 * r, a, h - 2 * r, a, w - 2 * r, a, h - 2 * r, a];
    this.len = this.seg.reduce((s, v) => s + v, 0);
  }
  /** Punto e direzione (tangente, unitaria) a distanza s. */
  at(s0: number): [number, number, number, number] {
    const { x, y, w, h, r } = this;
    let s = ((s0 % this.len) + this.len) % this.len;
    let i = 0;
    while (i < 7 && s > this.seg[i]) s -= this.seg[i++];
    const arc = (cx: number, cy: number, a0: number): [number, number, number, number] => {
      const a = a0 + s / (r || 1);
      return [cx + r * Math.cos(a), cy + r * Math.sin(a), -Math.sin(a), Math.cos(a)];
    };
    switch (i) {
      case 0:
        return [x + r + s, y, 1, 0];
      case 1:
        return arc(x + w - r, y + r, -Math.PI / 2);
      case 2:
        return [x + w, y + r + s, 0, 1];
      case 3:
        return arc(x + w - r, y + h - r, 0);
      case 4:
        return [x + w - r - s, y + h, -1, 0];
      case 5:
        return arc(x + r, y + h - r, Math.PI / 2);
      case 6:
        return [x, y + h - r - s, 0, -1];
      default:
        return arc(x + r, y + r, Math.PI);
    }
  }
  /** Il punto a distanza s, spostato di n verso l'interno. */
  pt(s: number, n = 0): P {
    const [px, py, tx, ty] = this.at(s);
    return [px - ty * n, py + tx * n];
  }
  /** L'angolo (gradi) della direzione a distanza s. */
  angle(s: number) {
    const [, , tx, ty] = this.at(s);
    return (Math.atan2(ty, tx) * 180) / Math.PI;
  }
}

/** Le quattro penne degli angoli: in ognuna x e y entrano nel panno dal suo angolo (specchiate). */
export function corners(w: number, h: number): Pen[] {
  return [new Pen(0, 0, 0, 1, 1), new Pen(w, 0, 0, -1, 1), new Pen(w, h, 0, -1, -1), new Pen(0, h, 0, 1, -1)];
}

/** Lo stesso motivo nei quattro angoli, specchiato: un solo path. */
export function four(w: number, h: number, draw: (p: Pen, i: number) => void) {
  return corners(w, h)
    .map((p, i) => {
      draw(p, i);
      return p.d;
    })
    .join('');
}

/** Bezier cubica in t. */
export function bez(p0: P, p1: P, p2: P, p3: P, t: number): P {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
}

/** Bezier quadratica in t. */
export function quad(p0: P, p1: P, p2: P, t: number): P {
  const u = 1 - t;
  return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]];
}
