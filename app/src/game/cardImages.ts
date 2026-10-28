// Generated list of the card scans: require() needs static paths.
import { BACK_IMAGES } from './backImages';

export const FRONTS: number[] = [
  require('../../assets/cards/0.jpg'),
  require('../../assets/cards/1.jpg'),
  require('../../assets/cards/2.jpg'),
  require('../../assets/cards/3.jpg'),
  require('../../assets/cards/4.jpg'),
  require('../../assets/cards/5.jpg'),
  require('../../assets/cards/6.jpg'),
  require('../../assets/cards/7.jpg'),
  require('../../assets/cards/8.jpg'),
  require('../../assets/cards/9.jpg'),
  require('../../assets/cards/10.jpg'),
  require('../../assets/cards/11.jpg'),
  require('../../assets/cards/12.jpg'),
  require('../../assets/cards/13.jpg'),
  require('../../assets/cards/14.jpg'),
  require('../../assets/cards/15.jpg'),
  require('../../assets/cards/16.jpg'),
  require('../../assets/cards/17.jpg'),
  require('../../assets/cards/18.jpg'),
  require('../../assets/cards/19.jpg'),
  require('../../assets/cards/20.jpg'),
  require('../../assets/cards/21.jpg'),
  require('../../assets/cards/22.jpg'),
  require('../../assets/cards/23.jpg'),
  require('../../assets/cards/24.jpg'),
  require('../../assets/cards/25.jpg'),
  require('../../assets/cards/26.jpg'),
  require('../../assets/cards/27.jpg'),
  require('../../assets/cards/28.jpg'),
  require('../../assets/cards/29.jpg'),
  require('../../assets/cards/30.jpg'),
  require('../../assets/cards/31.jpg'),
  require('../../assets/cards/32.jpg'),
  require('../../assets/cards/33.jpg'),
  require('../../assets/cards/34.jpg'),
  require('../../assets/cards/35.jpg'),
  require('../../assets/cards/36.jpg'),
  require('../../assets/cards/37.jpg'),
  require('../../assets/cards/38.jpg'),
  require('../../assets/cards/39.jpg'),
];
export const BACK: number = require('../../assets/cards/back.png');

/**
 * I dorsi pronti del catalogo (src/meta/catalog.ts), disegnati da scripts/make-art.mjs: id → immagine.
 * L'elenco dei require sta in backImages.ts, generato dallo stesso script.
 */
export const BACKS: Record<string, number> = { classico: BACK, ...BACK_IMAGES };

/** The image of a back; the classic one when the id is unknown. */
export const backImage = (id: string | undefined): number => (id && BACKS[id]) || BACK;

/** Il dorso ha la sua immagine (i dorsi «in arrivo» no). */
export const hasBackImage = (id: string | undefined): boolean => !!id && Object.prototype.hasOwnProperty.call(BACKS, id);
