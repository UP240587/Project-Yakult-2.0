import { useState, useCallback } from 'react';
import { ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { XStack, YStack } from 'tamagui';
import { useFocusEffect } from 'expo-router';
import { ProductosDB, ClientesDB, OrdenesDB } from '../../services/db';
import AppHeader from '../../components/AppHeader';
import { AppText, Badge, Card, EmptyState, Loading, Screen, type IconName } from '../../components/ui';

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

  const CARDS: Array<{ label: string; valor: number; icono: IconName; color: string }> = [
    { label: 'Productos',         valor: stats.productos, icono: 'cube-outline',        color: '#9C27B0' },
    { label: 'Clientes',          valor: stats.clientes,  icono: 'people-outline',      color: '#FF9800' },
    { label: 'Pedidos pendientes',valor: stats.ordenes,   icono: 'cart-outline',        color: '#2196F3' },
    { label: 'Stock total',       valor: stats.stock,     icono: 'stats-chart-outline', color: '#4CAF50' },
  ];

  return (
    <Screen>
      <AppHeader
        titulo="Yakult"
        subtitulo="Distribuidor Aguascalientes"
        colorFondo="#E63946"
      />

      {cargando ? (
        <Loading />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          <AppText fontSize={15} fontWeight="700" marginTop={4}>Resumen general</AppText>
          <XStack flexWrap="wrap" gap={10}>
            {CARDS.map(c => (
              <Card key={c.label} width="47.5%" alignItems="center" gap={6}>
                <YStack
                  width={40}
                  height={40}
                  borderRadius={13}
                  backgroundColor={`${c.color}1A`}
                  alignItems="center"
                  justifyContent="center"
                >
                  <Ionicons name={c.icono} size={20} color={c.color} />
                </YStack>
                <AppText fontSize={24} fontWeight="800" color={c.color}>{c.valor}</AppText>
                <AppText fontSize={11} tone="muted" textAlign="center">{c.label}</AppText>
              </Card>
            ))}
          </XStack>

          <AppText fontSize={15} fontWeight="700" marginTop={4}>Últimas órdenes</AppText>
          {ordenes.length === 0
            ? <EmptyState icon="receipt-outline" mensaje="Sin órdenes registradas" />
            : ordenes.map((o: any) => (
              <Card key={o.id} flexDirection="row" justifyContent="space-between" alignItems="center" padding={14}>
                <YStack gap={2}>
                  <AppText fontSize={13} fontWeight="600">#{o.id} · {o.clienteNombre}</AppText>
                  <AppText fontSize={11} tone="muted">{o.fecha}</AppText>
                </YStack>
                <YStack alignItems="flex-end" gap={4}>
                  <AppText fontSize={13} fontWeight="700">${o.total}</AppText>
                  <Badge color={COLOR_ESTADO[o.estado]}>{o.estado}</Badge>
                </YStack>
              </Card>
            ))
          }
        </ScrollView>
      )}
    </Screen>
  );
}
