// La trasformazione proiettiva che posa un rettangolo piatto (il tavolino equipaggiato, FeltArt) sul trapezio del
// piano del tavolo visto dalla camera. È una omografia 2D scritta come matrix3d: identica su web (CSS) e nativo
// (RN la passa a CATransform3D e a MatrixMathHelper). Funzioni pure.
import type { Pt } from './camera';

/** La matrice 3×3 che porta il quadrato unitario (0,0) (1,0) (1,1) (0,1) sui quattro punti dati (Heckbert). */
function quadratoSuQuad(q: [Pt, Pt, Pt, Pt]): number[] {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
  const dx1 = x1 - x2;
  const dx2 = x3 - x2;
  const dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2;
  const dy2 = y3 - y2;
  const dy3 = y0 - y1 + y2 - y3;
  let g = 0;
  let h = 0;
  if (Math.abs(dx3) > 1e-9 || Math.abs(dy3) > 1e-9) {
    const den = dx1 * dy2 - dx2 * dy1;
    g = (dx3 * dy2 - dx2 * dy3) / den;
    h = (dx1 * dy3 - dx3 * dy1) / den;
  }
  return [x1 - x0 + g * x1, x3 - x0 + h * x3, x0, y1 - y0 + g * y1, y3 - y0 + h * y3, y0, g, h, 1];
}

const mul = (A: number[], B: number[]) => {
  const C = new Array(9).fill(0);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) C[i * 3 + j] += A[i * 3 + k] * B[k * 3 + j];
  return C;
};

/**
 * Il `transform: [{ matrix }]` per una vista larga `w` × alta `h`, posta in (0, 0) del suo contenitore, che la porta
 * sui punti `alto-sinistra, alto-destra, basso-destra, basso-sinistra` (coordinate del contenitore). Tiene conto
 * dell'origine delle trasformazioni al centro della vista (il default di RN e del web).
 */
export function matricePosa(w: number, h: number, q: [Pt, Pt, Pt, Pt]): number[] {
  const H = mul(quadratoSuQuad(q), [1 / w, 0, 0, 0, 1 / h, 0, 0, 0, 1]);
  const cx = w / 2;
  const cy = h / 2;
  const M = mul(mul([1, 0, -cx, 0, 1, -cy, 0, 0, 1], H), [1, 0, cx, 0, 1, cy, 0, 0, 1]);
  const n = M[8];
  const [a, b, c, d, e, f, g, hh] = M.map(v => v / n);
  // matrix3d per colonne: (a d 0 g) (b e 0 h) (0 0 1 0) (c f 0 1)
  return [a, d, 0, g, b, e, 0, hh, 0, 0, 1, 0, c, f, 0, 1];
}
