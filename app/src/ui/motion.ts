import { Easing } from 'react-native-reanimated';

/**
 * One motion language for the whole app (ui-ux-pro-max: easing, exit-faster-than-enter, motion-consistency;
 * project rule: no bounce, no overshoot). Things arrive decelerating and leave accelerating; nothing
 * goes past its place and comes back.
 */
export const ease = {
  /** Arriving: fast start, soft landing. */
  in: Easing.out(Easing.cubic),
  /** Leaving: soft start, quick exit. */
  out: Easing.in(Easing.cubic),
  /** Moving between two places on screen. */
  move: Easing.inOut(Easing.cubic),
};

export const dur = {
  /** Press feedback. */
  press: 110,
  /** Small state changes: chips, toggles, highlights. */
  quick: 180,
  /** Panels and notices entering. */
  enter: 280,
  /** Panels and notices leaving (about 65% of entering). */
  exit: 180,
  /** A card moving on the table. */
  card: 380,
};
