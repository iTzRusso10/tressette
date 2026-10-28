// Il catalogo di tutto ciò che si può possedere: tavolini (la sponda del tavolo), grafiche del panno
// (la superficie di gioco) e dorsi delle carte. Dati puri, condivisi con il server.
//
// Ogni oggetto ha una rarità, un valore in monete, se si compra nel negozio e uno stato: «pronto» si
// usa, «in arrivo» è in catalogo ma aspetta la sua illustrazione (non si compra e non si mette sul
// tavolo; chi lo vince lo possiede già e lo potrà usare appena è pronto). Da dove si ottiene un oggetto
// lo dicono le ricompense di arene, achievement, livelli e stagioni (vedi sources.ts).
//
// Grafica: tavolini e panni li disegna src/game/Felt.tsx, i dorsi scripts/make-art.mjs. Per gli oggetti
// in arrivo, `art` descrive l'illustrazione da creare (elenco completo in docs/asset-mancanti.md).

import type { Rarity } from './rarity.ts';

export type Slot = 'table' | 'felt' | 'back';

/** Le famiglie del catalogo, per il negozio e l'inventario. */
export type Category =
  | 'legni'
  | 'pietre'
  | 'pregiati'
  | 'leggendari'
  | 'classici'
  | 'italiani'
  | 'eleganti'
  | 'fantasy'
  | 'cosmo'
  | 'nobili'
  | 'mitici'
  | 'esclusivi'
  | 'napoli';

export const CATEGORY_NAMES: Record<Category, string> = {
  legni: 'Legni',
  pietre: 'Pietre e lacche',
  pregiati: 'Pregiati',
  leggendari: 'Leggendari',
  classici: 'Classici',
  italiani: 'Italiani',
  eleganti: 'Eleganti',
  fantasy: 'Fantasy',
  cosmo: 'Spazio e mitologia',
  nobili: 'Nobili',
  mitici: 'Mitici',
  esclusivi: 'Esclusivi',
  napoli: 'Collezione Napoli',
};

/** La sponda: materiale, colori (luce in alto a sinistra → ombra), finiture. */
export interface TableLook {
  rail: 'glass' | 'wood' | 'leather' | 'metal' | 'stone' | 'crystal' | 'lacquer' | 'cosmic';
  rim: [string, string, string];
  /** Disegno del materiale: venatura, radica, marmo, granito, scacchiera, stelle, iridescenza. */
  texture?: 'grain' | 'burl' | 'marble' | 'granite' | 'checker' | 'stars' | 'iridescent' | 'brushed';
  /** Un filetto di metallo appena dentro il panno. */
  trim?: string;
  corners?: boolean;
  studs?: boolean;
  /** La pietra negli angoli (altrimenti il colore del panno). */
  gem?: string;
  /** Un alone di luce lungo il bordo interno (solo i più rari). */
  glow?: string;
  /** Un fregio sugli angoli disegnato in codice. */
  emblem?: 'crown' | 'laurel' | 'clock' | 'diamond' | 'star';
}

/** La superficie di gioco: il colore del panno (centro → bordo) e il disegno. */
export interface ClothLook {
  cloth: [string, string, string];
  velvet: boolean;
  /** Il disegno sul panno (Felt.tsx, designOf); null = panno liscio. */
  design: string | null;
  /** Colori del disegno, quando non è solo impresso nel panno. */
  paint?: string[];
}

/** Il dorso: fondo, fondo scuro, ornamento, luce dell'ornamento; il motivo lo disegna make-art. */
export interface BackLook {
  colors: [string, string, string, string];
  motif: string;
}

/** Descrizione dell'illustrazione da creare per un oggetto in arrivo. */
export interface ArtBrief {
  theme: string;
  palette: string[];
  notes: string;
}

interface Base {
  id: string;
  name: string;
  desc: string;
  rarity: Rarity;
  category: Category;
  /** Valore in monete (prezzo nel negozio, quando si compra). */
  price: number;
  /** Si compra nel negozio. */
  shop: boolean;
  status: 'ready' | 'coming';
  art?: ArtBrief;
  /** Numero nel catalogo di riferimento (1…40 tavolini, 1…60 panni e dorsi); assente per gli extra. */
  n?: number;
}

export type TableItem = Base & { slot: 'table'; look: TableLook };
export type FeltItem = Base & { slot: 'felt'; look: ClothLook };
export type BackItem = Base & { slot: 'back'; look: BackLook };
export type Item = TableItem | FeltItem | BackItem;

type Opts = { shop?: boolean; coming?: ArtBrief; desc?: string };

/* ================================================================== tavolini */

let tn = 0;
const t = (id: string, name: string, rarity: Rarity, price: number, category: Category, look: TableLook, o: Opts = {}): TableItem => ({
  id,
  n: ++tn,
  name,
  desc: o.desc ?? '',
  rarity,
  category,
  price,
  shop: o.shop ?? true,
  status: o.coming ? 'coming' : 'ready',
  ...(o.coming ? { art: o.coming } : {}),
  slot: 'table',
  look,
});

const GOLD = '#F3D58C';
const SILVER = '#E6EAF2';

export const TABLES: TableItem[] = [
  t('legno-di-casa', 'Legno di Casa', 'comune', 300, 'legni', { rail: 'wood', rim: ['#E8C79A', '#C99A62', '#9C6B3A'], texture: 'grain' }, { desc: 'Il tavolo della cucina, quello delle prime partite.' }),
  t('pino-mediterraneo', 'Pino Mediterraneo', 'comune', 400, 'legni', { rail: 'wood', rim: ['#F2D6A2', '#D9B276', '#B08447'], texture: 'grain' }, { desc: 'Legno chiaro e profumato, con i nodi in vista.' }),
  t('rovere-antico', 'Rovere Antico', 'comune', 500, 'legni', { rail: 'wood', rim: ['#C9A57A', '#9C7A52', '#6E5234'], texture: 'grain' }, { desc: 'Rovere stagionato, opaco e caldo.' }),
  t('noce-italiano', 'Noce Italiano', 'comune', 600, 'legni', { rail: 'wood', rim: ['#8A5A3B', '#5E3A24', '#3B2416'], texture: 'grain' }, { desc: 'Noce scuro, come i portoni dei palazzi.' }),
  t('tavolo-della-taverna', 'Tavolo della Taverna', 'comune', 700, 'legni', { rail: 'leather', rim: ['#F4F1EA', '#D8D2C4', '#B5AC98'] }, { desc: 'Sponda imbottita in cuoio chiaro, cucita a mano.' }),
  t('mogano-classico', 'Mogano Classico', 'noncomune', 900, 'legni', { rail: 'wood', rim: ['#A4553A', '#73321F', '#4A1C10'], texture: 'grain' }, { desc: 'Mogano rosso bruno, lucidato a cera.' }),
  t('ciliegio-rosso', 'Ciliegio Rosso', 'noncomune', 1000, 'legni', { rail: 'wood', rim: ['#C76A4A', '#9A4630', '#6A2A1A'], texture: 'grain' }, { desc: 'Ciliegio dal riflesso rosso, venatura fine.' }),
  t('ulivo-calabrese', 'Ulivo Calabrese', 'noncomune', 1100, 'legni', { rail: 'wood', rim: ['#E3CFA0', '#B79C64', '#7E6533'], texture: 'burl' }, { desc: 'Legno d’ulivo con le sue venature mosse.' }),
  t('quercia-del-borgo', 'Quercia del Borgo', 'noncomune', 1200, 'legni', { rail: 'wood', rim: ['#B89568', '#8C6B44', '#5C4428'], texture: 'grain', studs: true }, { desc: 'Quercia massiccia con le borchie di ferro.' }),
  t('tavolo-del-circolo', 'Tavolo del Circolo', 'noncomune', 1300, 'legni', { rail: 'wood', rim: ['#5A4A3A', '#3C3026', '#251D17'], texture: 'grain', trim: '#C8A15A', studs: true }, { desc: 'Legno scuro, borchie e filetto d’ottone.' }),
  t('marmo-di-carrara', 'Marmo di Carrara', 'raro', 1600, 'pietre', { rail: 'stone', rim: ['#FFFFFF', '#E9E9EC', '#C9CBD2'], texture: 'marble' }, { desc: 'Marmo bianco venato di grigio.' }),
  t('granito-nero', 'Granito Nero', 'raro', 1800, 'pietre', { rail: 'stone', rim: ['#5C5C66', '#34343C', '#1A1A20'], texture: 'granite' }, { desc: 'Granito lucidato, nero punteggiato.' }),
  t('ebano-reale', 'Ebano Reale', 'raro', 2000, 'pietre', { rail: 'wood', rim: ['#4A3B36', '#251C19', '#0F0B0A'], texture: 'grain', trim: GOLD }, { desc: 'Ebano quasi nero con un filetto d’oro.' }),
  t('radica-di-lusso', 'Radica di Lusso', 'raro', 2200, 'pietre', { rail: 'wood', rim: ['#C08454', '#8A5530', '#5A3218'], texture: 'burl', trim: GOLD, corners: true }, { desc: 'Radica di noce come nei cruscotti d’epoca.' }),
  t('tavolo-veneziano', 'Tavolo Veneziano', 'raro', 2400, 'pietre', { rail: 'lacquer', rim: ['#C2283D', '#860F22', '#4E0612'], trim: GOLD, studs: true }, { desc: 'Lacca rossa e oro, come i saloni dei palazzi sul Canal Grande.' }),
  t('oro-antico', 'Oro Antico', 'epico', 3000, 'pregiati', { rail: 'metal', rim: ['#F3D58C', '#C8A15A', '#8A6526'], trim: GOLD, corners: true, studs: true }, { desc: 'Ottone brunito e oro vecchio.' }),
  t('notte-stellata', 'Notte Stellata', 'epico', 3200, 'pregiati', { rail: 'lacquer', rim: ['#2B3C7A', '#17224D', '#0A1029'], texture: 'stars', trim: '#C9D6FF' }, { desc: 'Lacca blu notte punteggiata di stelle.' }),
  t('palazzo-reale', 'Palazzo Reale', 'epico', 3400, 'pregiati', { rail: 'metal', rim: ['#FFE7A3', '#E0B04A', '#9C6E12'], trim: '#FFE7A3', studs: true, corners: true, gem: '#C2283D' }, { shop: false, desc: 'Oro e rubini, come nella sala del trono.' }),
  t('cristallo-blu', 'Cristallo Blu', 'epico', 3600, 'pregiati', { rail: 'crystal', rim: ['#E6F6FF', '#9FD8FF', '#4F9BE0'], trim: '#BFE9FF', corners: true, gem: '#7FD0FF' }, { shop: false, desc: 'Cristallo azzurro che lascia passare la luce.' }),
  t('scacchiera-imperiale', 'Scacchiera Imperiale', 'epico', 3800, 'pregiati', { rail: 'stone', rim: ['#F2EEE6', '#3A3A44', '#141418'], texture: 'checker', trim: GOLD, corners: true }, { shop: false, desc: 'Intarsio di marmo bianco e nero, come una scacchiera.' }),
  t('abisso-nero', 'Abisso Nero', 'epico', 4000, 'pregiati', { rail: 'lacquer', rim: ['#2A2E3A', '#12141B', '#05060A'], glow: '#3D7BFF', corners: true, gem: '#3D7BFF' }, { desc: 'Nero profondo con un riflesso blu.' }),
  t('giada-orientale', 'Giada Orientale', 'epico', 4200, 'pregiati', { rail: 'stone', rim: ['#9FE0B8', '#3FA172', '#1C5E3E'], texture: 'marble', trim: GOLD, corners: true }, { desc: 'Giada levigata, venata di verde chiaro.' }),
  t('drago-cremisi', 'Drago Cremisi', 'epico', 4400, 'fantasy', { rail: 'metal', rim: ['#E05A4A', '#A0182A', '#4E0612'], corners: true, studs: true }, {
    coming: { theme: 'Sponda in metallo rosso a squame; sugli angoli quattro teste di drago in ottone', palette: ['#A0182A', '#E05A4A', GOLD, '#2A0508'], notes: 'Le teste agli angoli devono leggersi anche a 40 px; squame solo come rilievo, non come disegno piatto.' },
    desc: 'Squame cremisi e teste di drago agli angoli.',
  }),
  t('tempesta-d-argento', 'Tempesta d’Argento', 'epico', 4600, 'pregiati', { rail: 'metal', rim: ['#F2F4F8', '#B9C0CC', '#7D8696'], texture: 'brushed', trim: SILVER, corners: true }, { desc: 'Argento spazzolato, freddo e lucente.' }),
  t('galassia', 'Galassia', 'epico', 4800, 'fantasy', { rail: 'cosmic', rim: ['#7C4BB8', '#2B1A5E', '#0A0620'], texture: 'stars', glow: '#B58CFF' }, { desc: 'Una sponda di cielo profondo con le sue stelle.' }),
  t('trono-degli-assi', 'Trono degli Assi', 'leggendario', 5500, 'leggendari', { rail: 'metal', rim: ['#FFF0B8', '#E8BE4F', '#A6770F'], trim: '#FFE38A', studs: true, corners: true, gem: '#C2283D', emblem: 'star' }, { shop: false, desc: 'Oro zecchino con le stelle degli assi agli angoli.' }),
  t('corona-del-re', 'Corona del Re', 'leggendario', 6000, 'leggendari', { rail: 'metal', rim: ['#FFF0B8', '#E8BE4F', '#A6770F'], trim: '#FFE38A', studs: true, corners: true, gem: '#2E8BEA', emblem: 'crown' }, { shop: false, desc: 'Velluto nero e oro: una corona su ogni angolo.' }),
  t('diamante-eterno', 'Diamante Eterno', 'leggendario', 6500, 'leggendari', { rail: 'metal', rim: ['#FFFFFF', '#D6DEEA', '#8A96AA'], texture: 'brushed', trim: '#FFFFFF', studs: true, corners: true, gem: '#E8F6FF', emblem: 'diamond' }, { shop: false, desc: 'Platino e diamanti, freddo come il ghiaccio.' }),
  t('fiamma-dorata', 'Fiamma Dorata', 'leggendario', 7000, 'leggendari', { rail: 'metal', rim: ['#FFD27A', '#E07A2A', '#8A2A0E'], trim: '#FFB36B', corners: true, studs: true, glow: '#FF8A3D' }, { shop: false, desc: 'Oro rosso che sembra appena uscito dalla forgia.' }),
  t('universo-infinito', 'Universo Infinito', 'leggendario', 7500, 'leggendari', { rail: 'cosmic', rim: ['#3D7BFF', '#1A1050', '#05030F'], texture: 'stars', glow: '#7FD0FF', corners: true, gem: '#B58CFF' }, { desc: 'Galassie lontane lungo tutta la sponda.' }),
  t('tavolo-del-campione', 'Tavolo del Campione', 'leggendario', 8000, 'leggendari', { rail: 'metal', rim: ['#FFE7A3', '#E0B04A', '#9C6E12'], trim: '#FFE7A3', corners: true, studs: true, emblem: 'laurel', gem: '#2E8B57' }, { shop: false, desc: 'Oro e alloro, per chi ha vinto tutto.' }),
  t('cuore-di-drago', 'Cuore di Drago', 'leggendario', 8500, 'fantasy', { rail: 'metal', rim: ['#FF7A5A', '#B8202A', '#3A0408'], glow: '#FF5A3D', corners: true }, {
    shop: false,
    coming: { theme: 'Sponda di ossidiana con vene di lava; al centro dei lati lunghi un cuore di drago incastonato come una gemma pulsante', palette: ['#3A0408', '#B8202A', '#FF7A5A', '#FFD27A'], notes: 'Statico (niente animazione); la luce della gemma è dipinta, non un effetto.' },
    desc: 'Ossidiana e lava, con un cuore di drago incastonato.',
  }),
  t('il-mito', 'Il Mito', 'leggendario', 9000, 'leggendari', { rail: 'stone', rim: ['#FFFFFF', '#E9E4D8', '#BDB29A'], texture: 'marble', trim: GOLD, corners: true, studs: true, emblem: 'laurel' }, { shop: false, desc: 'Marmo antico e oro, come un tempio.' }),
  t('l-ultimo-re', 'L’Ultimo Re', 'leggendario', 10000, 'leggendari', { rail: 'metal', rim: ['#4A4450', '#1A181F', '#0B0A0E'], trim: '#FFE38A', corners: true, studs: true, gem: '#FFE38A', emblem: 'crown' }, { shop: false, desc: 'Ferro nero e corone d’oro: l’ultimo tavolo prima della leggenda.' }),
  t('tavolo-degli-immortali', 'Tavolo degli Immortali', 'mitico', 12000, 'leggendari', { rail: 'stone', rim: ['#3A3440', '#16131A', '#060508'], texture: 'marble', trim: '#FFE38A', corners: true, studs: true, gem: '#B58CFF', glow: '#FFE38A', emblem: 'star' }, { shop: false, desc: 'Ossidiana venata d’oro, con una luce che non si spegne.' }),
  t('crono', 'Crono', 'mitico', 14000, 'leggendari', { rail: 'metal', rim: ['#E8C08A', '#A8743A', '#5A3816'], texture: 'brushed', trim: GOLD, corners: true, emblem: 'clock' }, { shop: false, desc: 'Bronzo con le ore incise: il tempo gira intorno al tavolo.' }),
  t('fenice-eterna', 'Fenice Eterna', 'mitico', 16000, 'fantasy', { rail: 'metal', rim: ['#FFE38A', '#FF8A3D', '#B8202A'], glow: '#FFB36B', corners: true }, {
    shop: false,
    coming: { theme: 'Sponda d’oro rosso; sui lati corti due fenici ad ali aperte, piume che scorrono lungo la sponda', palette: ['#B8202A', '#FF8A3D', '#FFE38A', '#FFFFFF'], notes: 'Le ali seguono la curva degli angoli; nessuna parte deve entrare nel panno.' },
    desc: 'Le ali della fenice abbracciano il tavolo.',
  }),
  t('trono-celeste', 'Trono Celeste', 'mitico', 18000, 'leggendari', { rail: 'metal', rim: ['#FFFFFF', '#DCEBFF', '#9FB8E0'], trim: '#FFFFFF', corners: true, studs: true, gem: '#7FD0FF', glow: '#BFE9FF', emblem: 'star' }, { shop: false, desc: 'Oro bianco e azzurro di cielo.' }),
  t('il-multiverso', 'Il Multiverso', 'mitico', 20000, 'leggendari', { rail: 'cosmic', rim: ['#FF8AD8', '#7C4BB8', '#2E8BEA'], texture: 'iridescent', corners: true, gem: '#FFFFFF', glow: '#FFB3F0' }, { shop: false, desc: 'Una sponda che cambia colore a ogni sguardo.' }),
  t('il-tavolo-leggendario', 'Il Tavolo Leggendario', 'mitico', 25000, 'leggendari', { rail: 'metal', rim: ['#FFF6D6', '#FFD24A', '#B8860B'], texture: 'iridescent', trim: '#FFF6D6', corners: true, studs: true, gem: '#FFFFFF', glow: '#FFE38A', emblem: 'crown' }, { shop: false, desc: 'Il tavolo delle leggende: oro vivo e diamanti.' }),
];

/** La sponda di partenza (non fa parte dei 40): il vetro chiaro della direzione Tramonto. */
export const STARTER_TABLE: TableItem = {
  id: 'vetro',
  name: 'Sponda di vetro',
  desc: 'La sponda di partenza, di vetro chiaro.',
  rarity: 'comune',
  category: 'legni',
  price: 0,
  shop: false,
  status: 'ready',
  slot: 'table',
  look: { rail: 'glass', rim: ['#FFFFFF', '#FFE3F0', '#FFFFFF'] },
};

/* ================================================================== grafiche del panno */

let fn = 0;
const c = (id: string, name: string, rarity: Rarity, price: number, category: Category, look: ClothLook, o: Opts = {}): FeltItem => ({
  id,
  n: ++fn,
  name,
  desc: o.desc ?? '',
  rarity,
  category,
  price,
  shop: o.shop ?? true,
  status: o.coming ? 'coming' : 'ready',
  ...(o.coming ? { art: o.coming } : {}),
  slot: 'felt',
  look,
});

const plain = (cloth: [string, string, string], velvet = false, design: string | null = null, paint?: string[]): ClothLook => ({ cloth, velvet, design, ...(paint ? { paint } : {}) });

const FIGURE = 'Illustrazione al centro del panno, tono su tono, opacità bassa: le carte bianche devono restare leggibili sopra. Niente nella fascia dove si posano le carte giocate più scuro o più chiaro del panno di oltre il 15%.';

export const FELTS: FeltItem[] = [
  // Classici
  c('verde-tradizionale', 'Verde Tradizionale', 'comune', 300, 'classici', plain(['#2E8B4E', '#1C6338', '#0F4024'], false, 'filetto'), { desc: 'Il verde del biliardo, con un filetto chiaro.' }),
  c('rosso-da-circolo', 'Rosso da Circolo', 'comune', 350, 'classici', plain(['#B5283A', '#801526', '#4E0A16'], false, 'filetto'), { desc: 'Il rosso dei tavoli dei circoli.' }),
  c('blu-notte', 'Blu Notte', 'comune', 400, 'classici', plain(['#2F4C8C', '#1B2F5E', '#0D1838']), { desc: 'Blu profondo, liscio.' }),
  c('bordeaux-reale', 'Bordeaux Reale', 'noncomune', 900, 'classici', plain(['#A53A4E', '#6E1E31', '#43101E'], false, 'filetto'), { desc: 'Bordeaux come i portoni di Spaccanapoli.' }),
  c('nero-elegante', 'Nero Elegante', 'noncomune', 1000, 'classici', plain(['#45424C', '#24222A', '#111015'], false, 'filetto'), { desc: 'Nero morbido con un filetto d’argento.' }),
  c('verde-smeraldo', 'Verde Smeraldo', 'comune', 0, 'classici', plain(['#14806A', '#0B4D42', '#06352E']), { shop: false, desc: 'Il panno di partenza.' }),
  c('avorio-antico', 'Avorio Antico', 'comune', 500, 'classici', plain(['#C9B68A', '#A8935F', '#7E6A3E']), { desc: 'Avorio caldo, come la carta antica.' }),
  c('grigio-antracite', 'Grigio Antracite', 'comune', 450, 'classici', plain(['#566173', '#353C4A', '#1E222B']), { desc: 'Grafite opaca, sobria.' }),
  c('marrone-tabacco', 'Marrone Tabacco', 'comune', 400, 'classici', plain(['#8A5A3A', '#5E3A24', '#3A2416']), { desc: 'Il colore delle vecchie tabaccherie.' }),
  c('blu-mediterraneo', 'Blu Mediterraneo', 'comune', 600, 'classici', plain(['#2F7FC8', '#1A5496', '#0D3266']), { desc: 'Il blu del mare d’estate.' }),
  // Italiani
  c('tricolore-italiano', 'Tricolore Italiano', 'noncomune', 1200, 'italiani', plain(['#2E8B4E', '#1C6338', '#0F4024'], false, 'tricolore', ['#1F9D55', '#F4F1EA', '#D5283A']), { desc: 'Una fascia tricolore corre lungo il bordo.' }),
  c('maiolica-mediterranea', 'Maiolica Mediterranea', 'noncomune', 1100, 'italiani', plain(['#2F7FC8', '#1A5496', '#0D3266'], false, 'maiolica', ['#F4F1EA', '#F2C230']), { desc: 'Le piastrelle bianche e gialle dei chiostri.' }),
  c('ceramica-siciliana', 'Ceramica Siciliana', 'raro', 1600, 'italiani', plain(['#C46A3A', '#93441F', '#5E2810'], false, 'ceramica', ['#F2C230', '#1F6FB8', '#2E8B57', '#F4F1EA']), { desc: 'Decori gialli, blu e verdi su terracotta.' }),
  c('limoni-della-costiera', 'Limoni della Costiera', 'noncomune', 1300, 'italiani', plain(['#1F8FA0', '#11606E', '#073C46'], false, 'limoni', ['#F2C230', '#2E8B57']), { desc: 'Limoni e foglie agli angoli del tavolo.' }),
  c('ulivo-calabrese', 'Ulivo Calabrese', 'noncomune', 1000, 'italiani', plain(['#7A8A3A', '#4F5C22', '#2F3812'], false, 'ulivo'), { desc: 'Rami d’ulivo intorno al tavolo.' }),
  c('piazza-italiana', 'Piazza Italiana', 'noncomune', 1000, 'italiani', plain(['#9A7A5E', '#6E553E', '#463424'], false, 'piazza'), { desc: 'I sampietrini a ventaglio di una piazza.' }),
  c('mosaico-romano', 'Mosaico Romano', 'raro', 1800, 'italiani', plain(['#B8A07A', '#8A7250', '#5A4830'], false, 'mosaico', ['#7A2E2E', '#2E2A26', '#F4EAD6']), { desc: 'Una cornice di tessere con la greca.' }),
  c('marmo-di-carrara', 'Marmo di Carrara', 'raro', 2000, 'italiani', plain(['#8E96A3', '#6A7280', '#464C58'], false, 'marmo'), { desc: 'Panno grigio perla con le venature del marmo.' }),
  c('venezia-al-tramonto', 'Venezia al Tramonto', 'raro', 2400, 'italiani', plain(['#C8604A', '#8A3A4A', '#3E1E46'], false, 'venezia', ['#FFB36B', '#2A1838']), { shop: false, desc: 'Il cielo di Venezia al tramonto, le onde della laguna.' }),
  c('firenze-rinascimentale', 'Firenze Rinascimentale', 'raro', 2200, 'italiani', plain(['#B5283A', '#801526', '#4E0A16'], false, 'giglio'), { desc: 'Gigli fiorentini su rosso.' }),
  // Eleganti
  c('oro-e-nero', 'Oro e Nero', 'epico', 3400, 'eleganti', plain(['#33303A', '#1A181F', '#0B0A0E'], true, 'filigrana', [GOLD]), { desc: 'Velluto nero con la filigrana d’oro.' }),
  c('argento-satinato', 'Argento Satinato', 'raro', 2000, 'eleganti', plain(['#8C95A6', '#5E6676', '#363C48'], false, 'satin'), { desc: 'Grigio argento dal riflesso satinato.' }),
  c('velluto-reale', 'Velluto Reale', 'epico', 3200, 'eleganti', plain(['#7C4BB8', '#4B2A7E', '#2A1650'], true, 'rosone'), { shop: false, desc: 'Velluto viola con un rosone al centro.' }),
  c('damascato-rosso', 'Damascato Rosso', 'raro', 2400, 'eleganti', plain(['#B5283A', '#801526', '#4E0A16'], true, 'damasco'), { desc: 'Damasco rosso a fiori, come le tappezzerie.' }),
  c('palazzo-imperiale', 'Palazzo Imperiale', 'epico', 3800, 'eleganti', plain(['#1E5A46', '#123A2E', '#08221A'], true, 'palazzo', [GOLD]), { desc: 'Verde imperiale, cornici e rosone d’oro.' }),
  c('notte-di-velluto', 'Notte di Velluto', 'epico', 3000, 'eleganti', plain(['#2B3C7A', '#17224D', '#0A1029'], true, 'filetto'), { desc: 'Velluto blu notte con un filetto d’argento.' }),
  c('ricamo-d-oro', 'Ricamo d’Oro', 'epico', 3600, 'eleganti', plain(['#6E1E31', '#43101E', '#22080F'], true, 'ricamo', [GOLD]), { shop: false, desc: 'Un ricamo d’oro corre lungo tutto il bordo.' }),
  c('cristallo-blu', 'Cristallo Blu', 'epico', 3600, 'eleganti', plain(['#2E8BEA', '#1556B0', '#0A2E6E'], true, 'cristallo'), { desc: 'Le sfaccettature di un cristallo azzurro.' }),
  c('seta-cremisi', 'Seta Cremisi', 'epico', 3000, 'eleganti', plain(['#C2283D', '#860F22', '#4E0612'], true, 'satin'), { desc: 'Seta rossa, liscia e lucente.' }),
  c('onice-nero', 'Onice Nero', 'epico', 4000, 'eleganti', plain(['#3A3640', '#1C1A20', '#0A090C'], false, 'onice'), { desc: 'Nero venato di bianco come l’onice.' }),
  // Fantasy
  c('drago-cremisi', 'Drago Cremisi', 'leggendario', 6000, 'fantasy', plain(['#8A1A28', '#5A0E18', '#2A0508'], true, null), {
    coming: { theme: 'Un drago orientale che si avvolge lungo il bordo del panno, la testa in un angolo', palette: ['#5A0E18', '#B8202A', GOLD], notes: FIGURE },
    desc: 'Un drago cremisi avvolto intorno al tavolo.',
  }),
  c('fenice-dorata', 'Fenice Dorata', 'leggendario', 7000, 'fantasy', plain(['#8A3A12', '#5A2008', '#2E0E02'], true, null), {
    coming: { theme: 'Una fenice ad ali spiegate al centro del panno, le piume che sfumano verso il bordo', palette: ['#5A2008', '#FF8A3D', '#FFE38A'], notes: FIGURE },
    desc: 'Una fenice d’oro ad ali spiegate.',
  }),
  c('lupo-d-argento', 'Lupo d’Argento', 'leggendario', 5500, 'fantasy', plain(['#3A4458', '#222A3A', '#0F141E'], false, null), {
    coming: { theme: 'Profilo di un lupo che ulula, inciso in argento al centro; luna piena dietro', palette: ['#222A3A', '#B9C0CC', '#F2F4F8'], notes: FIGURE },
    desc: 'Un lupo d’argento sotto la luna.',
  }),
  c('serpente-imperiale', 'Serpente Imperiale', 'epico', 4800, 'fantasy', plain(['#1C5E3E', '#0F3E28', '#062216'], true, null), {
    coming: { theme: 'Un serpente con corona che disegna un otto intorno al centro del tavolo', palette: ['#0F3E28', '#3FA172', GOLD], notes: FIGURE },
    desc: 'Un serpente coronato in verde e oro.',
  }),
  c('tigre-notturna', 'Tigre Notturna', 'epico', 4600, 'fantasy', plain(['#2A2238', '#18121F', '#0A0710'], false, null), {
    shop: false,
    coming: { theme: 'Strisce di tigre stilizzate che entrano dai bordi, occhi ambra in un angolo', palette: ['#18121F', '#FF8A3D', '#FFD27A'], notes: FIGURE },
    desc: 'Le strisce di una tigre nel buio. Arriverà con il primo evento.',
  }),
  c('fiore-di-giada', 'Fiore di Giada', 'epico', 4200, 'fantasy', plain(['#2E8B6A', '#1C5E46', '#0C3426'], true, 'fiore', ['#9FE0B8', GOLD]), { desc: 'Un fiore di giada a otto petali.' }),
  c('tempesta-elettrica', 'Tempesta Elettrica', 'epico', 4400, 'fantasy', plain(['#2A2E5E', '#171A3E', '#080A20'], false, 'fulmini', ['#9FE3FF', '#FFFFFF']), { desc: 'Fulmini che si rincorrono sul panno.' }),
  c('fiamme-eterne', 'Fiamme Eterne', 'leggendario', 6500, 'fantasy', plain(['#5A2A1E', '#2E1510', '#140806'], true, null), {
    coming: { theme: 'Lingue di fuoco che salgono dal bordo inferiore e sfumano a metà tavolo', palette: ['#140806', '#E0602A', '#FFB36B'], notes: FIGURE },
    desc: 'Fiamme che salgono dal bordo del tavolo.',
  }),
  c('ghiaccio-eterno', 'Ghiaccio Eterno', 'epico', 4400, 'fantasy', plain(['#3A7AA8', '#1F5078', '#0C2C48'], false, 'ghiaccio', ['#E6F6FF']), { desc: 'Cristalli di brina negli angoli.' }),
  c('nebbia-mistica', 'Nebbia Mistica', 'epico', 4800, 'fantasy', plain(['#4A3E6E', '#2C2448', '#140F26'], true, 'nebbia', ['#B8A8E8']), { shop: false, desc: 'Una nebbia viola che si muove piano.' }),
  // Spazio e mitologia
  c('via-lattea', 'Via Lattea', 'epico', 4800, 'cosmo', plain(['#1E2456', '#10143A', '#05071C'], false, 'via-lattea', ['#FFFFFF', '#C9D6FF']), { desc: 'La Via Lattea attraversa il tavolo.' }),
  c('nebulosa-viola', 'Nebulosa Viola', 'leggendario', 5500, 'cosmo', plain(['#4A2A7E', '#2A1650', '#100828'], false, 'nebulosa', ['#FF8AD8', '#7FD0FF']), { desc: 'Nubi viola e rosa tra le stelle.' }),
  c('buco-nero', 'Buco Nero', 'leggendario', 8000, 'cosmo', plain(['#1A1424', '#0C0912', '#030205'], false, 'buco-nero', ['#FFB36B', '#FFE38A']), { desc: 'Un anello di luce intorno al nulla.' }),
  c('universo-infinito', 'Universo Infinito', 'mitico', 12000, 'cosmo', plain(['#1A1050', '#0C0830', '#030214'], false, 'universo', ['#7FD0FF', '#FF8AD8', '#FFFFFF']), { desc: 'Galassie, nebulose e stelle a perdita d’occhio.' }),
  c('sole-cremisi', 'Sole Cremisi', 'leggendario', 6000, 'cosmo', plain(['#8A1A28', '#5A0E18', '#2A0508'], false, 'sole-cremisi', ['#FF8A3D', '#FFD27A']), { shop: false, desc: 'Un sole rosso che sorge dal centro.' }),
  c('luna-d-argento', 'Luna d’Argento', 'leggendario', 5500, 'cosmo', plain(['#2A3448', '#18202E', '#0A0E16'], false, 'luna', ['#E6EAF2']), { desc: 'Una falce di luna e qualche stella.' }),
  c('eclissi-totale', 'Eclissi Totale', 'leggendario', 7000, 'cosmo', plain(['#1A1424', '#0C0912', '#030205'], false, 'eclissi', ['#FFE38A', '#FFFFFF']), { shop: false, desc: 'La corona del sole intorno alla luna nera.' }),
  c('costellazioni', 'Costellazioni', 'epico', 4600, 'cosmo', plain(['#1E2C5E', '#121C3E', '#060B1E'], false, 'costellazioni', ['#FFFFFF', '#C9D6FF']), { desc: 'Le costellazioni unite da linee sottili.' }),
  c('olimpo', 'Olimpo', 'leggendario', 9000, 'cosmo', plain(['#F0E6D0', '#C9B88E', '#8A7650'], false, 'olimpo', [GOLD, '#FFFFFF']), { shop: false, desc: 'Marmo chiaro, greca e alloro: la casa degli dei.' }),
  c('crono', 'Crono', 'mitico', 14000, 'cosmo', plain(['#2A2238', '#18121F', '#0A0710'], true, 'crono', [GOLD]), { desc: 'Il quadrante del tempo inciso nel velluto.' }),
  // Esclusivi
  c('il-tavolo-del-re', 'Il Tavolo del Re', 'leggendario', 10000, 'esclusivi', plain(['#33303A', '#1A181F', '#0B0A0E'], true, 'stemma', [GOLD]), { desc: 'Uno stemma con la corona: il tavolo diventa una sala.' }),
  c('corona-degli-assi', 'Corona degli Assi', 'mitico', 12000, 'esclusivi', plain(['#4E0612', '#2E030A', '#140104'], true, null), {
    shop: false,
    coming: { theme: 'Una corona al centro formata dai quattro assi napoletani (Coppe, Denari, Spade, Bastoni) disposti a ventaglio', palette: ['#2E030A', GOLD, '#FFFFFF'], notes: `${FIGURE} I semi devono essere quelli delle carte napoletane, disegnati da zero (non ritagliati dalle scansioni).` },
    desc: 'I quattro assi uniti in una corona.',
  }),
  c('la-mano-perfetta', 'La Mano Perfetta', 'mitico', 12000, 'esclusivi', plain(['#1C5E3E', '#0F3E28', '#062216'], true, null), {
    shop: false,
    coming: { theme: 'Un ventaglio di carte coperte tenuto da una mano elegante, in oro su verde', palette: ['#0F3E28', GOLD, '#F4EAD6'], notes: FIGURE },
    desc: 'Per chi ha fatto la mano perfetta a Scopa.',
  }),
  c('i-tre-semi', 'I Tre Semi', 'mitico', 14000, 'esclusivi', plain(['#2A1650', '#17093A', '#08021A'], true, null), {
    shop: false,
    coming: { theme: 'Tre emblemi intrecciati, uno per gioco (Tressette, Briscola, Scopa), in un triangolo al centro', palette: ['#17093A', GOLD, '#FF8A3D', '#7FD0FF'], notes: FIGURE },
    desc: 'Un emblema per ognuno dei tre giochi.',
  }),
  c('destino', 'Destino', 'mitico', 16000, 'esclusivi', plain(['#1A2A4A', '#0E182E', '#050A16'], true, 'destino', [GOLD, '#7FD0FF']), { shop: false, desc: 'Un rosone inciso a guilloché, linee che non finiscono.' }),
  c('il-grande-maestro', 'Il Grande Maestro', 'mitico', 16000, 'esclusivi', plain(['#2E1E46', '#1A0F2E', '#0A0514'], true, 'maestro', [GOLD]), { shop: false, desc: 'Filigrana e cornici d’oro, per i maestri del Tressette.' }),
  c('leggenda-vivente', 'Leggenda Vivente', 'mitico', 25000, 'esclusivi', plain(['#3A2A12', '#1E1408', '#0A0602'], true, 'leggenda', [GOLD, '#FFFFFF']), { shop: false, desc: 'Raggi d’oro che partono dal centro del tavolo.' }),
  c('trionfo-eterno', 'Trionfo Eterno', 'mitico', 18000, 'esclusivi', plain(['#1E5A46', '#123A2E', '#08221A'], true, 'alloro', [GOLD]), { shop: false, desc: 'Una corona d’alloro intorno al centro.' }),
  c('oltre-il-tempo', 'Oltre il Tempo', 'mitico', 20000, 'esclusivi', plain(['#1A1050', '#0C0830', '#030214'], true, 'tempo', [GOLD, '#7FD0FF']), { shop: false, desc: 'Anelli concentrici come gli ingranaggi del tempo.' }),
  c('il-panno-degli-immortali', 'Il Panno degli Immortali', 'mitico', 25000, 'esclusivi', plain(['#16131A', '#0B090E', '#030204'], true, 'immortali', [GOLD, '#B58CFF']), { shop: false, desc: 'Nero assoluto, oro e una luce viola: solo per le leggende.' }),
];

/* ================================================================== dorsi */

let bn = 0;
const b = (id: string, name: string, rarity: Rarity, price: number, category: Category, colors: [string, string, string, string], motif: string, o: Opts = {}): BackItem => ({
  id,
  n: ++bn,
  name,
  desc: o.desc ?? '',
  rarity,
  category,
  price,
  shop: o.shop ?? true,
  status: o.coming ? 'coming' : 'ready',
  ...(o.coming ? { art: o.coming } : {}),
  slot: 'back',
  look: { colors, motif },
});

const BACK_NOTE = 'Dorso 720×1150 px, cornice bianca di 12 px come gli altri dorsi; il soggetto deve leggersi su una carta larga 50 punti; simmetrico per rotazione di 180° (la carta si vede capovolta).';

export const BACKS: BackItem[] = [
  // Classici
  b('rosso-tradizionale', 'Rosso Tradizionale', 'comune', 300, 'classici', ['#B5223A', '#7A1022', '#FFF1E6', '#FFFFFF'], 'righe', { desc: 'Rosso pieno a righe fini, come i mazzi da bar.' }),
  b('blu-tradizionale', 'Blu Tradizionale', 'comune', 300, 'classici', ['#24479A', '#122A66', '#FFFFFF', '#E8F0FF'], 'righe', { desc: 'Il blu dei mazzi di sempre.' }),
  b('verde-tradizionale', 'Verde Tradizionale', 'comune', 350, 'classici', ['#1F7A46', '#0F4A28', '#F4F1EA', '#FFFFFF'], 'righe', { desc: 'Verde biliardo a righe sottili.' }),
  b('bordeaux', 'Bordeaux', 'comune', 450, 'classici', ['#7A1E31', '#4A0E1C', '#F2D9C4', '#FFF4EA'], 'rombi', { desc: 'Bordeaux con una trama a rombi.' }),
  b('nero-classico', 'Nero Classico', 'comune', 500, 'classici', ['#2A2830', '#121116', '#D9D6E0', '#FFFFFF'], 'rombi', { desc: 'Nero e argento, essenziale.' }),
  b('oro-classico', 'Oro Classico', 'noncomune', 1200, 'classici', ['#7A5A1E', '#4A3410', GOLD, '#FFF6D6'], 'rosone', { desc: 'Bronzo e oro con un rosone.' }),
  b('argento-classico', 'Argento Classico', 'noncomune', 1000, 'classici', ['#5E6676', '#363C48', SILVER, '#FFFFFF'], 'rosone', { desc: 'Grigio e argento con un rosone.' }),
  b('blu-notte', 'Blu Notte', 'comune', 600, 'classici', ['#1B2456', '#0B1030', '#C9D6FF', '#FFFFFF'], 'rombi', { desc: 'Blu profondo con una trama leggera.' }),
  b('rosso-rubino', 'Rosso Rubino', 'noncomune', 1100, 'classici', ['#9A0F2A', '#5A0516', '#FFB3C0', '#FFFFFF'], 'rosone', { desc: 'Rosso rubino sfaccettato.' }),
  b('verde-smeraldo', 'Verde Smeraldo', 'noncomune', 900, 'classici', ['#14806A', '#06352E', '#9FE0C8', '#FFFFFF'], 'rosone', { desc: 'Smeraldo con un rosone chiaro.' }),
  // Italiani
  b('tricolore', 'Tricolore', 'noncomune', 1300, 'italiani', ['#F4F1EA', '#E2DCCD', '#1F9D55', '#D5283A'], 'tricolore', { desc: 'Bianco, rosso e verde.' }),
  b('sicilia', 'Sicilia', 'raro', 1600, 'italiani', ['#F4E7C8', '#E2CB98', '#1F6FB8', '#F2C230'], 'ceramica', { desc: 'I decori delle ceramiche di Caltagirone.' }),
  b('calabria', 'Calabria', 'raro', 1600, 'italiani', ['#1F4E8C', '#0D2A52', '#F2C230', '#FFFFFF'], 'spirale', { desc: 'Spirali e sole come sui tessuti calabresi.' }),
  b('venezia', 'Venezia', 'raro', 1800, 'italiani', ['#1E5A6E', '#0C3442', '#F3D58C', '#FFF6D6'], 'onde', { desc: 'Le onde della laguna in oro.' }),
  b('roma-imperiale', 'Roma Imperiale', 'raro', 2400, 'italiani', ['#7A1E1E', '#4A0E0E', GOLD, '#FFF6D6'], 'alloro', { desc: 'Porpora imperiale e alloro d’oro.' }),
  b('firenze', 'Firenze', 'raro', 2000, 'italiani', ['#F4EAD6', '#E2D2B0', '#C2283D', '#7A1022'], 'giglio', { desc: 'Il giglio rosso su fondo chiaro.' }),
  b('napoli', 'Napoli', 'noncomune', 1000, 'italiani', ['#2F8FE0', '#165AA8', '#FFFFFF', '#E8F4FF'], 'righe', { desc: 'Azzurro e bianco a righe: il colore della città.' }),
  b('sardegna', 'Sardegna', 'raro', 1800, 'italiani', ['#F4EAD6', '#E2D2B0', '#B5223A', '#2A2830'], 'tessuto', { desc: 'I motivi geometrici dei tappeti sardi.' }),
  b('maiolica', 'Maiolica', 'noncomune', 1200, 'italiani', ['#F7F1DE', '#E3D6B0', '#1F6FB8', '#F2C230'], 'maiolica', { desc: 'Le piastrelle bianche e blu.' }),
  b('mosaico-romano', 'Mosaico Romano', 'raro', 2200, 'italiani', ['#E8DCC2', '#C9B88E', '#7A2E2E', '#2E2A26'], 'greca', { desc: 'Tessere e greca come nelle ville romane.' }),
  // Nobili
  b('corona-reale', 'Corona Reale', 'epico', 3400, 'nobili', ['#1A181F', '#0B0A0E', '#E8BE4F', '#FFF0B8'], 'corona', { shop: false, desc: 'Nero e oro con la corona.' }),
  b('scudo-imperiale', 'Scudo Imperiale', 'epico', 3000, 'nobili', ['#1E2C5E', '#0C1430', GOLD, '#FFF6D6'], 'scudo', { desc: 'Uno scudo d’oro su blu.' }),
  b('leone-d-oro', 'Leone d’Oro', 'epico', 4400, 'nobili', ['#7A1E1E', '#4A0E0E', GOLD, '#FFF6D6'], 'leone', {
    shop: false,
    coming: { theme: 'Leone rampante araldico in oro su porpora, dentro uno scudo', palette: ['#4A0E0E', GOLD, '#FFF6D6'], notes: BACK_NOTE },
    desc: 'Il leone rampante degli stemmi.',
  }),
  b('aquila-reale', 'Aquila Reale', 'epico', 4600, 'nobili', ['#2A2830', '#121116', GOLD, '#FFF6D6'], 'aquila', {
    coming: { theme: 'Aquila araldica ad ali spiegate, oro su nero', palette: ['#121116', GOLD, '#FFF6D6'], notes: BACK_NOTE },
    desc: 'L’aquila ad ali spiegate.',
  }),
  b('fregio-veneziano', 'Fregio Veneziano', 'epico', 3200, 'nobili', ['#6E1E31', '#3A0E19', '#E0B04A', '#FFE7A3'], 'fregio', { desc: 'Cornici e volute come i palazzi veneziani.' }),
  b('giglio-fiorentino', 'Giglio Fiorentino', 'epico', 3000, 'nobili', ['#C2283D', '#7A1022', GOLD, '#FFF6D6'], 'giglio', { desc: 'Il giglio d’oro su rosso.' }),
  b('chiave-del-regno', 'Chiave del Regno', 'epico', 3600, 'nobili', ['#2A1650', '#17093A', GOLD, '#FFF6D6'], 'chiave', { shop: false, desc: 'Due chiavi incrociate, per chi completa le missioni.' }),
  b('rosa-dei-nobili', 'Rosa dei Nobili', 'epico', 3800, 'nobili', ['#3A0E19', '#1E060C', '#E8617A', '#FFD8E0'], 'rosa', { shop: false, desc: 'La rosa araldica a cinque petali.' }),
  b('sigillo-imperiale', 'Sigillo Imperiale', 'epico', 4200, 'nobili', ['#5A0E18', '#2A0508', GOLD, '#FFF6D6'], 'sigillo', { shop: false, desc: 'Un sigillo di ceralacca con l’impronta d’oro.' }),
  b('stemmi-antichi', 'Stemmi Antichi', 'epico', 4000, 'nobili', ['#1E3A2E', '#0C2018', GOLD, '#FFF6D6'], 'stemmi', { shop: false, desc: 'Quattro stemmi antichi intorno al centro.' }),
  // Fantasy
  b('drago-cremisi', 'Drago Cremisi', 'leggendario', 6000, 'fantasy', ['#5A0E18', '#2A0508', '#E05A4A', GOLD], 'drago', {
    coming: { theme: 'Drago cremisi arrotolato su sé stesso al centro, coda e testa simmetriche', palette: ['#2A0508', '#B8202A', GOLD], notes: BACK_NOTE },
    desc: 'Un drago cremisi arrotolato.',
  }),
  b('fenice-dorata', 'Fenice Dorata', 'leggendario', 7000, 'fantasy', ['#5A2008', '#2E0E02', '#FF8A3D', '#FFE38A'], 'fenice', {
    coming: { theme: 'Fenice d’oro ad ali aperte, due volte (sopra e sotto, ruotata)', palette: ['#2E0E02', '#FF8A3D', '#FFE38A'], notes: BACK_NOTE },
    desc: 'La fenice d’oro.',
  }),
  b('lupo-d-argento', 'Lupo d’Argento', 'leggendario', 5500, 'fantasy', ['#222A3A', '#0F141E', '#B9C0CC', '#FFFFFF'], 'lupo', {
    coming: { theme: 'Testa di lupo d’argento frontale in un medaglione', palette: ['#0F141E', '#B9C0CC', '#FFFFFF'], notes: BACK_NOTE },
    desc: 'Un lupo d’argento in un medaglione.',
  }),
  b('occhio-del-drago', 'Occhio del Drago', 'leggendario', 6500, 'fantasy', ['#1C2A1A', '#0A120A', '#9FE070', '#FFE38A'], 'occhio', {
    coming: { theme: 'Occhio di drago con pupilla a fessura, iride verde e oro, squame intorno', palette: ['#0A120A', '#9FE070', '#FFE38A'], notes: BACK_NOTE },
    desc: 'L’occhio del drago ti guarda.',
  }),
  b('spada-eterna', 'Spada Eterna', 'leggendario', 6000, 'fantasy', ['#1E2C5E', '#0C1430', SILVER, '#FFFFFF'], 'spada', {
    shop: false,
    coming: { theme: 'Due spade incrociate con l’elsa decorata, lame lucide', palette: ['#0C1430', SILVER, GOLD], notes: BACK_NOTE },
    desc: 'Due spade incrociate, per chi non perde mai.',
  }),
  b('scudo-leggendario', 'Scudo Leggendario', 'leggendario', 5500, 'fantasy', ['#2A1650', '#17093A', GOLD, '#FFF6D6'], 'scudo', { shop: false, desc: 'Lo scudo d’oro della Fortezza degli Assi.' }),
  b('fiamma-blu', 'Fiamma Blu', 'epico', 4800, 'fantasy', ['#0C1E4A', '#050C26', '#3D7BFF', '#BFE9FF'], 'fiamma', {
    coming: { theme: 'Una fiamma blu stilizzata che sale al centro', palette: ['#050C26', '#3D7BFF', '#BFE9FF'], notes: BACK_NOTE },
    desc: 'Una fiamma blu fredda.',
  }),
  b('cristallo-magico', 'Cristallo Magico', 'epico', 4600, 'fantasy', ['#1E3A6E', '#0C1E40', '#9FD8FF', '#FFFFFF'], 'cristallo', { desc: 'Un cristallo sfaccettato che brilla.' }),
  b('rune-antiche', 'Rune Antiche', 'leggendario', 5000, 'fantasy', ['#2A2620', '#14110C', '#C8A15A', '#F3D58C'], 'rune', { shop: false, desc: 'Un cerchio di rune intorno a un sigillo.' }),
  b('serpente-mistico', 'Serpente Mistico', 'leggendario', 7500, 'fantasy', ['#0F3E28', '#062216', '#3FA172', GOLD], 'serpente', {
    shop: false,
    coming: { theme: 'Un serpente che si morde la coda (uroboro) intorno a un occhio', palette: ['#062216', '#3FA172', GOLD], notes: `${BACK_NOTE} Arriverà con il primo evento.` },
    desc: 'L’uroboro, il serpente che si morde la coda.',
  }),
  // Cosmici
  b('galassia', 'Galassia', 'epico', 4800, 'cosmo', ['#2B1A5E', '#0A0620', '#B58CFF', '#FFFFFF'], 'galassia', { desc: 'Una galassia a spirale.' }),
  b('nebulosa-viola', 'Nebulosa Viola', 'leggendario', 5500, 'cosmo', ['#4A2A7E', '#100828', '#FF8AD8', '#7FD0FF'], 'nebulosa', { desc: 'Nubi viola e rosa tra le stelle.' }),
  b('sole-nero', 'Sole Nero', 'leggendario', 7000, 'cosmo', ['#1A1424', '#030205', '#FFB36B', '#FFE38A'], 'sole-nero', { shop: false, desc: 'Un sole nero con la corona di fuoco.' }),
  b('eclissi', 'Eclissi', 'leggendario', 6500, 'cosmo', ['#16131A', '#030204', '#FFE38A', '#FFFFFF'], 'eclissi', { desc: 'La luna davanti al sole.' }),
  b('costellazioni', 'Costellazioni', 'epico', 4600, 'cosmo', ['#1E2C5E', '#060B1E', '#FFFFFF', '#C9D6FF'], 'costellazioni', { desc: 'Stelle unite da linee sottili.' }),
  b('luna-d-argento', 'Luna d’Argento', 'leggendario', 5500, 'cosmo', ['#2A3448', '#0A0E16', '#E6EAF2', '#FFFFFF'], 'luna', { desc: 'Due falci di luna d’argento.' }),
  b('universo-infinito', 'Universo Infinito', 'mitico', 12000, 'cosmo', ['#1A1050', '#030214', '#7FD0FF', '#FF8AD8'], 'universo', { desc: 'Galassie e nebulose senza fine.' }),
  b('polvere-stellare', 'Polvere Stellare', 'epico', 4400, 'cosmo', ['#2B3C7A', '#0A1029', '#F3D58C', '#FFF6D6'], 'stelle', { desc: 'Polvere d’oro su blu notte.' }),
  b('supernova', 'Supernova', 'leggendario', 8000, 'cosmo', ['#2A0E3A', '#0A0210', '#FF8A3D', '#FFFFFF'], 'supernova', { desc: 'L’esplosione di una stella.' }),
  b('dimensione-oscura', 'Dimensione Oscura', 'leggendario', 9000, 'cosmo', ['#120A1E', '#030106', '#7A4BFF', '#D6C8FF'], 'portale', { shop: false, desc: 'Un portale verso un’altra dimensione.' }),
  // Mitici
  b('il-re-delle-carte', 'Il Re delle Carte', 'mitico', 14000, 'mitici', ['#1A181F', '#0B0A0E', GOLD, '#FFF6D6'], 're', {
    shop: false,
    coming: { theme: 'Il Re (figura napoletana) ridisegnato in stile medaglione, a specchio come le figure delle carte', palette: ['#0B0A0E', GOLD, '#C2283D', '#FFF6D6'], notes: `${BACK_NOTE} Figura originale, non copiata da un mazzo esistente.` },
    desc: 'Il Re, per chi regna a Scopa.',
  }),
  b('trono-degli-assi', 'Trono degli Assi', 'mitico', 16000, 'mitici', ['#2E030A', '#140104', GOLD, '#FFF6D6'], 'trono', {
    coming: { theme: 'Un trono d’oro visto di fronte, sullo schienale i quattro semi napoletani', palette: ['#140104', GOLD, '#FFF6D6'], notes: BACK_NOTE },
    desc: 'Il trono dei quattro assi.',
  }),
  b('la-mano-perfetta', 'La Mano Perfetta', 'mitico', 12000, 'mitici', ['#0F3E28', '#062216', GOLD, '#F4EAD6'], 'mano', {
    shop: false,
    coming: { theme: 'Un ventaglio di carte in oro, a specchio', palette: ['#062216', GOLD, '#F4EAD6'], notes: BACK_NOTE },
    desc: 'Per chi ha fatto la mano perfetta a Scopa.',
  }),
  b('il-destino', 'Il Destino', 'mitico', 14000, 'mitici', ['#1A2A4A', '#050A16', GOLD, '#7FD0FF'], 'guilloche', { desc: 'Linee incise che non finiscono mai.' }),
  b('i-tre-giochi', 'I Tre Giochi', 'mitico', 18000, 'mitici', ['#17093A', '#08021A', GOLD, '#FF8A3D'], 'tregiochi', {
    shop: false,
    coming: { theme: 'Tre emblemi (Tressette, Briscola, Scopa) in triangolo dentro un medaglione', palette: ['#08021A', GOLD, '#FF8A3D', '#7FD0FF'], notes: BACK_NOTE },
    desc: 'I tre giochi in un solo emblema.',
  }),
  b('maestro-eterno', 'Maestro Eterno', 'mitico', 16000, 'mitici', ['#2E1E46', '#0A0514', GOLD, '#FFF6D6'], 'filigrana', { shop: false, desc: 'Filigrana d’oro, per i maestri delle carte.' }),
  b('leggenda-vivente', 'Leggenda Vivente', 'mitico', 25000, 'mitici', ['#3A2A12', '#0A0602', GOLD, '#FFFFFF'], 'raggi', { shop: false, desc: 'Raggi d’oro: solo chi arriva in cima.' }),
  b('corona-degli-immortali', 'Corona degli Immortali', 'mitico', 20000, 'mitici', ['#16131A', '#030204', '#FFE38A', '#B58CFF'], 'corona', { shop: false, desc: 'Nero assoluto, una corona d’oro e una luce viola.' }),
  b('l-ultima-partita', 'L’Ultima Partita', 'mitico', 18000, 'mitici', ['#2A2620', '#0A0806', GOLD, '#F4EAD6'], 'ultima', {
    shop: false,
    coming: { theme: 'Due carte incrociate su un tavolo visto dall’alto, una lampada sopra', palette: ['#0A0806', GOLD, '#F4EAD6'], notes: BACK_NOTE },
    desc: 'Per chi ha giocato mille partite.',
  }),
  b('l-origine', 'L’Origine', 'mitico', 25000, 'mitici', ['#120A1E', '#030106', '#FFE38A', '#FFFFFF'], 'origine', { shop: false, desc: 'Il punto da cui tutto comincia.' }),
];

/** Il dorso di partenza (non fa parte dei 60). */
export const STARTER_BACK: BackItem = {
  id: 'classico',
  name: 'Classico',
  desc: 'Il dorso di sempre, con il sole del Tramonto.',
  rarity: 'comune',
  category: 'classici',
  price: 0,
  shop: false,
  status: 'ready',
  slot: 'back',
  look: { colors: ['#7A2E9C', '#3B1E6B', '#FFE066', '#FFF6C2'], motif: 'maiolica' },
};

/* ================================================================== Collezione Napoli */
// Gli oggetti che c'erano prima di questo catalogo e non hanno un equivalente nei nuovi elenchi:
// restano, con i loro nomi e i loro prezzi, perché chi li ha li tenga e chi vuole li possa comprare.

const legacyFelt = (id: string, name: string, desc: string, rarity: Rarity, price: number, look: ClothLook, shop = true): FeltItem => ({
  id,
  name,
  desc,
  rarity,
  category: 'napoli',
  price,
  shop,
  status: 'ready',
  slot: 'felt',
  look,
});
const legacyBack = (id: string, name: string, desc: string, rarity: Rarity, price: number, colors: [string, string, string, string], motif: string, shop = true): BackItem => ({
  id,
  name,
  desc,
  rarity,
  category: 'napoli',
  price,
  shop,
  status: 'ready',
  slot: 'back',
  look: { colors, motif },
});

export const NAPOLI_FELTS: FeltItem[] = [
  legacyFelt('mergellina', 'Mergellina', 'Il colore del mare sotto il lungomare.', 'comune', 500, plain(['#21A5A8', '#11717A', '#084650'])),
  legacyFelt('gran-caffe', 'Gran Caffè', 'Velluto verde bosco, come ai tavolini storici.', 'raro', 1800, plain(['#2E7A52', '#174A33', '#0A2A1D'], true)),
  legacyFelt('arancia', 'Arancia di Sorrento', 'Arancio bruciato.', 'comune', 800, plain(['#D9792E', '#A04E15', '#64300A'])),
  legacyFelt('lavanda', 'Lavanda', 'Lilla tenue, per chi gioca rilassato.', 'raro', 1500, plain(['#9A86D6', '#6A55A8', '#3F2F72'])),
  legacyFelt('corallo', 'Corallo di Torre del Greco', 'Rosso corallo.', 'raro', 2500, plain(['#E8615C', '#B23A3A', '#6E1F22'])),
  legacyFelt('lava', 'Lava del Vesuvio', 'Velluto antracite con un riflesso di brace.', 'leggendario', 12000, plain(['#5A2A1E', '#2E1510', '#140806'], true)),
  legacyFelt('rosone', 'Rosone', 'Un rosone a otto petali sullo smeraldo.', 'raro', 1200, plain(['#14806A', '#0B4D42', '#06352E'], false, 'rosone')),
  legacyFelt('onde-del-golfo', 'Onde del Golfo', 'Onde leggere sul blu del golfo.', 'raro', 2000, plain(['#2F5FA8', '#1B3A72', '#0F2149'], false, 'onde')),
  legacyFelt('sole-di-vietri', 'Sole di Vietri', 'Un grande sole a raggi, come sulle ceramiche di Vietri.', 'epico', 4000, plain(['#14806A', '#0B4D42', '#06352E'], false, 'sole')),
  legacyFelt('vesuvio', 'Vesuvio', 'Il profilo del vulcano con il pennacchio.', 'epico', 5000, plain(['#14806A', '#0B4D42', '#06352E'], false, 'vesuvio')),
  legacyFelt('cornicello', 'Cornicello', 'Il portafortuna, discreto, al centro.', 'epico', 6000, plain(['#14806A', '#0B4D42', '#06352E'], false, 'corno')),
];

export const NAPOLI_BACKS: BackItem[] = [
  legacyBack('golfo', 'Golfo', 'Onde bianche su blu profondo.', 'raro', 1500, ['#1B4E8C', '#0D2A52', '#BFE4FF', '#FFFFFF'], 'onde'),
  legacyBack('limoni', 'Limoni di Amalfi', 'Limoni e foglie su fondo maiolica.', 'raro', 2500, ['#F7F1DE', '#E3D6B0', '#F2C230', '#2E8B57'], 'limoni'),
  legacyBack('stelle', 'Notte di San Lorenzo', 'Stelle d’oro su blu notte.', 'epico', 4000, ['#1B2456', '#0B1030', '#F3D58C', '#FFF6D6'], 'stelle'),
  legacyBack('vietri', 'Sole di Vietri', 'Un sole a raggi giallo e arancio.', 'epico', 5000, ['#F4E7C8', '#E2CB98', '#F08A24', '#2A6FB0'], 'sole'),
  legacyBack('tramonto', 'Vesuvio al tramonto', 'Il vulcano al tramonto.', 'epico', 6000, ['#4B2A7E', '#22113F', '#FF8A3D', '#FFD9A0'], 'vesuvio'),
  legacyBack('tarocco', 'Antico', 'Cornici e fregi come i mazzi dell’Ottocento.', 'leggendario', 9000, ['#6E1E31', '#3A0E19', '#E0B04A', '#FFE7A3'], 'tarocco'),
  legacyBack('ottone', 'Gran Caffè', 'Velluto verde e ottone, dal Gran Caffè: lo aveva chi è passato dalla vecchia arena.', 'epico', 4000, ['#174A33', '#0A2A1D', '#C8A15A', '#F3D58C'], 'maiolica', false),
];

/* ================================================================== indice */

export const ITEMS: Item[] = [STARTER_TABLE, ...TABLES, ...FELTS, ...NAPOLI_FELTS, STARTER_BACK, ...BACKS, ...NAPOLI_BACKS];

const byId = new Map<string, Item>();
for (const i of ITEMS) byId.set(`${i.slot}:${i.id}`, i);

/** Un oggetto dal suo posto e dal suo id (gli id si ripetono tra posti: «crono» è un tavolino e un panno). */
export const itemOf = (slot: Slot, id: string): Item | undefined => byId.get(`${slot}:${id}`);

/** La chiave unica di un oggetto, usata in `owned`: «table:crono», «felt:crono», «back:classico». */
export const keyOf = (i: Pick<Item, 'slot' | 'id'>) => `${i.slot}:${i.id}`;
export const itemByKey = (key: string): Item | undefined => byId.get(key);

export const itemsOf = (slot: Slot) => ITEMS.filter(i => i.slot === slot);

export const DEFAULT_EQUIPPED: Record<Slot, string> = { table: 'vetro', felt: 'verde-smeraldo', back: 'classico' };
export const STARTER_KEYS = (Object.keys(DEFAULT_EQUIPPED) as Slot[]).map(s => `${s}:${DEFAULT_EQUIPPED[s]}`);

export const SLOTS: Slot[] = ['table', 'felt', 'back'];
export const SLOT_NAMES: Record<Slot, string> = { table: 'Tavolini', felt: 'Panni', back: 'Dorsi' };
export const SLOT_NAME: Record<Slot, string> = { table: 'Tavolino', felt: 'Panno', back: 'Dorso delle carte' };

/* ================================================================== dal vecchio negozio */
// Prima un «panno» era panno + sponda, e i decori erano un posto a parte. Ogni vecchio id diventa il
// suo panno e il suo tavolino; i decori diventano grafiche del panno.

export const LEGACY: {
  felt: Record<string, { felt: string; table: string }>;
  pattern: Record<string, string | null>;
  back: Record<string, string>;
} = {
  felt: {
    smeraldo: { felt: 'verde-smeraldo', table: 'vetro' },
    mercato: { felt: 'blu-mediterraneo', table: 'legno-di-casa' },
    mergellina: { felt: 'mergellina', table: 'tavolo-della-taverna' },
    spaccanapoli: { felt: 'bordeaux-reale', table: 'noce-italiano' },
    galleria: { felt: 'grigio-antracite', table: 'tavolo-del-circolo' },
    'gran-caffe': { felt: 'gran-caffe', table: 'oro-antico' },
    posillipo: { felt: 'velluto-reale', table: 'tempesta-d-argento' },
    capri: { felt: 'cristallo-blu', table: 'tempesta-d-argento' },
    'san-carlo': { felt: 'seta-cremisi', table: 'palazzo-reale' },
    reggia: { felt: 'oro-e-nero', table: 'corona-del-re' },
    oliva: { felt: 'ulivo-calabrese', table: 'tavolo-della-taverna' },
    arancia: { felt: 'arancia', table: 'tavolo-della-taverna' },
    lavanda: { felt: 'lavanda', table: 'tavolo-della-taverna' },
    corallo: { felt: 'corallo', table: 'tavolo-della-taverna' },
    notte: { felt: 'notte-di-velluto', table: 'tempesta-d-argento' },
    lava: { felt: 'lava', table: 'fiamma-dorata' },
  },
  pattern: {
    nessuno: null,
    filetto: 'verde-tradizionale',
    rosone: 'rosone',
    maiolica: 'maiolica-mediterranea',
    onde: 'onde-del-golfo',
    sole: 'sole-di-vietri',
    vesuvio: 'vesuvio',
    corno: 'cornicello',
    stemma: 'il-tavolo-del-re',
  },
  back: {
    classico: 'classico',
    rosso: 'rosso-tradizionale',
    blu: 'napoli',
    golfo: 'golfo',
    limoni: 'limoni',
    stelle: 'stelle',
    vietri: 'vietri',
    tramonto: 'tramonto',
    tarocco: 'tarocco',
    ottone: 'ottone',
    corona: 'corona-reale',
  },
};

/**
 * Converte oggetti posseduti e in uso del vecchio negozio (id senza posto, posti felt/pattern/back)
 * nel catalogo nuovo. Gli id già nuovi («felt:verde-smeraldo») passano così come sono.
 */
export function migrateCosmetics(owned: readonly string[], equipped: Record<string, string | undefined>): { owned: string[]; equipped: Record<Slot, string> } {
  const out = new Set<string>(STARTER_KEYS);
  for (const id of owned) {
    if (itemByKey(id)) out.add(id);
    else if (LEGACY.felt[id]) {
      out.add(`felt:${LEGACY.felt[id].felt}`);
      out.add(`table:${LEGACY.felt[id].table}`);
    } else if (id in LEGACY.pattern) {
      const p = LEGACY.pattern[id];
      if (p) out.add(`felt:${p}`);
    } else if (LEGACY.back[id]) out.add(`back:${LEGACY.back[id]}`);
  }
  const eq: Record<Slot, string> = { ...DEFAULT_EQUIPPED };
  const oldFelt = equipped.felt;
  const oldPattern = equipped.pattern;
  if (typeof equipped.table === 'string' && itemOf('table', equipped.table)) eq.table = equipped.table;
  else if (oldFelt && LEGACY.felt[oldFelt]) eq.table = LEGACY.felt[oldFelt].table;
  if (oldFelt && itemOf('felt', oldFelt) && !LEGACY.felt[oldFelt]) eq.felt = oldFelt;
  else if (oldPattern && LEGACY.pattern[oldPattern]) eq.felt = LEGACY.pattern[oldPattern]!;
  else if (oldFelt && LEGACY.felt[oldFelt]) eq.felt = LEGACY.felt[oldFelt].felt;
  if (equipped.back && itemOf('back', equipped.back)) eq.back = equipped.back;
  else if (equipped.back && LEGACY.back[equipped.back]) eq.back = LEGACY.back[equipped.back];
  for (const s of SLOTS) if (!out.has(`${s}:${eq[s]}`)) eq[s] = DEFAULT_EQUIPPED[s];
  return { owned: [...out], equipped: eq };
}
