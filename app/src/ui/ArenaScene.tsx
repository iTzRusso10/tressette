// Le illustrazioni delle 30 arene, in cinque mondi (uno per capitolo), in stile flat a piani sovrapposti.
//
// I «borgo» (luoghi di paese, luce calda del pomeriggio), II «circolo» (sale di circoli e palazzi, sera
// dorata), III «reggia» (cristallo, troni e porpora, luce fredda e oro), IV «santuario» (candele, cripte,
// torri, crepuscolo mistico), V «olimpo» (cielo cosmico viola e oro). L'intensità cresce lungo la strada:
// le ultime arene sono le più preziose.
//
// Ogni scena è disegnata in una tela larga 600×200 con il soggetto nel quadrato centrale (x 200…400):
// con preserveAspectRatio "slice" si vede tutta a 3:1 e solo il centro a 1:1. I piani lontani sono
// mescolati con il colore del cielo (profondità atmosferica). Con `dim` ogni colore passa per `night()`:
// la stessa scena, scura e desaturata, come una silhouette notturna. Statica, niente animazioni.
// Le scene stanno in `arene/` (un file per mondo), gli attrezzi comuni in `arene/kit.tsx`.

import { memo, useId } from 'react';
import Svg, { Rect } from 'react-native-svg';
import { BarDelPaese, CaffeDelleCarte, CircoloDegliAmici, LocandaDelRe, PiazzaDelBorgo, TavernaDelMoro } from './arene/borgo';
import { CasinoDiVenezia, CircoloDOro, LoggiaDeiNobili, PalazzoDelleCarte, SalaDeiMaestri, SaloneDeiCampioni } from './arene/circolo';
import { ClubDeiSignori, CorteDeiRe, PalazzoReale, SalaDegliImperatori, SalaDiCristallo, TronoDelleCarte } from './arene/reggia';
import { CriptaDeiMaestri, FortezzaDegliAssi, OlimpoDelleCarte, SalaDegliImmortali, SantuarioDelGioco, TorreDeiCampioni } from './arene/santuario';
import { CoronaDeiTreGiochi, LeggendaVivente, PalazzoDellEternita, RegnoDegliAssi, TronoDegliImmortali, UltimoTavolo } from './arene/olimpo';
import { type Ctx, H, night, type SceneFn, W } from './arene/kit';

export { mix } from './arene/kit';

/** Due colori per scena (cielo e accento), per sfondi e bordi delle card. */
export const ARENA_SKY: Record<string, [string, string]> = {
  // I — il borgo
  'bar-del-paese': ['#E9B67E', '#2E7A5A'],
  'piazza-del-borgo': ['#7FB8E6', '#C8643C'],
  'circolo-degli-amici': ['#E8C894', '#3E7A5E'],
  'taverna-del-moro': ['#6A3420', '#FFC870'],
  'caffe-delle-carte': ['#DEC29E', '#2E5A4A'],
  'locanda-del-re': ['#C89462', '#C8283A'],
  // II — il circolo
  'circolo-d-oro': ['#5A2420', '#E2B456'],
  'sala-dei-maestri': ['#3E1A1E', '#C8507A'],
  'palazzo-delle-carte': ['#E8B47A', '#7A1A2A'],
  'casino-di-venezia': ['#3A2A6E', '#FFA060'],
  'loggia-dei-nobili': ['#C85A7A', '#2E4A7A'],
  'salone-dei-campioni': ['#3A1418', '#E8B44A'],
  // III — la reggia
  'club-dei-signori': ['#1E2E3E', '#F0C858'],
  'sala-di-cristallo': ['#8AA8DC', '#F0C858'],
  'palazzo-reale': ['#6A5A9A', '#7A2E9E'],
  'corte-dei-re': ['#2A1E5A', '#A04AC8'],
  'sala-degli-imperatori': ['#3A1240', '#E8B44A'],
  'trono-delle-carte': ['#0E0A34', '#F0C858'],
  // IV — il santuario
  'santuario-del-gioco': ['#1A1648', '#3EE0D0'],
  'cripta-dei-maestri': ['#0C0A26', '#3EE0D0'],
  'fortezza-degli-assi': ['#3A2470', '#FFB060'],
  'torre-dei-campioni': ['#3A2A78', '#FFC070'],
  'olimpo-delle-carte': ['#C86A8A', '#F2C860'],
  'sala-degli-immortali': ['#120E30', '#5AD8E0'],
  // V — l'olimpo
  'regno-degli-assi': ['#1E0E4A', '#FFD25A'],
  'palazzo-dell-eternita': ['#1E0E4A', '#C8A0FF'],
  'trono-degli-immortali': ['#1E0E4A', '#FFF2B8'],
  'corona-dei-tre-giochi': ['#1E0E4A', '#FF6B9A'],
  'ultimo-tavolo': ['#0A0624', '#FFD25A'],
  'leggenda-vivente': ['#2A0E5A', '#FFD25A'],
};

const SCENES: Record<string, SceneFn> = {
  'bar-del-paese': BarDelPaese,
  'piazza-del-borgo': PiazzaDelBorgo,
  'circolo-degli-amici': CircoloDegliAmici,
  'taverna-del-moro': TavernaDelMoro,
  'caffe-delle-carte': CaffeDelleCarte,
  'locanda-del-re': LocandaDelRe,
  'circolo-d-oro': CircoloDOro,
  'sala-dei-maestri': SalaDeiMaestri,
  'palazzo-delle-carte': PalazzoDelleCarte,
  'casino-di-venezia': CasinoDiVenezia,
  'loggia-dei-nobili': LoggiaDeiNobili,
  'salone-dei-campioni': SaloneDeiCampioni,
  'club-dei-signori': ClubDeiSignori,
  'sala-di-cristallo': SalaDiCristallo,
  'palazzo-reale': PalazzoReale,
  'corte-dei-re': CorteDeiRe,
  'sala-degli-imperatori': SalaDegliImperatori,
  'trono-delle-carte': TronoDelleCarte,
  'santuario-del-gioco': SantuarioDelGioco,
  'cripta-dei-maestri': CriptaDeiMaestri,
  'fortezza-degli-assi': FortezzaDegliAssi,
  'torre-dei-campioni': TorreDeiCampioni,
  'olimpo-delle-carte': OlimpoDelleCarte,
  'sala-degli-immortali': SalaDegliImmortali,
  'regno-degli-assi': RegnoDegliAssi,
  'palazzo-dell-eternita': PalazzoDellEternita,
  'trono-degli-immortali': TronoDegliImmortali,
  'corona-dei-tre-giochi': CoronaDeiTreGiochi,
  'ultimo-tavolo': UltimoTavolo,
  'leggenda-vivente': LeggendaVivente,
};

/**
 * L'illustrazione di un'arena, a riempire width×height (da circa 1:1 a 3:1, il soggetto resta al centro).
 * `dim` per le arene non ancora raggiunte: la stessa scena di notte, scura e desaturata.
 */
export const ArenaScene = memo(function ArenaScene({ id, width, height, dim }: { id: string; width: number; height: number; dim?: boolean }) {
  const uid = 'as' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const Scene = SCENES[id] ?? BarDelPaese;
  const k: Ctx = {
    c: dim ? night : (hex: string) => hex,
    dim: !!dim,
    id: name => `${uid}-${name}`,
    url: name => `url(#${uid}-${name})`,
  };
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
      <Scene k={k} />
      {dim ? <Rect x={0} y={0} width={W} height={H} fill="#0A0618" opacity={0.25} /> : null}
    </Svg>
  );
});
