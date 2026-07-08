import { XStack, type XStackProps } from 'tamagui';
import { AppText } from './AppText';
import { a11yState } from './a11y';

type Props = XStackProps & {
  active?: boolean;
  compact?: boolean;
  tone?: 'primary' | 'info';
  children: React.ReactNode;
};

// Pill seleccionable para filtros y selecciones (clientes, repartidores, reportes).
export function Chip({ active = false, compact = false, tone = 'primary', children, ...rest }: Props) {
  const activeColor = tone === 'info' ? '$info' : '$primary';

  return (
    <XStack
      paddingHorizontal={14}
      paddingVertical={compact ? 6 : 8}
      borderRadius={20}
      backgroundColor={active ? activeColor : '$field'}
      borderWidth={1}
      borderColor={active ? activeColor : '$line'}
      cursor="pointer"
      pressStyle={{ opacity: 0.8 }}
      accessibilityRole="button"
      {...a11yState({ selected: active })}
      {...rest}
    >
      <AppText
        fontSize={12.5}
        fontWeight={active ? '700' : '600'}
        color={active ? '#FFFFFF' : '$ink'}
        numberOfLines={1}
      >
        {children}
      </AppText>
    </XStack>
  );
}
