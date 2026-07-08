import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Input, XStack, YStack, type InputProps } from 'tamagui';
import { colors } from '../../tamagui.config';
import { AppText } from './AppText';

type Props = InputProps & {
  label?: string;
  hint?: string;
  error?: string;
  izquierda?: React.ReactNode;
  derecha?: React.ReactNode;
};

// Campo de formulario: label + input + hint/error.
// Pasa intactas todas las props de TextInput (value, onChangeText, keyboardType,
// secureTextEntry, maxLength, etc.) y encadena onFocus/onBlur para el anillo de foco.
export function Field({ label, hint, error, izquierda, derecha, onFocus, onBlur, ...inputProps }: Props) {
  const [focused, setFocused] = useState(false);
  const borderColor = error ? colors.danger : focused ? colors.primary : colors.line;

  return (
    <YStack gap={6}>
      {label ? <AppText fontSize={13} fontWeight="600">{label}</AppText> : null}
      <XStack
        alignItems="center"
        backgroundColor="$field"
        borderRadius={12}
        borderWidth={error ? 1.5 : 1}
        borderColor={borderColor}
      >
        {izquierda}
        <Input
          unstyled
          flex={1}
          fontFamily="$body"
          fontSize={14}
          color="$ink"
          paddingHorizontal={14}
          paddingVertical={12}
          outlineWidth={0}
          placeholderTextColor={colors.muted}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          {...inputProps}
        />
        {derecha}
      </XStack>
      {error ? (
        <XStack alignItems="center" gap={4}>
          <Ionicons name="alert-circle" size={13} color={colors.danger} />
          <AppText fontSize={11.5} tone="danger" flex={1}>{error}</AppText>
        </XStack>
      ) : hint ? (
        <AppText fontSize={11.5} tone="muted">{hint}</AppText>
      ) : null}
    </YStack>
  );
}
