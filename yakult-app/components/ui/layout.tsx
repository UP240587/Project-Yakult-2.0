import { styled, YStack } from 'tamagui';

// Contenedor raíz de cada pantalla.
export const Screen = styled(YStack, {
  name: 'Screen',
  flex: 1,
  backgroundColor: '$bg',
});

// Tarjeta estilo Material 3: radio amplio y sombra suave.
export const Card = styled(YStack, {
  name: 'Card',
  backgroundColor: '$card',
  borderRadius: 16,
  padding: 16,
  gap: 12,
  shadowColor: '#1A1A2E',
  shadowOpacity: 0.06,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
});
