import { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput,
         StyleSheet, Alert, ActivityIndicator, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { ProductosDB } from '../../services/db';
import { confirmar } from '../../utils/confirmar';

type Producto = { id: number; nombre: string; sku: string; precio: number; stock: number };
type Vista    = 'lista' | 'agregar' | 'editar';

// ── Alerta compatible web + nativo ──────────────────────────────────────────
const alerta = (titulo: string, mensaje: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${titulo}\n\n${mensaje}`);
  } else {
    Alert.alert(titulo, mensaje);
  }
};

export default function ProductosScreen() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando]   = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [vista, setVista]         = useState<Vista>('lista');
  const [editando, setEditando]   = useState<Producto | null>(null);
  const [nombre, setNombre]       = useState('');
  const [sku, setSku]             = useState('');
  const [precio, setPrecio]       = useState('');
  const [stock, setStock]         = useState('');

  useFocusEffect(useCallback(() => { cargar(); }, []));

  const cargar = async () => {
    setCargando(true);
    setProductos(await ProductosDB.getAll());
    setCargando(false);
  };

  const abrirEditar = (p: Producto) => {
    setEditando(p);
    setNombre(p.nombre); setSku(p.sku);
    setPrecio(String(p.precio)); setStock(String(p.stock));
    setVista('editar');
  };

  // ── Handlers numéricos ──────────────────────────────────────────────────────

  const handlePrecio = (text: string) => {
    const limpio = text.replace(/[^0-9.]/g, '');
    if (text.length > 0 && limpio.length === 0) {
      alerta('Campo inválido', 'El precio solo admite números.');
      return;
    }
    const partes = limpio.split('.');
    if (partes.length > 2) return;
    setPrecio(limpio);
  };

  const handleStock = (text: string) => {
    const limpio = text.replace(/[^0-9]/g, '');
    if (text.length > 0 && limpio.length === 0) {
      alerta('Campo inválido', 'El stock solo admite números enteros.');
      return;
    }
    setStock(limpio);
  };

  // ───────────────────────────────────────────────────────────────────────────

  const guardar = async () => {
    const faltantes: string[] = [];
    if (!nombre.trim()) faltantes.push('Nombre');
    if (!sku.trim())    faltantes.push('SKU');
    if (!precio.trim()) faltantes.push('Precio');
    if (!stock.trim())  faltantes.push('Stock');

    if (faltantes.length > 0) {
      alerta('Campos requeridos', `Completa los siguientes campos:\n\n• ${faltantes.join('\n• ')}`);
      return;
    }

    const precioNum = parseFloat(precio);
    const stockNum  = parseInt(stock, 10);

    if (isNaN(precioNum) || precioNum <= 0) {
      alerta('Precio inválido', 'Ingresa un precio numérico mayor a 0.'); return;
    }
    if (isNaN(stockNum) || stockNum < 0) {
      alerta('Stock inválido', 'Ingresa un stock numérico igual o mayor a 0.'); return;
    }

    setGuardando(true);
    if (vista === 'agregar') {
      await ProductosDB.agregar({ nombre, sku, precio: precioNum, stock: stockNum });
    } else if (editando) {
      await ProductosDB.editar(editando.id, { nombre, sku, precio: precioNum, stock: stockNum });
    }
    await cargar();
    resetForm();
    setGuardando(false);
  };

  const eliminar = (p: Producto) => {
    confirmar('Eliminar', `¿Eliminar "${p.nombre}"?`, async () => {
      await ProductosDB.eliminar(p.id);
      await cargar();
    });
  };

  const resetForm = () => {
    setNombre(''); setSku(''); setPrecio(''); setStock('');
    setEditando(null); setVista('lista');
  };

  const CAMPOS = [
    { label: 'Nombre', value: nombre,  set: setNombre,   ph: 'Yakult Original 65ml' },
    { label: 'SKU',    value: sku,     set: setSku,      ph: 'YK-001'               },
    { label: 'Precio', value: precio,  set: handlePrecio, ph: '12.50', kb: 'decimal-pad' as const },
    { label: 'Stock',  value: stock,   set: handleStock,  ph: '100',   kb: 'number-pad'  as const },
  ];

  if (vista !== 'lista') return (
    <View style={s.pantalla}>
      <View style={s.header}>
        <TouchableOpacity onPress={resetForm}><Text style={s.back}>← Volver</Text></TouchableOpacity>
        <Text style={s.headerTitulo}>{vista === 'agregar' ? 'Nuevo producto' : 'Editar producto'}</Text>
      </View>
      <ScrollView contentContainerStyle={s.form}>
        {CAMPOS.map(c => (
          <View key={c.label} style={s.campo}>
            <Text style={s.campoLabel}>{c.label}</Text>
            <TextInput
              style={s.input}
              value={c.value}
              onChangeText={c.set}
              placeholder={c.ph}
              keyboardType={c.kb ?? 'default'}
            />
          </View>
        ))}
        <TouchableOpacity style={s.btnPrimario} onPress={guardar} disabled={guardando}>
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
        <Text style={s.headerTitulo}>Productos</Text>
        <TouchableOpacity style={s.btnHeader} onPress={() => setVista('agregar')}>
          <Text style={s.btnHeaderTxt}>+ Agregar</Text>
        </TouchableOpacity>
      </View>

      {cargando ? <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#E63946" />
      : (
        <ScrollView contentContainerStyle={s.lista}>
          {productos.length === 0
            ? <Text style={s.vacio}>Sin productos. Agrega uno.</Text>
            : productos.map(p => (
              <View key={p.id} style={s.tarjeta}>
                <View style={s.tarjetaInfo}>
                  <Text style={s.prodNombre}>{p.nombre}</Text>
                  <Text style={s.prodSku}>SKU: {p.sku} · ${p.precio}</Text>
                  <Text style={[s.prodStock, p.stock < 50 && { color: '#E63946' }]}>
                    Stock: {p.stock} {p.stock < 50 ? '⚠️' : ''}
                  </Text>
                </View>
                <View style={s.acciones}>
                  <TouchableOpacity onPress={() => abrirEditar(p)} style={s.btnEditar}>
                    <Text>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => eliminar(p)} style={s.btnEliminar}>
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
  pantalla:      { flex: 1, backgroundColor: '#F2F2F2' },
  header:        { backgroundColor: '#FFF', paddingTop: 52, paddingBottom: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#EBEBEB' },
  headerTitulo:  { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  back:          { fontSize: 14, color: '#E63946', marginRight: 12 },
  btnHeader:     { backgroundColor: '#E63946', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  btnHeaderTxt:  { color: '#FFF', fontWeight: '600', fontSize: 13 },
  lista:         { padding: 16, gap: 10 },
  vacio:         { textAlign: 'center', color: '#9E9E9E', marginTop: 40 },
  tarjeta:       { backgroundColor: '#FFF', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', elevation: 1 },
  tarjetaInfo:   { flex: 1 },
  prodNombre:    { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  prodSku:       { fontSize: 12, color: '#9E9E9E', marginTop: 2 },
  prodStock:     { fontSize: 12, color: '#4CAF50', marginTop: 2, fontWeight: '600' },
  acciones:      { flexDirection: 'row', gap: 8 },
  btnEditar:     { padding: 8, backgroundColor: '#F0F4FF', borderRadius: 8 },
  btnEliminar:   { padding: 8, backgroundColor: '#FFF0F0', borderRadius: 8 },
  form:          { padding: 20, gap: 14 },
  campo:         { gap: 6 },
  campoLabel:    { fontSize: 13, fontWeight: '600', color: '#1A1A1A' },
  input:         { backgroundColor: '#FFF', borderRadius: 10, padding: 12, fontSize: 14, borderWidth: 1, borderColor: '#EBEBEB' },
  btnPrimario:   { backgroundColor: '#E63946', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  btnPrimarioTxt:{ color: '#FFF', fontWeight: '700', fontSize: 15 },
});