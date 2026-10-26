import type { GameId } from '@/engine';

export interface RuleSection {
  title: string;
  text: string;
  /** Card strength, strongest first (ranks 1..10). */
  ranks?: number[];
  ranksNote?: string;
}

export const RULES: Record<GameId, RuleSection[]> = {
  tressette: [
    {
      title: 'Forza delle carte',
      ranks: [3, 2, 1, 10, 9, 8, 7, 6, 5, 4],
      ranksNote: 'Dalla più forte. 1 è l’Asso, 8 il Fante, 9 il Cavallo, 10 il Re.',
      text: 'Non c’è briscola. Chi apre sceglie il seme e gli altri devono rispondere a seme. Se non ce l’hai, giochi la carta che vuoi, ma non prendi. Prende la carta più forte del seme uscito.',
    },
    {
      title: 'Punti',
      text: 'L’Asso vale 1 punto. Tre, Due, Re, Cavallo e Fante valgono ⅓ ciascuno (tre figure fanno un punto). Le altre carte non valgono niente. Chi prende l’ultima mano guadagna 1 punto. In ogni mano ci sono 11 punti; i terzi avanzati non contano.',
    },
    {
      title: 'In due',
      text: 'Dieci carte a testa. Dopo ogni presa si pesca dal mazzo, prima chi ha preso. Le carte pescate si mostrano all’avversario.',
    },
    {
      title: 'In quattro',
      text: 'A coppie, il compagno ti sta di fronte. Si gioca in senso antiorario: dopo di te tocca a chi sta alla tua destra. Chi apre può fare un segnale al compagno: Busso (gioca la tua più forte e ritorna il seme), Striscio (ne ho tante di questo seme), Volo (è l’ultima carta che ho di questo seme).',
    },
    {
      title: 'Accusi',
      text: 'A inizio mano si dichiarano: la Napoletana (Asso, Due e Tre dello stesso seme) vale 3 punti; tre Assi, tre Due o tre Tre valgono 3 punti, tutti e quattro valgono 4.',
    },
    {
      title: 'A perdere',
      text: 'In due o in quattro, ognuno per sé, con le stesse regole di presa; in due si pesca dal mazzo dopo ogni presa. L’Asso di bastoni vale 11 punti, quindi in ogni mano ce ne sono 21. Conviene liberarsi delle carte forti e degli Assi, soprattutto di quello di bastoni. Chi arriva a 31 perde la partita; vince chi ha meno punti.',
    },
    {
      title: 'Cappotto',
      text: 'Solo nella partita a perdere: se in una mano un giocatore prende tutti i punti, compresa l’ultima presa, e gli altri restano a zero, vince subito la partita. Si può disattivare prima di iniziare.',
    },
  ],
  briscola: [
    {
      title: 'Lo scopo',
      text: 'Fare più di 60 punti sui 120 del mazzo. Chi vince la mano guadagna una partita; a 60 pari nessuno.',
    },
    {
      title: 'Forza e punti',
      ranks: [1, 3, 10, 9, 8, 7, 6, 5, 4, 2],
      ranksNote: 'Dalla più forte.',
      text: 'Asso 11 punti, Tre 10, Re 4, Cavallo 3, Fante 2. Le altre carte non valgono niente.',
    },
    {
      title: 'La briscola',
      text: 'Si danno tre carte a testa e si scopre una carta: il suo seme è la briscola e comanda su tutti gli altri. La carta scoperta resta sotto il mazzo e la pesca l’ultimo.',
    },
    {
      title: 'Come si prende',
      text: 'Non c’è obbligo di rispondere a seme. Prende la briscola più alta; se non ci sono briscole, la carta più alta del seme uscito per primo. Dopo ogni presa si pesca una carta, prima chi ha preso.',
    },
    { title: 'In quattro', text: 'A coppie, col compagno di fronte. I punti della coppia si sommano.' },
  ],
  scopa: [
    {
      title: 'Lo scopo',
      text: 'Prendere più carte possibile dal tavolo e fare scope. Si gioca fino a 11 punti (o 16, 21).',
    },
    {
      title: 'Il valore delle carte',
      text: 'Ogni carta vale il suo numero: Asso 1, poi 2 fino a 7, Fante 8, Cavallo 9, Re 10.',
    },
    {
      title: 'Come si prende',
      text: 'Si danno tre carte a testa e quattro vanno in tavola. Al tuo turno giochi una carta: prendi la carta in tavola con lo stesso valore, oppure più carte la cui somma fa quel valore. Se c’è una carta uguale, devi prendere quella. Se non puoi prendere, la carta resta in tavola.',
    },
    {
      title: 'Scopa',
      text: 'Se prendi tutte le carte del tavolo fai scopa: un punto. All’ultima giocata della mano la scopa non vale. Le carte rimaste alla fine vanno a chi ha preso per ultimo.',
    },
    {
      title: 'I punti della mano',
      text: 'Un punto per ogni scopa, più un punto a testa per: più carte, più denari, il Settebello (il 7 di denari) e la Primiera (la somma più alta delle carte migliori per seme: 7 vale 21, 6 vale 18, Asso 16, 5 vale 15, 4 vale 14, 3 vale 13, 2 vale 12, figure 10).',
    },
    { title: 'In quattro', text: 'A coppie, col compagno di fronte: carte e scope della coppia si sommano.' },
  ],
};
