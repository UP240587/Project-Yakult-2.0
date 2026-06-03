import { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Redirect, useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { AuthDB } from '../../services/db';
import AppHeader from '../../components/AppHeader';
import { confirmar } from '../../utils/confirmar';

type Usuario = { id: number; nombre: string; correo: string; rol: 'Master'|'Promotor'; activo: boolean };

export default function AdminScreen() {
  const { usuario }           = useAuth();
  const [lista,   setLista]   = useState<Usuario[]>([]);
  const [cargando,setCargando]= useState(true);

  // Solo Masters pueden ver esta pantalla
  if (usuario?.rol !== 'Master') return <Redirect href="/(tabs)" />;

  useFocusEffect(useCallback(() => { cargar(); }, []));

  const cargar = async () => {
    setCargando(true);
    setLista(await AuthDB.getUsuarios());
    setCargando(false);
  };

  const toggleActivo = async (u: Usuario) => {
    await AuthDB.editarUsuario(u.id, { activo: !u.activo });
    await cargar();
  };

  const toggleMaster = (u: Usuario) => {
    if (u.id === usuario?.id) { Alert.alert('Error', 'No puedes modificar tu propio rol.'); return; }
    const nuevoRol = u.rol === 'Master' ? 'Promotor' : 'Master';
    confirmar(
      nuevoRol === 'Master' ? 'Asignar Master' : 'Quitar Master',
      `¿${nuevoRol === 'Master' ? 'Dar rol Master a' : 'Quitar Master a'} "${u.nombre}"?`,
      async () => { await AuthDB.toggleMaster(u.id, nuevoRol); await cargar(); }
    );
  };

  const eliminar = (u: Usuario) => {
    if (u.id === usuario?.id) { Alert.alert('Error', 'No puedes eliminarte a ti mismo.'); return; }
    confirmar('Eliminar', `¿Eliminar a "${u.nombre}"?`, async () => {
      await AuthDB.eliminarUsuario(u.id);
      await cargar();
    });
  };

  return (
    <View style={s.pantalla}>
      <AppHeader titulo="Panel Administrador" subtitulo={`${lista.length} usuarios registrados`} />

      {cargando ? <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#E63946" /> : (
        <ScrollView>
          {/* Encabezado tabla */}
          <View style={s.tablaHeader}>
            <Text style={[s.colH, { flex: 2   }]}>Promotor</Text>
            <Text style={[s.colH, { flex: 1.8 }]}>Correo</Text>
            <Text style={[s.colH, { flex: 0.9 }]}>Rol</Text>
            <Text style={[s.colH, { flex: 0.8 }]}>Estado</Text>
            <Text style={[s.colH, { flex: 2.2, textAlign: 'right' }]}>Acciones</Text>
          </View>

          {lista.length === 0
            ? <Text style={s.vacio}>Sin usuarios registrados.</Text>
            : lista.map((u, i) => (
              <View key={u.id} style={[s.fila, i % 2 === 0 && s.filaAlterna]}>

                {/* Nombre */}
                <View style={[s.col, { flex: 2 }]}>
                  <View style={[s.avatar, u.rol === 'Master' && s.avatarMaster]}>
                    <Text style={s.avatarTxt}>{u.nombre[0].toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.nombre} numberOfLines={1}>{u.nombre}</Text>
                    {u.id === usuario?.id && <Text style={s.tuTag}>Tú</Text>}
                  </View>
                </View>

                {/* Correo */}
                <Text style={[s.colTxt, { flex: 1.8 }]} numberOfLines={1}>{u.correo}</Text>

                {/* Rol badge */}
                <View style={{ flex: 0.9 }}>
                  <View style={[s.badge, u.rol === 'Master' ? s.badgeM : s.badgeP]}>
                    <Text style={[s.badgeTxt, u.rol === 'Master' ? s.badgeMTxt : s.badgePTxt]}>
                      {u.rol === 'Master' ? '⭐ Master' : 'Promotor'}
                    </Text>
                  </View>
                </View>

                {/* Estado badge */}
                <View style={{ flex: 0.8 }}>
                  <View style={[s.badge, u.activo ? s.badgeActivo : s.badgeInactivo]}>
                    <Text style={[s.badgeTxt, u.activo ? s.badgeActivoTxt : s.badgeInactivoTxt]}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </Text>
                  </View>
                </View>

                {/* Acciones */}
                <View style={[s.acciones, { flex: 2.2 }]}>
                  <TouchableOpacity
                    style={[s.btn, { backgroundColor: u.activo ? '#FFF3E0' : '#E8F5E9' }]}
                    onPress={() => toggleActivo(u)} disabled={u.id === usuario?.id}
                  >
                    <Text style={[s.btnTxt, { color: u.activo ? '#E65100' : '#2E7D32' }]}>
                      {u.activo ? 'Desactivar' : 'Activar'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[s.btn, { backgroundColor: u.rol === 'Master' ? '#FFEBEE' : '#FFF3CD' }]}
                    onPress={() => toggleMaster(u)} disabled={u.id === usuario?.id}
                  >
                    <Text style={[s.btnTxt, { color: u.rol === 'Master' ? '#C62828' : '#856404' }]}>
                      {u.rol === 'Master' ? 'Quitar Master' : '⭐ Dar Master'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[s.btnIcono, u.id === usuario?.id && { opacity: 0.3 }]}
                    onPress={() => eliminar(u)} disabled={u.id === usuario?.id}
                  >
                    <Text style={{ fontSize: 16 }}>🗑️</Text>
                  </TouchableOpacity>
                </View>

              </View>
            ))
          }
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  pantalla:      { flex: 1, backgroundColor: '#F5F5F5' },
  tablaHeader:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#FAFAFA', borderBottomWidth: 1, borderBottomColor: '#EBEBEB' },
  colH:          { fontSize: 11, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 },
  fila:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0', gap: 8 },
  filaAlterna:   { backgroundColor: '#FAFAFA' },
  col:           { flexDirection: 'row', alignItems: 'center', gap: 8 },
  colTxt:        { fontSize: 12, color: '#555' },
  avatar:        { width: 34, height: 34, borderRadius: 17, backgroundColor: '#E63946', alignItems: 'center', justifyContent: 'center' },
  avatarMaster:  { backgroundColor: '#F59E0B' },
  avatarTxt:     { color: '#FFF', fontWeight: '700', fontSize: 14 },
  nombre:        { fontSize: 13, fontWeight: '600', color: '#1A1A1A' },
  tuTag:         { fontSize: 9, color: '#E63946', fontWeight: '700' },
  badge:         { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, alignSelf: 'flex-start' },
  badgeM:        { backgroundColor: '#FFF3CD' }, badgeMTxt:       { color: '#856404' },
  badgeP:        { backgroundColor: '#E8F5E9' }, badgePTxt:       { color: '#2E7D32' },
  badgeActivo:   { backgroundColor: '#E8F5E9' }, badgeActivoTxt:  { color: '#2E7D32' },
  badgeInactivo: { backgroundColor: '#FFEBEE' }, badgeInactivoTxt:{ color: '#C62828' },
  badgeTxt:      { fontSize: 10, fontWeight: '700' },
  acciones:      { flexDirection: 'row', gap: 6, justifyContent: 'flex-end', alignItems: 'center' },
  btn:           { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6 },
  btnTxt:        { fontSize: 11, fontWeight: '600' },
  btnIcono:      { padding: 6, backgroundColor: '#FFF0F0', borderRadius: 6 },
  vacio:         { textAlign: 'center', color: '#9E9E9E', marginTop: 40 },
});