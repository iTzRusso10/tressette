import { Text as RNText, type TextProps, type TextStyle } from 'react-native';
import { colors, fonts, type } from './theme';

type Variant = 'hero' | 'h1' | 'h2' | 'title' | 'lead' | 'body' | 'small' | 'label' | 'numeral';

const variants: Record<Variant, TextStyle> = {
  hero: { fontFamily: fonts.display, fontSize: type.hero, lineHeight: type.hero * 1.08, color: colors.text, letterSpacing: -1.2 },
  h1: { fontFamily: fonts.display, fontSize: type.h1, lineHeight: type.h1 * 1.12, color: colors.text, letterSpacing: -0.8 },
  h2: { fontFamily: fonts.bold, fontSize: type.h2, lineHeight: type.h2 * 1.2, color: colors.text, letterSpacing: -0.4 },
  title: { fontFamily: fonts.bold, fontSize: type.title, lineHeight: type.title * 1.25, color: colors.text, letterSpacing: -0.2 },
  lead: { fontFamily: fonts.medium, fontSize: type.lead, lineHeight: type.lead * 1.5, color: colors.text },
  body: { fontFamily: fonts.regular, fontSize: type.body, lineHeight: type.body * 1.5, color: colors.textSoft },
  small: { fontFamily: fonts.medium, fontSize: type.small, lineHeight: type.small * 1.4, color: colors.textFaint },
  label: { fontFamily: fonts.semi, fontSize: type.body, lineHeight: type.body * 1.3, color: colors.text },
  numeral: { fontFamily: fonts.display, fontSize: type.h1, lineHeight: type.h1 * 1.05, color: colors.text, fontVariant: ['tabular-nums'] },
};

export function Text({ v = 'body', style, ...rest }: TextProps & { v?: Variant }) {
  // Menus follow the system text size up to a point; the table passes allowFontScaling={false} to keep its fixed layout.
  return <RNText maxFontSizeMultiplier={1.3} {...rest} style={[variants[v], style]} />;
}
