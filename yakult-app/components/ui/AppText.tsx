import { styled, Text } from 'tamagui';

// Texto base de la app: Inter + tinta por defecto.
// El peso (fontWeight) resuelve automáticamente la variante de Inter vía `face`.
export const AppText = styled(Text, {
  name: 'AppText',
  fontFamily: '$body',
  fontSize: 14,
  color: '$ink',

  variants: {
    tone: {
      muted:   { color: '$muted' },
      primary: { color: '$primary' },
      inverse: { color: '#FFFFFF' },
      danger:  { color: '$dangerInk' },
    },
  } as const,
});
