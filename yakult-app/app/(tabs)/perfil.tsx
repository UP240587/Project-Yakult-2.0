import { YStack } from 'tamagui';
import AppHeader from '../../components/AppHeader';
import { AppText, EmptyState, Screen } from '../../components/ui';

const TITULO = 'Perfil';

export default function PerfilScreen() {
  return (
    <Screen>
      <AppHeader titulo="Perfil" />

      <YStack flex={1} alignItems="center" justifyContent="center" gap={4}>
        <AppText fontSize={24} fontWeight="700">{TITULO}</AppText>
        <EmptyState icon="id-card-outline" mensaje="Próximamente" />
      </YStack>
    </Screen>
  );
}
