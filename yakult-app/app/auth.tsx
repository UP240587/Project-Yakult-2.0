import { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Animated,
  useWindowDimensions, StyleSheet, Alert, ActivityIndicator,
  ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../context/AuthContext';

// ── Validaciones ─────────────────────────────────────────
const validarCorreo = (c: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c);
const validarPass   = (p: string): string | null => {
  if (p.length < 8)                          return 'Mínimo 8 caracteres.';
  if (!/[A-Z]/.test(p))                      return 'Al menos una letra mayúscula.';
  if (!/[!@#$%^&*()\-_,.?":{}|<>]/.test(p)) return 'Al menos un carácter especial.';
  return null;
};
const soloLetras = (v: string) => /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(v.trim());

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
    <View style={s.pantalla}>

      {/* ── FONDO: Login (izq) + CTA (der) ── */}
      <View style={s.base}>

        {/* Panel Login */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={s.panelLogin}
        >
          <Text style={s.logo}>Yakult</Text>
          <Text style={s.titulo}>Bienvenido de nuevo</Text>

          {/* Correo */}
          <View style={s.campo}>
            <Text style={s.label}>Correo electrónico</Text>
            <TextInput
              style={[s.input, errL.correo && s.inputErr]}
              placeholder="correo@ejemplo.com"
              value={lCorreo}
              keyboardType="email-address"
              autoCapitalize="none"
              onChangeText={v => {
                setLCorreo(v);
                setErrL(p => ({...p, correo: ''}));
                setLoginError('');
              }}
            />
            {errL.correo ? <Text style={s.err}>{errL.correo}</Text> : null}
          </View>

          {/* Contraseña */}
          <View style={s.campo}>
            <Text style={s.label}>Contraseña</Text>
            <View style={[s.passWrap, errL.pass && s.inputErr]}>
              <TextInput
                style={s.passInput}
                placeholder="••••••••"
                value={lPass}
                secureTextEntry={!lPassVis}
                onChangeText={v => {
                  setLPass(v);
                  setErrL(p => ({...p, pass: ''}));
                  setLoginError('');
                }}
              />
              <TouchableOpacity onPress={() => setLPassVis(!lPassVis)} style={s.eyeBtn}>
                <Text style={s.eye}>{lPassVis ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
            {errL.pass ? <Text style={s.err}>{errL.pass}</Text> : null}
          </View>

          {/* Botón login — deshabilitado si hay error activo */}
          <TouchableOpacity
            style={[s.btnRojo, !!loginError && s.btnDeshabilitado]}
            onPress={handleLogin}
            disabled={guardando || !!loginError}
          >
            {guardando
              ? <ActivityIndicator color="#FFF" />
              : <Text style={s.btnTxt}>Iniciar sesión</Text>
            }
          </TouchableOpacity>

          {/* Error inline de credenciales */}
          {loginError ? (
            <View style={s.errorCard}>
              <Text style={s.errorCardIcono}>⚠️</Text>
              <Text style={s.errorCardTxt}>{loginError}</Text>
            </View>
          ) : null}

        </KeyboardAvoidingView>

        {/* Panel CTA */}
        <TouchableOpacity style={s.panelCTA} onPress={mostrarRegistro} activeOpacity={0.92}>
          <Text style={s.ctaIcono}>👋</Text>
          <Text style={s.ctaTitulo}>¿Nuevo aquí?</Text>
          <Text style={s.ctaDesc}>
            Únete y comienza a gestionar tus ventas de forma rápida y sencilla.
          </Text>
          <View style={s.ctaBtn}>
            <Text style={s.ctaBtnTxt}>Regístrate ya →</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* ── OVERLAY: Registro desliza desde la derecha ── */}
      <Animated.View style={[s.overlay, { transform: [{ translateX: slideAnim }] }]}>
        <ScrollView
          contentContainerStyle={s.registroContenido}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity onPress={mostrarLogin} style={s.backBtn}>
            <Text style={s.backTxt}>← Volver al login</Text>
          </TouchableOpacity>

          <Text style={s.logo}>Yakult</Text>
          <Text style={s.titulo}>Crear cuenta</Text>

          {/* Nombre */}
          <View style={s.campo}>
            <Text style={s.label}>Nombre completo</Text>
            <TextInput
              style={[s.input, errR.nombre && s.inputErr]}
              placeholder="Juan Pérez"
              value={rNombre}
              onChangeText={v => { setRNombre(v); setErrR(p => ({...p, nombre: ''})); }}
            />
            {errR.nombre ? <Text style={s.err}>{errR.nombre}</Text> : null}
          </View>

          {/* Correo registro */}
          <View style={s.campo}>
            <Text style={s.label}>Correo electrónico</Text>
            <TextInput
              style={[s.input, errR.correo && s.inputErr]}
              placeholder="correo@ejemplo.com"
              value={rCorreo}
              keyboardType="email-address"
              autoCapitalize="none"
              onChangeText={v => { setRCorreo(v); setErrR(p => ({...p, correo: ''})); }}
            />
            {errR.correo ? <Text style={s.err}>{errR.correo}</Text> : null}
            <Text style={s.hint}>💡 Usa @upa.edu.mx para obtener rol Master</Text>
          </View>

          {/* Contraseña registro */}
          <View style={s.campo}>
            <Text style={s.label}>Contraseña</Text>
            <View style={[s.passWrap, errR.pass && s.inputErr]}>
              <TextInput
                style={s.passInput}
                placeholder="••••••••"
                value={rPass}
                secureTextEntry={!rPassVis}
                onChangeText={v => { setRPass(v); setErrR(p => ({...p, pass: ''})); }}
              />
              <TouchableOpacity onPress={() => setRPassVis(!rPassVis)} style={s.eyeBtn}>
                <Text style={s.eye}>{rPassVis ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
            {errR.pass ? <Text style={s.err}>{errR.pass}</Text> : null}
            <Text style={s.hint}>Mín. 8 caracteres, una mayúscula y un símbolo</Text>
          </View>

          <TouchableOpacity style={s.btnRojo} onPress={handleRegistro} disabled={guardando}>
            {guardando
              ? <ActivityIndicator color="#FFF" />
              : <Text style={s.btnTxt}>Crear cuenta</Text>
            }
          </TouchableOpacity>

        </ScrollView>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  pantalla:          { flex: 1, overflow: 'hidden' },
  base:              { flex: 1, flexDirection: 'row' },

  panelLogin:        { flex: 1, backgroundColor: '#FFF', padding: 48, justifyContent: 'center', gap: 20 },
  panelCTA:          { flex: 1, backgroundColor: '#E63946', padding: 48, justifyContent: 'center', alignItems: 'center', gap: 20 },
  overlay:           { ...StyleSheet.absoluteFillObject, backgroundColor: '#FFF' },
  registroContenido: { padding: 48, gap: 20, maxWidth: 480, alignSelf: 'center', width: '100%' },

  logo:     { fontSize: 34, fontWeight: '700', color: '#E63946', letterSpacing: 1 },
  titulo:   { fontSize: 20, fontWeight: '600', color: '#1A1A1A', marginBottom: 4 },

  ctaIcono: { fontSize: 52 },
  ctaTitulo:{ fontSize: 30, fontWeight: '700', color: '#FFF', textAlign: 'center' },
  ctaDesc:  { fontSize: 15, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 24 },
  ctaBtn:   { backgroundColor: '#FFF', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 30 },
  ctaBtnTxt:{ color: '#E63946', fontWeight: '700', fontSize: 15 },

  backBtn:  { marginBottom: 8 },
  backTxt:  { color: '#E63946', fontSize: 14, fontWeight: '600' },

  campo:    { gap: 6 },
  label:    { fontSize: 13, fontWeight: '600', color: '#1A1A1A' },
  input:    { backgroundColor: '#F5F5F5', borderRadius: 10, padding: 14, fontSize: 14, borderWidth: 1, borderColor: '#E8E8E8' },
  inputErr: { borderColor: '#E63946', borderWidth: 1.5 },
  passWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 10, borderWidth: 1, borderColor: '#E8E8E8' },
  passInput:{ flex: 1, padding: 14, fontSize: 14 },
  eyeBtn:   { padding: 12 },
  eye:      { fontSize: 18 },
  err:      { fontSize: 11, color: '#E63946' },
  hint:     { fontSize: 11, color: '#9E9E9E' },

  btnRojo:          { backgroundColor: '#E63946', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 4 },
  btnDeshabilitado: { backgroundColor: '#CCCCCC' },
  btnTxt:           { color: '#FFF', fontWeight: '700', fontSize: 15 },

  errorCard:        { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFEBEE', borderRadius: 10, padding: 12, borderLeftWidth: 3, borderLeftColor: '#E63946' },
  errorCardIcono:   { fontSize: 16 },
  errorCardTxt:     { flex: 1, fontSize: 13, color: '#C62828', fontWeight: '500' },
});