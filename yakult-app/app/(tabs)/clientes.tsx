import { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput,
         StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { ClientesDB } from '../../services/db';
import { confirmar } from '../../utils/confirmar';
import AppHeader from '../../components/AppHeader';

type Cliente = { id: number; nombre: string; telefono: string; direccion: string; activo: boolean };
type Filtro  = 'todos' | 'activos' | 'inactivos';
type Vista   = 'lista' | 'agregar' | 'editar';

const soloLetras  = (v: string) => /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(v.trim());
const telefonoVal = (v: string) => /^\d{10}$/.test(v.trim());
const mixto       = (v: string) => v.trim().length >= 5;

const validar = (nombre: string, telefono: string, direccion: string) => {
  if (!nombre || !telefono || !direccion) return 'Completa todos los campos.';
  if (!soloLetras(nombre))  return 'El nombre solo debe contener letras.';
  if (!telefonoVal(telefono)) return 'El teléfono debe tener exactamente 10 dígitos.';
  if (!mixto(direccion))    return 'La dirección debe tener al menos 5 caracteres.';
  return null;
};

export default function ClientesScreen() {
  const [clientes, setClientes]   = useState<Cliente[]>([]);
  const [cargando, setCargando]   = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [vista, setVista]         = useState<Vista>('lista');
  const [editando, setEditando]   = useState<Cliente | null>(null);
  const [busqueda, setBusqueda]   = useState('');
  const [filtro, setFiltro]       = useState<Filtro>('todos');
  const [nombre, setNombre]       = useState('');
  const [telefono, setTelefono]   = useState('');
  const [direccion, setDireccion] = useState('');
  const [errores, setErrores]     = useState<Record<string, string>>({});

  useFocusEffect(useCallback(() => { cargar(); }, []));

  const cargar = async () => {
    setCargando(true);
    setClientes(await ClientesDB.getAll());
    setCargando(false);
  };

  const filtrados = clientes.filter(c => {
    const coincideBusqueda =
      c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.telefono.includes(busqueda);
    const coincideFiltro =
      filtro === 'todos'    ? true :
      filtro === 'activos'  ? c.activo :
      !c.activo;
    return coincideBusqueda && coincideFiltro;
  });

  const validarCampo = (campo: string, valor: string) => {
    let error = '';
    if (!valor.trim())                           error = 'Obligatorio.';
    else if (campo === 'nombre'   && !soloLetras(valor))  error = 'Solo letras.';
    else if (campo === 'telefono' && !telefonoVal(valor)) error = '10 dígitos numéricos.';
    else if (campo === 'direccion'&& !mixto(valor))       error = 'Mínimo 5 caracteres.';
    setErrores(prev => ({ ...prev, [campo]: error }));
  };

  const abrirEditar = (c: Cliente) => {
    setEditando(c);
    setNombre(c.nombre); setTelefono(c.telefono); setDireccion(c.direccion);
    setErrores({});
    setVista('editar');
  };

  const guardar = async () => {
    const error = validar(nombre, telefono, direccion);
    if (error) { Alert.alert('Error', error); return; }
    setGuardando(true);
    if (vista === 'agregar') {
      await ClientesDB.agregar({ nombre: nombre.trim(), telefono: telefono.trim(), direccion: direccion.trim() });
    } else if (editando) {
      await ClientesDB.editar(editando.id, { nombre: nombre.trim(), telefono: telefono.trim(), direccion: direccion.trim() });
    }
    await cargar();
    resetForm();
    setGuardando(false);
  };

  const toggleActivo = async (c: Cliente) => {
    await ClientesDB.toggleActivo(c.id, !c.activo);
    await cargar();
  };

  const eliminar = (c: Cliente) => {
    confirmar('Eliminar', `¿Eliminar a "${c.nombre}"?`, async () => {
      await ClientesDB.eliminar(c.id);
      await cargar();
    });
  };

  const resetForm = () => {
    setNombre(''); setTelefono(''); setDireccion('');
    setEditando(null); setErrores({}); setVista('lista');
  };

  const CAMPOS = [
    { label: 'Nombre del negocio', key: 'nombre',   value: nombre,   set: setNombre,   ph: 'Tienda López',    kb: 'default'    as const, hint: 'Solo letras'        },
    { label: 'Teléfono',           key: 'telefono', value: telefono, set: setTelefono, ph: '4491234567',      kb: 'phone-pad'  as const, hint: '10 dígitos'         },
    { label: 'Dirección',          key: 'direccion',value: direccion,set: setDireccion,ph: 'Calle Morelos 45',kb: 'default'    as const, hint: 'Letras y números'   },
  ];

  // ── FORMULARIO (agregar / editar) ──────────────────────
  if (vista !== 'lista') return (
    <View style={s.pantalla}>
      
      {/* Header personalizado */}
      <AppHeader 
        titulo="Clientes"
        derecha={
          <TouchableOpacity style={s.btnHeader} onPress={() => setVista('agregar')}>
            <Text style={s.btnHeaderTxt}>+ Agregar</Text>
          </TouchableOpacity>
        }
      />
      
      <ScrollView contentContainerStyle={s.form}>
        {CAMPOS.map(c => (
          <View key={c.key} style={s.campo}>
            <View style={s.campoHeader}>
              <Text style={s.campoLabel}>{c.label}</Text>
              <Text style={s.campoHint}>{c.hint}</Text>
            </View>
            <TextInput
              style={[s.input, errores[c.key] ? s.inputError : null]}
              value={c.value} onChangeText={c.set}
              onBlur={() => validarCampo(c.key, c.value)}
              placeholder={c.ph} keyboardType={c.kb}
              maxLength={c.key === 'telefono' ? 10 : undefined}
            />
            {errores[c.key] ? <Text style={s.errorTxt}>⚠️ {errores[c.key]}</Text> : null}
          </View>
        ))}
        <TouchableOpacity style={s.btnPrimario} onPress={guardar} disabled={guardando}>
          {guardando ? <ActivityIndicator color="#FFF" /> : <Text style={s.btnPrimarioTxt}>Guardar en MySQL</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  // ── LISTA ───────────────────────────────────────────────
  return (
    <View style={s.pantalla}>

      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitulo}>Clientes</Text>
        <TouchableOpacity style={s.btnHeader} onPress={() => setVista('agregar')}>
          <Text style={s.btnHeaderTxt}>+ Agregar</Text>
        </TouchableOpacity>
      </View>

      {/* Barra de búsqueda y filtros */}
      <View style={s.barraFiltros}>
        <TextInput
          style={s.buscador}
          placeholder="🔍  Buscar..."
          value={busqueda}
          onChangeText={setBusqueda}
        />
        <View style={s.filtros}>
          {(['todos','activos','inactivos'] as Filtro[]).map(f => (
            <TouchableOpacity
              key={f}
              style={[s.filtroPill, filtro === f && s.filtroPillActivo]}
              onPress={() => setFiltro(f)}
            >
              <Text style={[s.filtroPillTxt, filtro === f && s.filtroPillTxtActivo]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={s.contador}>{filtrados.length} cliente{filtrados.length !== 1 ? 's' : ''}</Text>
      </View>

      {cargando ? <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#E63946" /> : (
        <ScrollView>
          {/* Encabezado tabla */}
          <View style={s.tablaHeader}>
            <Text style={[s.colHeader, { flex: 2 }]}>Cliente</Text>
            <Text style={[s.colHeader, { flex: 1.5 }]}>Teléfono</Text>
            <Text style={[s.colHeader, { flex: 0.8 }]}>Código</Text>
            <Text style={[s.colHeader, { flex: 0.9 }]}>Estado</Text>
            <Text style={[s.colHeader, { flex: 1.8, textAlign: 'right' }]}>Acciones</Text>
          </View>

          {/* Filas */}
          {filtrados.length === 0
            ? <Text style={s.vacio}>{busqueda ? 'Sin resultados' : 'Sin clientes. Agrega uno.'}</Text>
            : filtrados.map((c, i) => (
              <View key={c.id} style={[s.fila, i % 2 === 0 && s.filaAlterna]}>

                {/* Avatar + nombre */}
                <View style={[s.col, { flex: 2 }]}>
                  <View style={s.avatar}><Text style={s.avatarTxt}>{c.nombre[0].toUpperCase()}</Text></View>
                  <Text style={s.clienteNombre} numberOfLines={1}>{c.nombre}</Text>
                </View>

                {/* Teléfono */}
                <Text style={[s.colTxt, { flex: 1.5 }]}>{c.telefono}</Text>

                {/* Código */}
                <Text style={[s.colTxt, { flex: 0.8, color: '#9E9E9E' }]}>#{String(c.id).padStart(3,'0')}</Text>

                {/* Estado */}
                <View style={{ flex: 0.9, alignItems: 'flex-start' }}>
                  <View style={[s.badge, c.activo ? s.badgeActivo : s.badgeInactivo]}>
                    <Text style={[s.badgeTxt, c.activo ? s.badgeTxtActivo : s.badgeTxtInactivo]}>
                      {c.activo ? 'Activo' : 'Inactivo'}
                    </Text>
                  </View>
                </View>

                {/* Acciones */}
                <View style={[s.acciones, { flex: 1.8 }]}>
                  <TouchableOpacity style={s.btnEditar} onPress={() => abrirEditar(c)}>
                    <Text style={s.btnEditarTxt}>Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.btnToggle, c.activo ? s.btnDesactivar : s.btnActivar]}
                    onPress={() => toggleActivo(c)}
                  >
                    <Text style={s.btnToggleTxt}>{c.activo ? 'Desactivar' : 'Activar'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.btnEliminar} onPress={() => eliminar(c)}>
                    <Text>🗑️</Text>
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
  pantalla:         { flex: 1, backgroundColor: '#F5F5F5' },
  header:           { backgroundColor: '#FFF', paddingTop: 52, paddingBottom: 12, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#EBEBEB' },
  headerTitulo:     { fontSize: 20, fontWeight: '700', color: '#1A1A1A' },
  back:             { fontSize: 14, color: '#E63946', marginRight: 12 },
  btnHeader:        { backgroundColor: '#E63946', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  btnHeaderTxt:     { color: '#FFF', fontWeight: '600', fontSize: 13 },

  barraFiltros:     { backgroundColor: '#FFF', padding: 14, gap: 10, borderBottomWidth: 1, borderBottomColor: '#EBEBEB' },
  buscador:         { backgroundColor: '#F5F5F5', borderRadius: 10, padding: 10, fontSize: 14, borderWidth: 1, borderColor: '#EBEBEB' },
  filtros:          { flexDirection: 'row', gap: 8 },
  filtroPill:       { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#EBEBEB' },
  filtroPillActivo: { backgroundColor: '#E63946', borderColor: '#E63946' },
  filtroPillTxt:    { fontSize: 12, color: '#666' },
  filtroPillTxtActivo:{ color: '#FFF', fontWeight: '600' },
  contador:         { fontSize: 12, color: '#9E9E9E' },

  tablaHeader:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#FAFAFA', borderBottomWidth: 1, borderBottomColor: '#EBEBEB' },
  colHeader:        { fontSize: 12, fontWeight: '700', color: '#666', textTransform: 'uppercase', letterSpacing: 0.5 },

  fila:             { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  filaAlterna:      { backgroundColor: '#FAFAFA' },
  col:              { flexDirection: 'row', alignItems: 'center', gap: 8 },
  colTxt:           { fontSize: 13, color: '#1A1A1A' },

  avatar:           { width: 34, height: 34, borderRadius: 17, backgroundColor: '#E63946', alignItems: 'center', justifyContent: 'center' },
  avatarTxt:        { color: '#FFF', fontWeight: '700', fontSize: 14 },
  clienteNombre:    { fontSize: 13, fontWeight: '600', color: '#1A1A1A', flex: 1 },

  badge:            { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeActivo:      { backgroundColor: '#E8F5E9' },
  badgeInactivo:    { backgroundColor: '#FFEBEE' },
  badgeTxt:         { fontSize: 11, fontWeight: '600' },
  badgeTxtActivo:   { color: '#2E7D32' },
  badgeTxtInactivo: { color: '#C62828' },

  acciones:         { flexDirection: 'row', gap: 6, justifyContent: 'flex-end', alignItems: 'center' },
  btnEditar:        { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1, borderColor: '#EBEBEB', backgroundColor: '#FFF' },
  btnEditarTxt:     { fontSize: 11, color: '#1A1A1A', fontWeight: '600' },
  btnToggle:        { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  btnDesactivar:    { backgroundColor: '#E63946' },
  btnActivar:       { backgroundColor: '#4CAF50' },
  btnToggleTxt:     { fontSize: 11, color: '#FFF', fontWeight: '600' },
  btnEliminar:      { padding: 6, backgroundColor: '#FFF0F0', borderRadius: 6 },

  vacio:            { textAlign: 'center', color: '#9E9E9E', marginTop: 40, padding: 20 },
  form:             { padding: 20, gap: 14 },
  campo:            { gap: 4 },
  campoHeader:      { flexDirection: 'row', justifyContent: 'space-between' },
  campoLabel:       { fontSize: 13, fontWeight: '600', color: '#1A1A1A' },
  campoHint:        { fontSize: 11, color: '#9E9E9E' },
  input:            { backgroundColor: '#FFF', borderRadius: 10, padding: 12, fontSize: 14, borderWidth: 1, borderColor: '#EBEBEB' },
  inputError:       { borderColor: '#E63946', borderWidth: 1.5 },
  errorTxt:         { fontSize: 11, color: '#E63946', marginTop: 2 },
  btnPrimario:      { backgroundColor: '#E63946', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  btnPrimarioTxt:   { color: '#FFF', fontWeight: '700', fontSize: 15 },
});