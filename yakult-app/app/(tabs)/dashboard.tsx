import { useCallback, useMemo, useState } from 'react';
import { ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Spinner, XStack, YStack } from 'tamagui';
import { Redirect, useFocusEffect } from 'expo-router';
import AppHeader from '../../components/AppHeader';
import { DashboardDB } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { colors } from '../../tamagui.config';
import {
  AppButton, AppText, Card, EmptyState, Field, Loading, Screen, type IconName,
} from '../../components/ui';

const ESTADO_COLOR: Record<string, string> = {
  'Pendiente': '#FF9800',
  'En camino': '#2196F3',
  'Entregado': '#4CAF50',
  'Cancelado': '#E63946',
};

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;
const money = (n: number) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(Math.round(n)));

type Filtro = { fechaInicio: string; fechaFin: string };
type Data = {
  filtros: Filtro | null;
  resumen: { ventasTotales: number; ordenesTotales: number; clientesActivos: number; productosVendidos: number };
  ventasChart: Array<{ fecha: string; etiqueta: string; total: number }>;
  bestSellers: Array<{ id: number; nombre: string; categoria: string; cantidad: number; total: number }>;
  ordenesPorEstado: Array<{ estado: string; cantidad: number }>;
};

export default function DashboardScreen() {
  const { usuario } = useAuth();
  const { mostrar } = useToast();

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<Data | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [aplicado, setAplicado] = useState<Filtro | undefined>(undefined);

  const cargar = useCallback(async (filtros?: Filtro) => {
    setCargando(true);
    setError('');
    const res = await DashboardDB.get(filtros);
    if (res?.error) setError(res.error);
    else setData(res);
    setCargando(false);
  }, []);

  // RF-80: al volver a la pantalla se recalcula automáticamente (tras crear órdenes, etc.)
  useFocusEffect(useCallback(() => { cargar(aplicado); }, [cargar, aplicado]));

  // RF-81: validación de acceso — solo Master.
  if (usuario && usuario.rol !== 'Master') return <Redirect href="/(tabs)" />;

  const aplicarFiltro = () => {
    const ini = startDate.trim();
    const fin = endDate.trim();
    if (!ini && !fin) { setAplicado(undefined); cargar(undefined); mostrar('Mostrando todo el histórico', 'info'); return; }
    if (!ini || !fin) { setError('Indica fecha inicial y final.'); mostrar('Indica ambas fechas', 'error'); return; }
    if (!FECHA_RE.test(ini) || !FECHA_RE.test(fin)) { setError('Usa el formato YYYY-MM-DD.'); mostrar('Formato de fecha inválido', 'error'); return; }
    if (ini > fin) { setError('La fecha final no puede ser menor a la inicial.'); mostrar('Rango de fechas inválido', 'error'); return; }
    const f = { fechaInicio: ini, fechaFin: fin };
    setAplicado(f); cargar(f); mostrar('Filtro aplicado', 'success');
  };

  const limpiarFiltro = () => {
    setStartDate(''); setEndDate(''); setAplicado(undefined); cargar(undefined);
  };

  const maxVenta = useMemo(
    () => Math.max(1, ...(data?.ventasChart ?? []).map((v) => v.total)),
    [data]
  );
  const maxCantidad = useMemo(
    () => Math.max(1, ...(data?.bestSellers ?? []).map((b) => b.cantidad)),
    [data]
  );
  const totalOrdenesEstado = useMemo(
    () => (data?.ordenesPorEstado ?? []).reduce((s, e) => s + e.cantidad, 0),
    [data]
  );

  const RESUMEN: Array<{ label: string; valor: string; icono: IconName }> = data ? [
    { label: 'Ventas Totales',     valor: money(data.resumen.ventasTotales),        icono: 'cash-outline' },
    { label: 'Órdenes Totales',    valor: String(data.resumen.ordenesTotales),      icono: 'receipt-outline' },
    { label: 'Clientes',           valor: String(data.resumen.clientesActivos),     icono: 'people-outline' },
    { label: 'Productos Vendidos', valor: String(data.resumen.productosVendidos),   icono: 'cube-outline' },
  ] : [];

  return (
    <Screen>
      {/* Barra de navegación superior + perfil (avatar/nombre/rol) en la esquina sup. izq. */}
      <AppHeader titulo="Dashboard" subtitulo={usuario ? `${usuario.nombre} · ${usuario.rol}` : undefined} />

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
        {/* Título grande en negrita */}
        <AppText fontSize={28} fontWeight="800" letterSpacing={-0.5}>Statistics Dashboard</AppText>
        <AppText fontSize={13} tone="muted" marginTop={-6}>
          {aplicado ? `Periodo: ${aplicado.fechaInicio} a ${aplicado.fechaFin}` : 'Resumen histórico completo'}
        </AppText>

        {/* ── Tarjetas de resumen (horizontales / responsive) ── */}
        <XStack flexWrap="wrap" gap={10}>
          {(cargando && !data ? [0, 1, 2, 3] : RESUMEN).map((item: any, i) => (
            <Card key={i} flexGrow={1} flexBasis={150} minWidth={150} gap={0}>
              {data ? (
                <>
                  <YStack
                    width={36}
                    height={36}
                    borderRadius={12}
                    backgroundColor="$primarySoft"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Ionicons name={item.icono} size={18} color={colors.primary} />
                  </YStack>
                  <AppText fontSize={22} fontWeight="800" tone="primary" marginTop={6} numberOfLines={1} adjustsFontSizeToFit>
                    {item.valor}
                  </AppText>
                  <AppText fontSize={12} tone="muted" marginTop={2} fontWeight="600">{item.label}</AppText>
                </>
              ) : (
                <Spinner color="$primary" />
              )}
            </Card>
          ))}
        </XStack>

        {/* ── Filtro de fechas (sobre los gráficos) ── */}
        <Card>
          <AppText fontSize={15} fontWeight="800">Filtro de fechas</AppText>
          <XStack gap={10} flexWrap="wrap">
            <YStack flexGrow={1} flexBasis={130}>
              <Field
                label="Start Date"
                placeholder="YYYY-MM-DD"
                value={startDate}
                onChangeText={setStartDate}
                autoCapitalize="none"
              />
            </YStack>
            <YStack flexGrow={1} flexBasis={130}>
              <Field
                label="End Date"
                placeholder="YYYY-MM-DD"
                value={endDate}
                onChangeText={setEndDate}
                autoCapitalize="none"
              />
            </YStack>
          </XStack>
          <XStack alignItems="center" gap={10}>
            <AppButton icon="funnel-outline" onPress={aplicarFiltro}>Apply Filter</AppButton>
            {aplicado && (
              <AppButton variant="ghost" onPress={limpiarFiltro}>Limpiar</AppButton>
            )}
          </XStack>
          {error ? <AppText fontSize={12} tone="primary" fontWeight="600">{error}</AppText> : null}
        </Card>

        {cargando ? (
          <Loading />
        ) : !data ? null : (
          <>
            {/* ── Gráfico de ventas (cronológico) ── */}
            <Card>
              <AppText fontSize={15} fontWeight="800">Ventas por día</AppText>
              {data.ventasChart.length === 0 ? (
                <EmptyState icon="trending-up-outline" mensaje="Sin ventas completadas en este periodo." />
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ alignItems: 'flex-end', gap: 14, paddingVertical: 8, minHeight: 180 }}
                >
                  {data.ventasChart.map((v) => (
                    <YStack key={v.fecha} width={48} alignItems="center" justifyContent="flex-end" gap={6}>
                      <AppText fontSize={10} tone="muted" fontWeight="700">{compact(v.total)}</AppText>
                      <YStack
                        width={26}
                        borderRadius={8}
                        backgroundColor="$primary"
                        height={Math.max(6, Math.round((v.total / maxVenta) * 130))}
                      />
                      <AppText fontSize={10} tone="muted" numberOfLines={1}>{v.etiqueta}</AppText>
                    </YStack>
                  ))}
                </ScrollView>
              )}
            </Card>

            {/* ── Estado de las órdenes (distribución tipo pastel apilada) ── */}
            <Card>
              <AppText fontSize={15} fontWeight="800">Estado de las órdenes</AppText>
              {totalOrdenesEstado === 0 ? (
                <EmptyState icon="pie-chart-outline" mensaje="Sin órdenes en este periodo." />
              ) : (
                <>
                  <XStack height={22} borderRadius={11} overflow="hidden" backgroundColor="$line">
                    {data.ordenesPorEstado.map((e) => (
                      <YStack
                        key={e.estado}
                        flex={e.cantidad}
                        backgroundColor={ESTADO_COLOR[e.estado] ?? colors.muted}
                      />
                    ))}
                  </XStack>
                  <YStack gap={8}>
                    {data.ordenesPorEstado.map((e) => (
                      <XStack key={e.estado} alignItems="center" gap={8}>
                        <YStack
                          width={11}
                          height={11}
                          borderRadius={6}
                          backgroundColor={ESTADO_COLOR[e.estado] ?? colors.muted}
                        />
                        <AppText fontSize={13}>
                          {e.estado}: <AppText fontSize={13} fontWeight="800">{e.cantidad}</AppText>{' '}
                          ({Math.round((e.cantidad / totalOrdenesEstado) * 100)}%)
                        </AppText>
                      </XStack>
                    ))}
                  </YStack>
                </>
              )}
            </Card>

            {/* ── Productos más vendidos ── */}
            <Card>
              <AppText fontSize={15} fontWeight="800">Productos más vendidos</AppText>
              {data.bestSellers.length === 0 ? (
                <EmptyState icon="cube-outline" mensaje="Sin productos vendidos en este periodo." />
              ) : data.bestSellers.map((p, i) => (
                <XStack key={p.id} alignItems="center" gap={12}>
                  <YStack
                    width={26}
                    height={26}
                    borderRadius={13}
                    backgroundColor="$primarySoft"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <AppText tone="primary" fontWeight="800" fontSize={13}>{i + 1}</AppText>
                  </YStack>
                  <YStack flex={1}>
                    <XStack justifyContent="space-between" gap={8}>
                      <AppText flex={1} fontSize={13} fontWeight="700" numberOfLines={1}>{p.nombre}</AppText>
                      <AppText fontSize={12} fontWeight="800">{p.cantidad} u.</AppText>
                    </XStack>
                    <YStack height={8} backgroundColor="$line" borderRadius={4} marginTop={5} overflow="hidden">
                      <YStack
                        height={8}
                        backgroundColor="$primary"
                        borderRadius={4}
                        width={`${Math.round((p.cantidad / maxCantidad) * 100)}%`}
                      />
                    </YStack>
                    <AppText fontSize={11} tone="muted" marginTop={4}>{p.categoria} · {money(p.total)}</AppText>
                  </YStack>
                </XStack>
              ))}
            </Card>

            <AppText textAlign="center" color="#B5B5B5" fontSize={11} marginTop={8}>
              Acceso exclusivo Master · Yakult Aguascalientes
            </AppText>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
