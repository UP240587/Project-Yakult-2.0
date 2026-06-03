import { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity,
         StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { OrdenesDB, ClientesDB, ProductosDB } from '../../services/db';
import AppHeader from '../../components/AppHeader';

type Tab = 'historial' | 'nueva' | 'notificaciones';
const COLOR_ESTADO: Record<string, string> = {
  'Entregado': '#4CAF50', 'En camino': '#2196F3', 'Pendiente': '#FF9800',
};

export default function OrdenesScreen() {
  const [tab, setTab]           = useState<Tab>('historial');
  const [cargando, setCargando] = useState(true);
  const [ordenes, setOrdenes]   = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [clienteSel, setClienteSel]     = useState<any>(null);
  const [cantidades, setCantidades]     = useState<Record<number, number>>({});
  const [guardando, setGuardando]       = useState(false);

  useFocusEffect(useCallback(() => { cargar(); }, []));

  const cargar = async () => {
    setCargando(true);
    const [o, c, p] = await Promise.all([
      OrdenesDB.getAll(),
      ClientesDB.getAll(),
      ProductosDB.getAll(),
    ]);
    setOrdenes(o); setClientes(c); setProductos(p);
    setCargando(false);
  };

  const cambiarCantidad = (id: number, delta: number) => {
    setCantidades(prev => {
      const actual = prev[id] ?? 0;
      const nuevo  = Math.max(0, actual + delta);
      const copia  = { ...prev };
      if (nuevo === 0) delete copia[id]; else copia[id] = nuevo;
      return copia;
    });
  };

  const total = productos.reduce((sum: number, p: any) => {
    return sum + (cantidades[p.id] ?? 0) * p.precio;
  }, 0);

  const crearOrden = async () => {
    if (!clienteSel || total === 0) {
      Alert.alert('Error', 'Selecciona cliente y al menos un producto'); return;
    }
    setGuardando(true);
    const items = Object.entries(cantidades).map(([prodId, cantidad]) => {
      const prod = productos.find((p: any) => p.id === +prodId);
      return { productoId: +prodId, cantidad, precio: prod.precio };
    });
    await OrdenesDB.agregar({ clienteId: clienteSel.id, items, total });
    await cargar();
    setClienteSel(null); setCantidades({});
    setTab('historial');
    setGuardando(false);
    Alert.alert('✅ Orden creada', 'Guardada en MySQL correctamente');
  };

  const cambiarEstado = (orden: any) => {
    const estados: Orden['estado'][] = ['Pendiente', 'En camino', 'Entregado'];
    const opciones = estados.filter(e => e !== orden.estado);
    Alert.alert('Cambiar estado', `Orden ${orden.id}`, opciones.map(e => ({
      text: e,
      onPress: async () => {
        await OrdenesDB.cambiarEstado(orden.id, e);
        await cargar();
      },
    })));
  };

  type Orden = { estado: 'Pendiente' | 'En camino' | 'Entregado' };

  const NOTIFICACIONES = [
    { icono: '📦', msg: 'Stock bajo: revisa productos con menos de 50 unidades', tiempo: 'Automático' },
    { icono: '🛒', msg: `${ordenes.filter((o: any) => o.estado === 'Pendiente').length} órdenes pendientes por entregar`, tiempo: 'Ahora' },
    { icono: '👥', msg: `${clientes.length} clientes registrados en el sistema`, tiempo: 'Info' },
  ];

  return (
    <View style={s.pantalla}>
      <AppHeader 
        titulo="Órdenes"
        derecha={
          <TouchableOpacity style={s.btnHeader} onPress={() => setTab('nueva')}>
            <Text style={s.btnHeaderTxt}>+ Nueva</Text>
          </TouchableOpacity>
        }
      />

      <View style={s.tabs}>
        {(['historial', 'nueva', 'notificaciones'] as Tab[]).map(t => (
          <TouchableOpacity key={t} style={[s.tabBtn, tab === t && s.tabActivo]} onPress={() => setTab(t)}>
            <Text style={[s.tabTxt, tab === t && s.tabTxtActivo]}>
              {t === 'historial' ? 'Historial' : t === 'nueva' ? 'Nueva' : 'Avisos'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {cargando ? <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#E63946" /> : (
        <>
          {/* ── HISTORIAL ── */}
          {tab === 'historial' && (
            <ScrollView contentContainerStyle={s.lista}>
              {ordenes.length === 0
                ? <Text style={s.vacio}>Sin órdenes. Crea una.</Text>
                : ordenes.map((o: any) => (
                  <TouchableOpacity key={o.id} style={s.tarjeta} onPress={() => cambiarEstado(o)}>
                    <View style={{ flex: 1 }}>
                      <View style={s.ordenTop}>
                        <Text style={s.ordenId}>#{o.id} · {o.clienteNombre}</Text>
                        <Text style={[s.estado, { color: COLOR_ESTADO[o.estado] }]}>{o.estado}</Text>
                      </View>
                      <Text style={s.ordenItems}>
                        {o.items?.map((i: any) => `${i.nombre} x${i.cantidad}`).join(', ')}
                      </Text>
                      <View style={s.ordenBottom}>
                        <Text style={s.ordenFecha}>{o.fecha} · Toca para cambiar estado</Text>
                        <Text style={s.ordenTotal}>${o.total}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              }
            </ScrollView>
          )}

          {/* ── NUEVA ORDEN ── */}
          {tab === 'nueva' && (
            <ScrollView contentContainerStyle={s.lista}>
              <Text style={s.seccion}>Cliente</Text>
              <View style={s.chips}>
                {clientes.map((c: any) => (
                  <TouchableOpacity key={c.id}
                    style={[s.chip, clienteSel?.id === c.id && s.chipActivo]}
                    onPress={() => setClienteSel(c)}>
                    <Text style={[s.chipTxt, clienteSel?.id === c.id && s.chipTxtActivo]}>{c.nombre}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.seccion}>Productos</Text>
              {productos.map((p: any) => (
                <View key={p.id} style={s.tarjeta}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.prodNombre}>{p.nombre}</Text>
                    <Text style={s.prodPrecio}>${p.precio} · Stock: {p.stock}</Text>
                  </View>
                  <View style={s.contador}>
                    <TouchableOpacity style={s.cntBtn} onPress={() => cambiarCantidad(p.id, -1)}>
                      <Text style={s.cntBtnTxt}>−</Text>
                    </TouchableOpacity>
                    <Text style={s.cntValor}>{cantidades[p.id] ?? 0}</Text>
                    <TouchableOpacity style={s.cntBtn} onPress={() => cambiarCantidad(p.id, 1)}>
                      <Text style={s.cntBtnTxt}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              <View style={s.totalWrap}>
                <Text style={s.totalLabel}>Total</Text>
                <Text style={s.totalValor}>${total.toFixed(2)}</Text>
              </View>

              <TouchableOpacity style={s.btnPrimario} onPress={crearOrden} disabled={guardando}>
                {guardando
                  ? <ActivityIndicator color="#FFF" />
                  : <Text style={s.btnPrimarioTxt}>Confirmar orden</Text>
                }
              </TouchableOpacity>
            </ScrollView>
          )}

          {/* ── NOTIFICACIONES ── */}
          {tab === 'notificaciones' && (
            <ScrollView contentContainerStyle={s.lista}>
              {NOTIFICACIONES.map((n, i) => (
                <View key={i} style={s.notif}>
                  <Text style={s.notifIcono}>{n.icono}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.notifMsg}>{n.msg}</Text>
                    <Text style={s.notifTiempo}>{n.tiempo}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  pantalla:      { flex: 1, backgroundColor: '#F2F2F2' },
  btnHeader:     { backgroundColor: '#E63946', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  btnHeaderTxt:  { color: '#FFF', fontWeight: '600', fontSize: 13 },
  tabs:          { flexDirection: 'row', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EBEBEB' },
  tabBtn:        { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActivo:     { borderBottomWidth: 2, borderBottomColor: '#E63946' },
  tabTxt:        { fontSize: 12, color: '#9E9E9E' },
  tabTxtActivo:  { color: '#E63946', fontWeight: '700' },
  lista:         { padding: 16, gap: 10 },
  vacio:         { textAlign: 'center', color: '#9E9E9E', marginTop: 40 },
  seccion:       { fontSize: 14, fontWeight: '600', color: '#1A1A1A', marginTop: 4 },
  tarjeta:       { backgroundColor: '#FFF', borderRadius: 12, padding: 14, elevation: 1, flexDirection: 'row', alignItems: 'center' },
  ordenTop:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  ordenId:       { fontSize: 13, fontWeight: '600', color: '#1A1A1A' },
  estado:        { fontSize: 12, fontWeight: '600' },
  ordenItems:    { fontSize: 12, color: '#9E9E9E', marginBottom: 6 },
  ordenBottom:   { flexDirection: 'row', justifyContent: 'space-between' },
  ordenFecha:    { fontSize: 11, color: '#9E9E9E' },
  ordenTotal:    { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  chips:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:          { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#EBEBEB' },
  chipActivo:    { backgroundColor: '#E63946', borderColor: '#E63946' },
  chipTxt:       { fontSize: 13, color: '#1A1A1A' },
  chipTxtActivo: { color: '#FFF', fontWeight: '600' },
  prodNombre:    { fontSize: 13, fontWeight: '600', color: '#1A1A1A' },
  prodPrecio:    { fontSize: 12, color: '#9E9E9E' },
  contador:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cntBtn:        { width: 30, height: 30, borderRadius: 15, backgroundColor: '#E63946', alignItems: 'center', justifyContent: 'center' },
  cntBtnTxt:     { color: '#FFF', fontSize: 18, fontWeight: '700', lineHeight: 22 },
  cntValor:      { fontSize: 16, fontWeight: '700', minWidth: 24, textAlign: 'center' },
  totalWrap:     { backgroundColor: '#FFF', borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel:    { fontSize: 14, color: '#9E9E9E' },
  totalValor:    { fontSize: 20, fontWeight: '700', color: '#1A1A1A' },
  btnPrimario:   { backgroundColor: '#E63946', borderRadius: 12, padding: 16, alignItems: 'center' },
  btnPrimarioTxt:{ color: '#FFF', fontWeight: '700', fontSize: 15 },
  notif:         { backgroundColor: '#FFF', borderRadius: 12, padding: 14, flexDirection: 'row', gap: 12, alignItems: 'flex-start', elevation: 1 },
  notifIcono:    { fontSize: 24 },
  notifMsg:      { fontSize: 13, color: '#1A1A1A' },
  notifTiempo:   { fontSize: 11, color: '#9E9E9E', marginTop: 4 },
});