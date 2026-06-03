import { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { ProductosDB, ClientesDB, OrdenesDB } from '../../services/db';
import AppHeader from '../../components/AppHeader';

export default function DashboardScreen() {
  const [stats, setStats]     = useState({ productos: 0, clientes: 0, ordenes: 0, stock: 0 });
  const [ordenes, setOrdenes] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  useFocusEffect(useCallback(() => { cargar(); }, []));

  const cargar = async () => {
    setCargando(true);
    const [productos, clientes, ordenes] = await Promise.all([
      ProductosDB.getAll(),
      ClientesDB.getAll(),
      OrdenesDB.getAll(),
    ]);
    setStats({
      productos: productos.length,
      clientes:  clientes.length,
      ordenes:   ordenes.filter((o: any) => o.estado === 'Pendiente').length,
      stock:     productos.reduce((s: number, p: any) => s + p.stock, 0),
    });
    setOrdenes(ordenes.slice(0, 3));
    setCargando(false);
  };

  const COLOR_ESTADO: Record<string, string> = {
    'Entregado': '#4CAF50', 'En camino': '#2196F3', 'Pendiente': '#FF9800',
  };

  const CARDS = [
    { label: 'Productos',        valor: stats.productos, icono: '📦', color: '#9C27B0' },
    { label: 'Clientes',         valor: stats.clientes,  icono: '👥', color: '#FF9800' },
    { label: 'Pedidos pendientes',valor: stats.ordenes,  icono: '🛒', color: '#2196F3' },
    { label: 'Stock total',      valor: stats.stock,     icono: '📊', color: '#4CAF50' },
  ];

  return (
    <View style={s.pantalla}>
      <AppHeader 
        titulo="Yakult" 
        subtitulo="Distribuidor Aguascalientes" 
        colorFondo="#E63946" 
      />

      {cargando ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#E63946" />
      ) : (
        <ScrollView contentContainerStyle={s.contenido}>
          <Text style={s.seccion}>Resumen general</Text>
          <View style={s.grid}>
            {CARDS.map(c => (
              <View key={c.label} style={s.card}>
                <Text style={s.cardIcono}>{c.icono}</Text>
                <Text style={[s.cardValor, { color: c.color }]}>{c.valor}</Text>
                <Text style={s.cardLabel}>{c.label}</Text>
              </View>
            ))}
          </View>

          <Text style={s.seccion}>Últimas órdenes</Text>
          {ordenes.length === 0
            ? <Text style={s.vacio}>Sin órdenes registradas</Text>
            : ordenes.map((o: any) => (
              <View key={o.id} style={s.fila}>
                <View>
                  <Text style={s.filaId}>#{o.id} · {o.clienteNombre}</Text>
                  <Text style={s.filaFecha}>{o.fecha}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={s.filaTotal}>${o.total}</Text>
                  <Text style={[s.filaEstado, { color: COLOR_ESTADO[o.estado] }]}>{o.estado}</Text>
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
  pantalla:   { flex: 1, backgroundColor: '#F2F2F2' },
  contenido:  { padding: 16, gap: 12 },
  seccion:    { fontSize: 15, fontWeight: '600', color: '#1A1A1A', marginTop: 4 },
  grid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card:       { backgroundColor: '#FFF', borderRadius: 12, padding: 16, width: '47.5%', alignItems: 'center', elevation: 2 },
  cardIcono:  { fontSize: 28, marginBottom: 6 },
  cardValor:  { fontSize: 24, fontWeight: '700' },
  cardLabel:  { fontSize: 11, color: '#9E9E9E', textAlign: 'center', marginTop: 2 },
  fila:       { backgroundColor: '#FFF', borderRadius: 10, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 1 },
  filaId:     { fontSize: 13, fontWeight: '600', color: '#1A1A1A' },
  filaFecha:  { fontSize: 11, color: '#9E9E9E', marginTop: 2 },
  filaTotal:  { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  filaEstado: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  vacio:      { textAlign: 'center', color: '#9E9E9E', marginTop: 20 },
});