import { StyleSheet } from 'react-native';

/**
 * Ledger Pro mobile · "Ink & Lime"
 * The night ledger: petrol-black paper, pale ink, a lime pen.
 * Keep in sync with `tailwind.config.js` and the web `index.css` tokens.
 */
export const colors = {
  bg: '#0A1311',
  bgDeep: '#070E0C',
  surface: '#0F1B18',
  surface2: '#16241F',
  surface3: '#1D2F29',
  border: '#1F3129',
  borderStrong: '#2C433B',

  ink: '#E7F0EB',
  inkMuted: '#9FB4AC',
  inkFaint: '#7C948C',
  inkGhost: '#5F776F',

  primary: '#C6F13B',
  primaryDeep: '#A8D622',
  onPrimary: '#0A1311',
  primarySoft: 'rgba(198, 241, 59, 0.12)',

  positive: '#3DD68C',
  positiveSoft: 'rgba(61, 214, 140, 0.14)',
  negative: '#FF6B81',
  negativeSoft: 'rgba(255, 107, 129, 0.14)',
  warning: '#F2C14E',
  warningSoft: 'rgba(242, 193, 78, 0.14)',
  info: '#5AA9F5',
  infoSoft: 'rgba(90, 169, 245, 0.14)',
  violet: '#A79BFF',
  violetSoft: 'rgba(167, 155, 255, 0.14)',
  pink: '#F072B6',
  teal: '#2FC7B0',
  orange: '#FF9A5C',
  white: '#FFFFFF',
} as const;

export const fonts = {
  display: 'InstrumentSerif_400Regular',
  displayItalic: 'InstrumentSerif_400Regular_Italic',
  sans: 'InstrumentSans_400Regular',
  sansMedium: 'InstrumentSans_500Medium',
  sansSemiBold: 'InstrumentSans_600SemiBold',
  sansBold: 'InstrumentSans_700Bold',
  mono: 'DMMono_400Regular',
  monoMedium: 'DMMono_500Medium',
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 26,
  pill: 999,
} as const;

/** Reusable text styles. Spread them and override size/colour as needed. */
export const text = StyleSheet.create({
  eyebrow: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.inkFaint,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 30,
    lineHeight: 34,
    color: colors.ink,
    letterSpacing: -0.4,
  },
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: 22,
    lineHeight: 26,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  // Money is set in the sans at semibold: the serif's condensed numerals look stretched at size.
  figure: {
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  body: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.ink,
  },
  bodyMuted: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.inkMuted,
  },
  label: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 14,
    color: colors.ink,
  },
  mono: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.inkMuted,
    fontVariant: ['tabular-nums'],
  },
});

export const shadow = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  glow: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 10,
  },
} as const;

/** Spacing between the hairlines that make a card read as ledger paper. */
export const LEDGER_RULE_GAP = 28;
