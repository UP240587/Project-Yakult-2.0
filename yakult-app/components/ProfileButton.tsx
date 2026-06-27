import { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Alert, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { confirmar } from '../utils/confirmar';

export default function ProfileButton() {
  const [abierto, setAbierto] = useState(false);
  const { usuario, logout }   = useAuth();
  const router                = useRouter();

  const inicial  = usuario?.nombre?.[0]?.toUpperCase() ?? '?';
  const esMaster = usuario?.rol === 'Master';

  const navegar = (ruta: any) => { setAbierto(false); router.push(ruta); };

  const cerrarSesion = () => {
    setAbierto(false);
    confirmar('Cerrar sesión', '¿Confirmas cerrar sesión?', async () => {
      await logout();
      router.replace('/auth');
    });
  };

  const irAdmin = () => {
    if (!esMaster) {
      Alert.alert('🔒 Acceso restringido', 'Solo los usuarios Master pueden acceder al panel de administración.');
      return;
    }
    navegar('/(tabs)/admin');
  };

  const irDashboard = () => {
    if (!esMaster) {
      Alert.alert('🔒 Acceso restringido', 'Solo los usuarios Master pueden acceder al dashboard.');
      return;
    }
    navegar('/(tabs)/dashboard');
  };

  return (
    <View style={s.container}>
      <TouchableOpacity style={s.circulo} onPress={() => setAbierto(true)} activeOpacity={0.8}>
        <Text style={s.inicial}>{inicial}</Text>
      </TouchableOpacity>
      <Text style={s.rolLabel}>{esMaster ? '⭐ Master' : 'Promotor'}</Text>

      <Modal visible={abierto} transparent animationType="fade" onRequestClose={() => setAbierto(false)}>
        <Pressable style={s.overlay} onPress={() => setAbierto(false)}>
          <Pressable style={s.menu} onPress={e => e.stopPropagation()}>

            {/* Info usuario */}
            <View style={s.menuHeader}>
              <View style={s.menuAvatar}><Text style={s.menuAvatarTxt}>{inicial}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={s.menuNombre} numberOfLines={1}>{usuario?.nombre}</Text>
                <Text style={s.menuCorreo} numberOfLines={1}>{usuario?.correo}</Text>
              </View>
            </View>

            <View style={s.divider} />

            {/* Rol */}
            <View style={s.item}>
              <Text style={s.itemIcono}>👤</Text>
              <Text style={s.itemTxt}>Rol</Text>
              <View style={[s.badge, esMaster ? s.badgeM : s.badgeP]}>
                <Text style={[s.badgeTxt, esMaster ? s.badgeMTxt : s.badgePTxt]}>
                  {esMaster ? '⭐ Master' : 'Promotor'}
                </Text>
              </View>
            </View>

            {/* ── Mi Perfil (nuevo) ── */}
            <TouchableOpacity style={s.item} onPress={() => navegar('/(tabs)/perfil')}>
              <Text style={s.itemIcono}>🪪</Text>
              <Text style={s.itemTxt}>Mi Perfil</Text>
              <Text style={s.chevron}>›</Text>
            </TouchableOpacity>

            {/* Dashboard de estadísticas (solo Master) */}
            <TouchableOpacity style={s.item} onPress={irDashboard}>
              <Text style={s.itemIcono}>{esMaster ? '📊' : '🔒'}</Text>
              <Text style={[s.itemTxt, !esMaster && s.itemDeshabilitado]}>Dashboard</Text>
              {!esMaster && <Text style={s.lockHint}>Solo Masters</Text>}
            </TouchableOpacity>

            {/* Administrador */}
            <TouchableOpacity style={s.item} onPress={irAdmin}>
              <Text style={s.itemIcono}>{esMaster ? '⚙️' : '🔒'}</Text>
              <Text style={[s.itemTxt, !esMaster && s.itemDeshabilitado]}>Administrador</Text>
              {!esMaster && <Text style={s.lockHint}>Solo Masters</Text>}
            </TouchableOpacity>

            {/* Ayuda */}
            <TouchableOpacity style={s.item} onPress={() => { setAbierto(false); Alert.alert('Ayuda', 'Soporte: soporte@yakult-ags.mx'); }}>
              <Text style={s.itemIcono}>❓</Text>
              <Text style={s.itemTxt}>Ayuda</Text>
            </TouchableOpacity>

            <View style={s.divider} />

            {/* Cerrar sesión */}
            <TouchableOpacity style={s.item} onPress={cerrarSesion}>
              <Text style={s.itemIcono}>🚪</Text>
              <Text style={[s.itemTxt, { color: '#E63946' }]}>Cerrar sesión</Text>
            </TouchableOpacity>

          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container:     { alignItems: 'center' },
  circulo:       { width: 42, height: 42, borderRadius: 21, backgroundColor: '#E63946', alignItems: 'center', justifyContent: 'center', elevation: 3 },
  inicial:       { color: '#FFF', fontWeight: '700', fontSize: 18 },
  rolLabel:      { fontSize: 9, color: '#9E9E9E', marginTop: 3, fontWeight: '600', letterSpacing: 0.3 },

  overlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-start', alignItems: 'flex-start', paddingTop: 90, paddingLeft: 12 },
  menu:          { backgroundColor: '#FFF', borderRadius: 16, width: 290, elevation: 10, overflow: 'hidden' },

  menuHeader:    { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, backgroundColor: '#FAFAFA' },
  menuAvatar:    { width: 46, height: 46, borderRadius: 23, backgroundColor: '#E63946', alignItems: 'center', justifyContent: 'center' },
  menuAvatarTxt: { color: '#FFF', fontWeight: '700', fontSize: 20 },
  menuNombre:    { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  menuCorreo:    { fontSize: 12, color: '#9E9E9E', marginTop: 2 },

  divider:       { height: 1, backgroundColor: '#F0F0F0' },

  item:          { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  itemIcono:     { fontSize: 18, width: 24, textAlign: 'center' },
  itemTxt:       { flex: 1, fontSize: 14, color: '#1A1A1A' },
  itemDeshabilitado: { color: '#BBBBBB' },
  chevron:       { fontSize: 18, color: '#C0C0C0' },
  lockHint:      { fontSize: 11, color: '#BBBBBB' },

  badge:    { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeM:   { backgroundColor: '#FFF3CD' }, badgeMTxt: { color: '#856404' },
  badgeP:   { backgroundColor: '#E8F5E9' }, badgePTxt: { color: '#2E7D32' },
  badgeTxt: { fontSize: 11, fontWeight: '700' },
});