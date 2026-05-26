import { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput,
         StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { ClientesDB } from '../../services/db';
import { confirmar } from '../../utils/confirmar';

type Cliente = { id: number; nombre: string; telefono: string; direccion: string };

export default function ClientesScreen() {
  const [clientes, setClientes]   = useState<Cliente[]>([]);
  const [cargando, setCargando]   = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [vista, setVista]         = useState<'lista' | 'agregar'>('lista');
  const [busqueda, setBusqueda]   = useState('');
  const [nombre, setNombre]       = useState('');
  const [telefono, setTelefono]   = useState('');
  const [direccion, setDireccion] = useState('');

  useFocusEffect(useCallback(() => { cargar(); }, []));

  const cargar = async () => {
    setCargando(true);
    setClientes(await ClientesDB.getAll());
    setCargando(false);
  };

  const filtrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.telefono.includes(busqueda)
  );

  const agregar = async () => {
    if (!nombre || !telefono || !direccion) {
      Alert.alert('Error', 'Completa todos los campos'); return;
    }
    setGuardando(true);
    await ClientesDB.agregar({ nombre, telefono, direccion });
    await cargar();
    setNombre(''); setTelefono(''); setDireccion('');
    setVista('lista');
    setGuardando(false);
  };

  const eliminar = (c: Cliente) => {
  confirmar('Eliminar', `¿Eliminar a "${c.nombre}"?`, async () => {
    await ClientesDB.eliminar(c.id);
    await cargar();
  });
};

  if (vista === 'agregar') return (
    <View style={s.pantalla}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => setVista('lista')}><Text style={s.back}>← Volver</Text></TouchableOpacity>
        <Text style={s.headerTitulo}>Nuevo cliente</Text>
      </View>
      <ScrollView contentContainerStyle={s.form}>
        {[
          { label: 'Nombre del negocio', value: nombre,   set: setNombre,   ph: 'Tienda López'    },
          { label: 'Teléfono',           value: telefono, set: setTelefono, ph: '4491234567', kb: 'phone-pad' as const },
          { label: 'Dirección',          value: direccion,set: setDireccion,ph: 'Calle y número'  },
        ].map(c => (
          <View key={c.label} style={s.campo}>
            <Text style={s.campoLabel}>{c.label}</Text>
            <TextInput style={s.input} value={c.value} onChangeText={c.set}
              placeholder={c.ph} keyboardType={c.kb ?? 'default'} />
          </View>
        ))}
        <TouchableOpacity style={s.btnPrimario} onPress={agregar} disabled={guardando}>
          {guardando
            ? <ActivityIndicator color="#FFF" />
            : <Text style={s.btnPrimarioTxt}>Guardar en MySQL</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  return (
    <View style={s.pantalla}>
      <View style={s.header}>
        <Text style={s.headerTitulo}>Clientes</Text>
        <TouchableOpacity style={s.btnHeader} onPress={() => setVista('agregar')}>
          <Text style={s.btnHeaderTxt}>+ Agregar</Text>
        </TouchableOpacity>
      </View>

      <View style={s.buscadorWrap}>
        <TextInput style={s.buscador} placeholder="🔍  Buscar cliente..."
          value={busqueda} onChangeText={setBusqueda} />
      </View>

      {cargando ? <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#E63946" />
      : (
        <ScrollView contentContainerStyle={s.lista}>
          {filtrados.length === 0
            ? <Text style={s.vacio}>{busqueda ? 'Sin resultados' : 'Sin clientes. Agrega uno.'}</Text>
            : filtrados.map(c => (
              <View key={c.id} style={s.tarjeta}>
                <View style={s.avatar}><Text style={s.avatarTxt}>{c.nombre[0]}</Text></View>
                <View style={s.info}>
                  <Text style={s.clienteNombre}>{c.nombre}</Text>
                  <Text style={s.clienteDetalle}>📞 {c.telefono}</Text>
                  <Text style={s.clienteDetalle}>📍 {c.direccion}</Text>
                </View>
                <TouchableOpacity onPress={() => eliminar(c)} style={s.btnEliminar}>
                  <Text>🗑️</Text>
                </TouchableOpacity>
              </View>
            ))
          }
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  pantalla:      { flex: 1, backgroundColor: '#F2F2F2' },
  header:        { backgroundColor: '#FFF', paddingTop: 52, paddingBottom: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#EBEBEB' },
  headerTitulo:  { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  back:          { fontSize: 14, color: '#E63946', marginRight: 12 },
  btnHeader:     { backgroundColor: '#E63946', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  btnHeaderTxt:  { color: '#FFF', fontWeight: '600', fontSize: 13 },
  buscadorWrap:  { backgroundColor: '#FFF', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#EBEBEB' },
  buscador:      { backgroundColor: '#F2F2F2', borderRadius: 10, padding: 10, fontSize: 14 },
  lista:         { padding: 16, gap: 10 },
  vacio:         { textAlign: 'center', color: '#9E9E9E', marginTop: 40 },
  tarjeta:       { backgroundColor: '#FFF', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, elevation: 1 },
  avatar:        { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E63946', alignItems: 'center', justifyContent: 'center' },
  avatarTxt:     { color: '#FFF', fontWeight: '700', fontSize: 18 },
  info:          { flex: 1 },
  clienteNombre: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  clienteDetalle:{ fontSize: 12, color: '#9E9E9E', marginTop: 2 },
  btnEliminar:   { padding: 8, backgroundColor: '#FFF0F0', borderRadius: 8 },
  form:          { padding: 20, gap: 14 },
  campo:         { gap: 6 },
  campoLabel:    { fontSize: 13, fontWeight: '600', color: '#1A1A1A' },
  input:         { backgroundColor: '#FFF', borderRadius: 10, padding: 12, fontSize: 14, borderWidth: 1, borderColor: '#EBEBEB' },
  btnPrimario:   { backgroundColor: '#E63946', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  btnPrimarioTxt:{ color: '#FFF', fontWeight: '700', fontSize: 15 },
});