import { Ionicons } from '@expo/vector-icons';
import { Spinner, XStack, type XStackProps } from 'tamagui';
import { colors } from '../../tamagui.config';
import { AppText } from './AppText';
import { a11yState } from './a11y';

export type IconName = keyof typeof Ionicons.glyphMap;

type Variant = 'primary' | 'secondary' | 'ghost' | 'soft' | 'success' | 'solidSuccess' | 'info' | 'whatsapp' | 'danger';
type Size = 'sm' | 'md';

type VariantStyle = { bg: string; fg: string; borderColor?: string };

const VARIANTS: Record<Variant, VariantStyle> = {
  primary:   { bg: colors.primary,      fg: '#FFFFFF' },
  secondary: { bg: colors.card,         fg: colors.ink, borderColor: colors.line },
  ghost:     { bg: 'transparent',       fg: colors.muted },
  soft:      { bg: colors.primarySoft,  fg: colors.primary },
  success:      { bg: colors.successSoft, fg: colors.successInk },
  solidSuccess: { bg: colors.success,     fg: '#FFFFFF' },
  info:      { bg: colors.infoSoft,     fg: colors.infoInk },
  whatsapp:  { bg: colors.whatsappSoft, fg: colors.whatsapp },
  danger:    { bg: colors.dangerSoft,   fg: colors.dangerInk },
};

type Props = XStackProps & {
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
};

// Botón único de la app: mismas props de evento que TouchableOpacity (onPress, disabled).
export function AppButton({
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  children,
  onPress,
  ...rest
}: Props) {
  const v = VARIANTS[variant];
  const bloqueado = disabled || loading;

  return (
    <XStack
      alignItems="center"
      justifyContent="center"
      gap={8}
      borderRadius={size === 'md' ? 12 : 10}
      paddingVertical={size === 'md' ? 13 : 8}
      paddingHorizontal={size === 'md' ? 18 : 12}
      backgroundColor={v.bg}
      borderWidth={v.borderColor ? 1 : 0}
      borderColor={v.borderColor}
      opacity={disabled && !loading ? 0.5 : 1}
      cursor={bloqueado ? 'default' : 'pointer'}
      pressStyle={bloqueado ? undefined : { opacity: 0.8 }}
      accessibilityRole="button"
      {...a11yState({ disabled: bloqueado })}
      onPress={bloqueado ? undefined : onPress}
      {...rest}
    >
      {loading ? (
        <Spinner size="small" color={v.fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={size === 'md' ? 17 : 14} color={v.fg} />}
          {children != null && (
            <AppText
              color={v.fg}
              fontWeight="700"
              fontSize={size === 'md' ? 15 : 12.5}
              numberOfLines={1}
            >
              {children}
            </AppText>
          )}
        </>
      )}
    </XStack>
  );
}
