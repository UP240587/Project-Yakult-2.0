import { Ionicons } from '@expo/vector-icons';
import { XStack, YStack } from 'tamagui';
import { colors } from '../../tamagui.config';
import { AppText } from './AppText';
import type { IconName } from './AppButton';

type Props = {
  icon: IconName;
  titulo: string;
  paso?: string;
  right?: React.ReactNode;
};

// Encabezado de sección con icono en contenedor suave (patrón de Reportes).
export function SectionHeader({ icon, titulo, paso, right }: Props) {
  return (
    <XStack alignItems="center" gap={10}>
      <YStack
        width={32}
        height={32}
        borderRadius={10}
        backgroundColor="$primarySoft"
        alignItems="center"
        justifyContent="center"
      >
        <Ionicons name={icon} size={16} color={colors.primary} />
      </YStack>
      <YStack flex={1}>
        {paso ? (
          <AppText fontSize={10} tone="primary" fontWeight="800" letterSpacing={0.5} textTransform="uppercase">
            {paso}
          </AppText>
        ) : null}
        <AppText fontSize={15} fontWeight="800">{titulo}</AppText>
      </YStack>
      {right}
    </XStack>
  );
}
