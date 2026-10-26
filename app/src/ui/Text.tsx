import { Text as RNText, type TextProps, type TextStyle } from 'react-native';
import { colors, fonts, type } from './theme';

type Variant = 'hero' | 'h1' | 'h2' | 'title' | 'lead' | 'body' | 'small' | 'label' | 'numeral';

const variants: Record<Variant, TextStyle> = {
  hero: { fontFamily: fonts.display, fontSize: type.hero, lineHeight: type.hero * 1.05, color: colors.marmo, letterSpacing: -0.5 },
  h1: { fontFamily: fonts.display, fontSize: type.h1, lineHeight: type.h1 * 1.1, color: colors.marmo, letterSpacing: -0.3 },
  h2: { fontFamily: fonts.display, fontSize: type.h2, lineHeight: type.h2 * 1.15, color: colors.marmo },
  title: { fontFamily: fonts.uiBold, fontSize: type.title, lineHeight: type.title * 1.25, color: colors.marmo },
  lead: { fontFamily: fonts.ui, fontSize: type.lead, lineHeight: type.lead * 1.4, color: colors.marmo },
  body: { fontFamily: fonts.uiRegular, fontSize: type.body, lineHeight: type.body * 1.45, color: colors.marmoTenue },
  small: { fontFamily: fonts.ui, fontSize: type.small, lineHeight: type.small * 1.35, color: colors.salvia },
  label: { fontFamily: fonts.uiSemi, fontSize: type.body, lineHeight: type.body * 1.3, color: colors.marmo },
  numeral: { fontFamily: fonts.display, fontSize: type.h1, lineHeight: type.h1 * 1.05, color: colors.marmo, fontVariant: ['lining-nums', 'tabular-nums'] },
};

export function Text({ v = 'body', style, ...rest }: TextProps & { v?: Variant }) {
  // Menus follow the system text size up to a point; the table passes allowFontScaling={false} to keep its fixed layout.
  return <RNText maxFontSizeMultiplier={1.3} {...rest} style={[variants[v], style]} />;
}
