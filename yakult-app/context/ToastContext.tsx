import React, { createContext, useContext, useState, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { XStack } from 'tamagui';
import { colors } from '../tamagui.config';
import { AppText, type IconName } from '../components/ui';

type Tipo = 'success' | 'error' | 'info';
type Ctx = { mostrar: (mensaje: string, tipo?: Tipo) => void };

const ToastCtx = createContext<Ctx | null>(null);

const META: Record<Tipo, { color: string; icon: IconName }> = {
  success: { color: colors.success, icon: 'checkmark-circle' },
  error:   { color: colors.danger,  icon: 'alert-circle' },
  info:    { color: colors.info,    icon: 'information-circle' },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [tipo, setTipo]       = useState<Tipo>('success');
  const translateY = useRef(new Animated.Value(120)).current;
  const opacity    = useRef(new Animated.Value(0)).current;

  const ocultar = () => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: 120, duration: 250, useNativeDriver: true }),
      Animated.timing(opacity,    { toValue: 0,   duration: 250, useNativeDriver: true }),
    ]).start(() => setVisible(false));
  };

  const mostrar = (msg: string, t: Tipo = 'success') => {
    setMensaje(msg); setTipo(t); setVisible(true);
    translateY.setValue(120); opacity.setValue(0);
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, tension: 60, friction: 9, useNativeDriver: true }),
      Animated.timing(opacity,    { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
    setTimeout(ocultar, 3500);
  };

  const meta = META[tipo];

  return (
    <ToastCtx.Provider value={{ mostrar }}>
      {children}
      {visible && (
        <Animated.View pointerEvents="box-none" style={[s.wrap, { opacity, transform: [{ translateY }] }]}>
          <XStack
            alignItems="center"
            gap={12}
            backgroundColor="$card"
            borderRadius={14}
            paddingVertical={14}
            paddingHorizontal={18}
            borderLeftWidth={4}
            borderLeftColor={meta.color}
            maxWidth={480}
            width="100%"
            cursor="pointer"
            elevation={6}
            shadowColor="#1A1A2E"
            shadowOpacity={0.15}
            shadowRadius={12}
            shadowOffset={{ width: 0, height: 3 }}
            onPress={ocultar}
          >
            <Ionicons name={meta.icon} size={22} color={meta.color} />
            <AppText flex={1} fontSize={14} fontWeight="500" numberOfLines={2}>{mensaje}</AppText>
          </XStack>
        </Animated.View>
      )}
    </ToastCtx.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider');
  return ctx;
};

const s = StyleSheet.create({
  wrap: { position: 'absolute', bottom: 80, left: 16, right: 16, alignItems: 'center', zIndex: 9999 },
});
