import { Alert, Platform } from 'react-native';

export const confirmar = (titulo: string, mensaje: string, onConfirm: () => void) => {
  if (Platform.OS === 'web') {
    if (window.confirm(`${titulo}\n${mensaje}`)) onConfirm();
  } else {
    Alert.alert(titulo, mensaje, [
      { text: 'Cancelar', style: 'cancel' },
      { text: titulo, style: 'destructive', onPress: onConfirm },
    ]);
  }
};