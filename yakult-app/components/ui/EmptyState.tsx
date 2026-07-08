import { Ionicons } from '@expo/vector-icons';
import { Spinner, YStack } from 'tamagui';
import { colors } from '../../tamagui.config';
import { AppText } from './AppText';
import type { IconName } from './AppButton';

type Props = {
  icon?: IconName;
  mensaje: string;
  detalle?: string;
};

// Estado vacío centrado con icono suave.
export function EmptyState({ icon = 'file-tray-outline', mensaje, detalle }: Props) {
  return (
    <YStack alignItems="center" gap={10} paddingVertical={36}>
      <YStack
        width={56}
        height={56}
        borderRadius={28}
        backgroundColor="$field"
        alignItems="center"
        justifyContent="center"
      >
        <Ionicons name={icon} size={26} color={colors.muted} />
      </YStack>
      <AppText tone="muted" fontSize={13} textAlign="center">{mensaje}</AppText>
      {detalle ? <AppText tone="muted" fontSize={11.5} textAlign="center">{detalle}</AppText> : null}
    </YStack>
  );
}

// Spinner centrado estándar mientras carga una pantalla.
export function Loading() {
  return <Spinner size="large" color={colors.primary} marginTop={40} />;
}
