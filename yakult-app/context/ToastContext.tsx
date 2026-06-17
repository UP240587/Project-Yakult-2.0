import React, { createContext, useContext, useState, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity } from 'react-native';

type Tipo = 'success' | 'error' | 'info';
type Ctx = { mostrar: (mensaje: string, tipo?: Tipo) => void };

const ToastCtx = createContext<Ctx | null>(null);

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

  const color = tipo === 'success' ? '#4CAF50' : tipo === 'error' ? '#E63946' : '#2196F3';
  const icono = tipo === 'success' ? '✅'       : tipo === 'error' ? '⚠️'      : 'ℹ️';

  return (
    <ToastCtx.Provider value={{ mostrar }}>
      {children}
      {visible && (
        <Animated.View pointerEvents="box-none" style={[s.wrap, { opacity, transform: [{ translateY }] }]}>
          <TouchableOpacity activeOpacity={0.9} onPress={ocultar} style={[s.toast, { borderLeftColor: color }]}>
            <Text style={s.icono}>{icono}</Text>
            <Text style={s.msg} numberOfLines={2}>{mensaje}</Text>
          </TouchableOpacity>
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
  wrap:  { position: 'absolute', bottom: 80, left: 16, right: 16, alignItems: 'center', zIndex: 9999 },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFF', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 18, borderLeftWidth: 4, elevation: 6, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, maxWidth: 480, width: '100%' },
  icono: { fontSize: 22 },
  msg:   { flex: 1, fontSize: 14, color: '#1A1A1A', fontWeight: '500' },
});