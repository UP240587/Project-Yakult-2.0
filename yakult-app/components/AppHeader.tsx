import { XStack, YStack } from 'tamagui';
import ProfileButton from './ProfileButton';
import { AppText } from './ui';

type Props = {
  titulo?:    string;
  subtitulo?: string;
  colorFondo?: string;
  derecha?:   React.ReactNode;
};

export default function AppHeader({ titulo, subtitulo, colorFondo = '#FFF', derecha }: Props) {
  const esColorado = !['#FFF','#FFFFFF','#FAFAFA','white'].includes(colorFondo);

  return (
    <XStack
      backgroundColor={colorFondo}
      paddingTop={52}
      paddingBottom={14}
      paddingHorizontal={16}
      alignItems="center"
      gap={12}
      borderBottomWidth={1}
      borderBottomColor={esColorado ? 'transparent' : '$line'}
    >
      <ProfileButton />
      <YStack flex={1}>
        {titulo ? (
          <AppText fontSize={18} fontWeight="700" color={esColorado ? '#FFF' : '$ink'}>
            {titulo}
          </AppText>
        ) : null}
        {subtitulo ? (
          <AppText fontSize={12} marginTop={2} color={esColorado ? 'rgba(255,255,255,0.8)' : '$muted'}>
            {subtitulo}
          </AppText>
        ) : null}
      </YStack>
      {derecha ? <YStack>{derecha}</YStack> : null}
    </XStack>
  );
}
