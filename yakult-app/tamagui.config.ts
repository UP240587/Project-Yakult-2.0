import { config as configBase } from '@tamagui/config/v3';
import { createFont, createTamagui } from 'tamagui';

// ── Paleta original del proyecto (RNF-46: rojo / blanco / gris / negro) ──
const paleta = {
  primary:     '#E63946',
  primarySoft: '#FDECEE',
  primaryTint: '#FFF7F8',

  bg:    '#F4F5F7',
  card:  '#FFFFFF',
  field: '#F7F8FA',
  line:  '#ECECF1',
  ink:   '#1A1A2E',
  muted: '#8A8F99',

  success:     '#4CAF50',
  successSoft: '#E8F5E9',
  successInk:  '#2E7D32',
  info:        '#2196F3',
  infoSoft:    '#E3F2FD',
  infoInk:     '#1565C0',
  warning:     '#FF9800',
  warningSoft: '#FFF3E0',
  warningInk:  '#E65100',
  danger:      '#E63946',
  dangerSoft:  '#FFEBEE',
  dangerInk:   '#C62828',

  masterSoft: '#FFF3CD',
  masterInk:  '#856404',
  whatsapp:   '#1B8A4B',
  whatsappSoft: '#E7F8EF',
};

// Hex crudos para APIs que no aceptan tokens (Ionicons, tab bar, ActivityIndicator)
export const colors = paleta;

// ── Inter (Google Fonts) cargada vía @expo-google-fonts/inter ──
// `face` mapea cada peso a la familia registrada por expo-font,
// así fontWeight resuelve la variante correcta en nativo y web.
const interFace = {
  400: { normal: 'Inter_400Regular' },
  500: { normal: 'Inter_500Medium' },
  600: { normal: 'Inter_600SemiBold' },
  700: { normal: 'Inter_700Bold' },
  800: { normal: 'Inter_800ExtraBold' },
  900: { normal: 'Inter_900Black' },
} as const;

const bodyFont = createFont({
  ...configBase.fonts.body,
  family: 'Inter_400Regular',
  face: interFace,
});

const headingFont = createFont({
  ...configBase.fonts.heading,
  family: 'Inter_700Bold',
  face: interFace,
});

export const tamaguiConfig = createTamagui({
  ...configBase,
  fonts: {
    body: bodyFont,
    heading: headingFont,
  },
  tokens: {
    ...configBase.tokens,
    color: {
      ...configBase.tokens.color,
      ...paleta,
    },
  },
});

export type AppTamaguiConfig = typeof tamaguiConfig;

declare module 'tamagui' {
  interface TamaguiCustomConfig extends AppTamaguiConfig {}
}

export default tamaguiConfig;
