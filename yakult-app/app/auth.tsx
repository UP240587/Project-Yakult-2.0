import { useState, useRef } from 'react';
import {
  Animated, useWindowDimensions, StyleSheet, Alert,
  ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { XStack, YStack } from 'tamagui';
import { useAuth } from '../context/AuthContext';
import { colors } from '../tamagui.config';
import { AppButton, AppText, Field } from '../components/ui';

// ── Validaciones ─────────────────────────────────────────
const validarCorreo = (c: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c);
const validarPass   = (p: string): string | null => {
  if (p.length < 8)                          return 'Mínimo 8 caracteres.';
  if (!/[A-Z]/.test(p))                      return 'Al menos una letra mayúscula.';
  if (!/[!@#$%^&*()\-_,.?":{}|<>]/.test(p)) return 'Al menos un carácter especial.';
  return null;
};
const soloLetras = (v: string) => /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(v.trim());

// Botón "ojo" para mostrar/ocultar contraseña
const EyeToggle = ({ visible, onPress }: { visible: boolean; onPress: () => void }) => (
  <XStack padding={12} cursor="pointer" pressStyle={{ opacity: 0.6 }} onPress={onPress}>
    <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.muted} />
  </XStack>
);

export default function AuthScreen() {
  const { usuario, cargando, login, registro } = useAuth();
  const { width } = useWindowDimensions();
  const slideAnim = useRef(new Animated.Value(width)).current;

  const [guardando,   setGuardando]   = useState(false);
  const [loginError,  setLoginError]  = useState('');

  // Campos login
  const [lCorreo,  setLCorreo]  = useState('');
  const [lPass,    setLPass]    = useState('');
  const [lPassVis, setLPassVis] = useState(false);

  // Campos registro
  const [rNombre,  setRNombre]  = useState('');
  const [rCorreo,  setRCorreo]  = useState('');
  const [rPass,    setRPass]    = useState('');
  const [rPassVis, setRPassVis] = useState(false);

  // Errores de campo
  const [errL, setErrL] = useState<Record<string, string>>({});
  const [errR, setErrR] = useState<Record<string, string>>({});

  if (cargando) return null;
  if (usuario)  return <Redirect href="/(tabs)" />;

  // ── Animaciones ──────────────────────────────────────────
  const mostrarRegistro = () =>
    Animated.spring(slideAnim, {
      toValue: 0, tension: 60, friction: 10, useNativeDriver: true,
    }).start();

  const mostrarLogin = () =>
    Animated.timing(slideAnim, {
      toValue: width, duration: 350, useNativeDriver: true,
    }).start();

  // ── Login ─────────────────────────────────────────────────
  const handleLogin = async () => {
    setLoginError('');
    const e: Record<string, string> = {};
    if (!lCorreo)                     e.correo = 'Ingresa tu correo.';
    else if (!validarCorreo(lCorreo)) e.correo = 'Formato de correo inválido.';
    if (!lPass)                       e.pass   = 'Ingresa tu contraseña.';
    if (Object.keys(e).length) { setErrL(e); return; }

    setGuardando(true);
    const res = await login(lCorreo.trim(), lPass);
    setGuardando(false);
    if (!res.ok) setLoginError(res.error ?? 'Credenciales incorrectas.');
  };

  // ── Registro ──────────────────────────────────────────────
  const handleRegistro = async () => {
    const e: Record<string, string> = {};
    if (!rNombre.trim())              e.nombre = 'Ingresa tu nombre.';
    else if (!soloLetras(rNombre))    e.nombre = 'Solo letras.';
    if (!rCorreo)                     e.correo = 'Ingresa tu correo.';
    else if (!validarCorreo(rCorreo)) e.correo = 'Correo no válido.';
    const pe = validarPass(rPass);
    if (pe) e.pass = pe;
    if (Object.keys(e).length) { setErrR(e); return; }

    setGuardando(true);
    const res = await registro(rNombre.trim(), rCorreo.trim(), rPass);
    setGuardando(false);
    if (!res.ok) Alert.alert('Error al registrarse', res.error);
  };

  return (
    <YStack flex={1} overflow="hidden" backgroundColor="$card">

      {/* ── FONDO: Login (izq) + CTA (der) ── */}
      <XStack flex={1}>

        {/* Panel Login */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={s.panelFlex}
        >
          <YStack flex={1} backgroundColor="$card" padding={48} justifyContent="center" gap={20}>
            <AppText fontSize={34} fontWeight="800" tone="primary" letterSpacing={0.5}>Yakult</AppText>
            <AppText fontSize={20} fontWeight="600" marginBottom={4}>Bienvenido de nuevo</AppText>

            {/* Correo */}
            <Field
              label="Correo electrónico"
              placeholder="correo@ejemplo.com"
              value={lCorreo}
              keyboardType="email-address"
              autoCapitalize="none"
              onChangeText={v => {
                setLCorreo(v);
                setErrL(p => ({...p, correo: ''}));
                setLoginError('');
              }}
              error={errL.correo || undefined}
            />

            {/* Contraseña */}
            <Field
              label="Contraseña"
              placeholder="••••••••"
              value={lPass}
              secureTextEntry={!lPassVis}
              onChangeText={v => {
                setLPass(v);
                setErrL(p => ({...p, pass: ''}));
                setLoginError('');
              }}
              error={errL.pass || undefined}
              derecha={<EyeToggle visible={lPassVis} onPress={() => setLPassVis(!lPassVis)} />}
            />

            {/* Botón login — deshabilitado si hay error activo */}
            <AppButton
              marginTop={4}
              loading={guardando}
              disabled={guardando || !!loginError}
              onPress={handleLogin}
            >
              Iniciar sesión
            </AppButton>

            {/* Error inline de credenciales */}
            {loginError ? (
              <XStack
                alignItems="center"
                gap={8}
                backgroundColor="$dangerSoft"
                borderRadius={10}
                padding={12}
                borderLeftWidth={3}
                borderLeftColor="$primary"
              >
                <Ionicons name="warning" size={16} color={colors.dangerInk} />
                <AppText flex={1} fontSize={13} tone="danger" fontWeight="500">{loginError}</AppText>
              </XStack>
            ) : null}
          </YStack>
        </KeyboardAvoidingView>

        {/* Panel CTA */}
        <YStack
          flex={1}
          backgroundColor="$primary"
          padding={48}
          justifyContent="center"
          alignItems="center"
          gap={20}
          cursor="pointer"
          pressStyle={{ opacity: 0.92 }}
          onPress={mostrarRegistro}
        >
          <YStack
            width={72}
            height={72}
            borderRadius={36}
            backgroundColor="rgba(255,255,255,0.16)"
            alignItems="center"
            justifyContent="center"
          >
            <Ionicons name="person-add" size={32} color="#FFF" />
          </YStack>
          <AppText fontSize={30} fontWeight="800" tone="inverse" textAlign="center">¿Nuevo aquí?</AppText>
          <AppText fontSize={15} color="rgba(255,255,255,0.85)" textAlign="center" lineHeight={24}>
            Únete y comienza a gestionar tus ventas de forma rápida y sencilla.
          </AppText>
          <XStack
            backgroundColor="#FFF"
            paddingHorizontal={28}
            paddingVertical={14}
            borderRadius={30}
            alignItems="center"
            gap={8}
          >
            <AppText tone="primary" fontWeight="700" fontSize={15}>Regístrate ya</AppText>
            <Ionicons name="arrow-forward" size={16} color={colors.primary} />
          </XStack>
        </YStack>
      </XStack>

      {/* ── OVERLAY: Registro desliza desde la derecha ── */}
      <Animated.View style={[s.overlay, { transform: [{ translateX: slideAnim }] }]}>
        <ScrollView
          contentContainerStyle={s.registroContenido}
          keyboardShouldPersistTaps="handled"
        >
          <XStack
            alignSelf="flex-start"
            alignItems="center"
            gap={6}
            marginBottom={8}
            cursor="pointer"
            pressStyle={{ opacity: 0.6 }}
            onPress={mostrarLogin}
          >
            <Ionicons name="arrow-back" size={16} color={colors.primary} />
            <AppText tone="primary" fontSize={14} fontWeight="600">Volver al login</AppText>
          </XStack>

          <AppText fontSize={34} fontWeight="800" tone="primary" letterSpacing={0.5}>Yakult</AppText>
          <AppText fontSize={20} fontWeight="600" marginBottom={4}>Crear cuenta</AppText>

          {/* Nombre */}
          <Field
            label="Nombre completo"
            placeholder="Juan Pérez"
            value={rNombre}
            onChangeText={v => { setRNombre(v); setErrR(p => ({...p, nombre: ''})); }}
            error={errR.nombre || undefined}
          />

          {/* Correo registro */}
          <Field
            label="Correo electrónico"
            placeholder="correo@ejemplo.com"
            value={rCorreo}
            keyboardType="email-address"
            autoCapitalize="none"
            onChangeText={v => { setRCorreo(v); setErrR(p => ({...p, correo: ''})); }}
            error={errR.correo || undefined}
            hint="Usa @upa.edu.mx para obtener rol Master"
          />

          {/* Contraseña registro */}
          <Field
            label="Contraseña"
            placeholder="••••••••"
            value={rPass}
            secureTextEntry={!rPassVis}
            onChangeText={v => { setRPass(v); setErrR(p => ({...p, pass: ''})); }}
            error={errR.pass || undefined}
            hint="Mín. 8 caracteres, una mayúscula y un símbolo"
            derecha={<EyeToggle visible={rPassVis} onPress={() => setRPassVis(!rPassVis)} />}
          />

          <AppButton marginTop={4} loading={guardando} disabled={guardando} onPress={handleRegistro}>
            Crear cuenta
          </AppButton>

        </ScrollView>
      </Animated.View>
    </YStack>
  );
}

// Estilos mínimos para contenedores RN (Animated / KeyboardAvoiding / ScrollView)
const s = StyleSheet.create({
  panelFlex:         { flex: 1 },
  overlay:           { ...StyleSheet.absoluteFillObject, backgroundColor: '#FFF' },
  registroContenido: { padding: 48, gap: 20, maxWidth: 480, alignSelf: 'center', width: '100%' },
});
