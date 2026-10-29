// Generato da scripts/make-materiali.mjs: non modificare a mano.
//
// Le trame neutre dei materiali (luce bianca e ombra nera con alfa), ripetibili senza cuciture.
// - src: il require dell'immagine WebP (assets/arte/trame).
// - px: lato della tessera in pixel. Si posa a px / DENSITA_TRAME punti (2 pixel per punto).
// - opacita: l'opacità consigliata sul suo materiale.
// - kb: peso del file (budget: ≤ 60 KB ciascuna, ≤ 400 KB in tutto; oggi 269 KB).
export type NomeTrama = 'legno' | 'spazzolato' | 'carta' | 'velluto' | 'cuoio' | 'marmo' | 'sughero' | 'crepe' | 'panno';

export interface InfoTrama {
  src: number;
  px: number;
  opacita: number;
  kb: number;
}

export const DENSITA_TRAME = 2;

export const TRAME: Record<NomeTrama, InfoTrama> = {
  // noce lucidato
  legno: { src: require('../../../assets/arte/trame/legno.webp'), px: 512, opacita: 0.6, kb: 57.6 },
  // ottone, oro, peltro, argento
  spazzolato: { src: require('../../../assets/arte/trame/spazzolato.webp'), px: 256, opacita: 0.45, kb: 10.6 },
  // carta avorio, cartigli, biglietti
  carta: { src: require('../../../assets/arte/trame/carta.webp'), px: 256, opacita: 0.6, kb: 16.5 },
  // velluto (nicchie, teca, sipario)
  velluto: { src: require('../../../assets/arte/trame/velluto.webp'), px: 256, opacita: 0.5, kb: 26.1 },
  // cuoio (pannelli, targhette dei nomi)
  cuoio: { src: require('../../../assets/arte/trame/cuoio.webp'), px: 256, opacita: 0.7, kb: 44.2 },
  // marmo (piedistalli, scene del Capitolo III)
  marmo: { src: require('../../../assets/arte/trame/marmo.webp'), px: 512, opacita: 0.85, kb: 41.2 },
  // sughero (bacheca delle missioni)
  sughero: { src: require('../../../assets/arte/trame/sughero.webp'), px: 256, opacita: 0.9, kb: 35.5 },
  // craquelure della maiolica e della foglia d’oro
  crepe: { src: require('../../../assets/arte/trame/crepe.webp'), px: 256, opacita: 0.22, kb: 7.3 },
  // panno in vetrina (anteprime)
  panno: { src: require('../../../assets/arte/trame/panno.webp'), px: 256, opacita: 0.4, kb: 29.7 },
};
