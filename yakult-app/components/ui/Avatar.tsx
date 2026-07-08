import { YStack, type YStackProps } from 'tamagui';
import { AppText } from './AppText';

type Props = YStackProps & {
  /** Texto a mostrar (normalmente la inicial del nombre). */
  inicial: string;
  size?: number;
  color?: string;
};

// Avatar circular con inicial, usado en headers, tablas y menú de perfil.
export function Avatar({ inicial, size = 34, color = '$primary', ...rest }: Props) {
  return (
    <YStack
      width={size}
      height={size}
      borderRadius={size / 2}
      backgroundColor={color}
      alignItems="center"
      justifyContent="center"
      {...rest}
    >
      <AppText color="#FFFFFF" fontWeight="700" fontSize={size * 0.42}>
        {inicial}
      </AppText>
    </YStack>
  );
}
