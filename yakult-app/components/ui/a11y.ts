import { Platform } from 'react-native';

type A11yState = { selected?: boolean; disabled?: boolean };

// Tamagui v1 no traduce el objeto `accessibilityState` en web (lo pasa crudo al
// DOM y React lo rechaza); ahí usamos los atributos aria-* equivalentes.
// En nativo, `accessibilityState` es la prop correcta de React Native.
export const a11yState = (state: A11yState): Record<string, any> =>
  Platform.OS === 'web'
    ? {
        ...(state.selected !== undefined ? { 'aria-selected': state.selected } : {}),
        ...(state.disabled !== undefined ? { 'aria-disabled': state.disabled } : {}),
      }
    : { accessibilityState: state };
