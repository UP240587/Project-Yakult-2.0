import { useCallback, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { Redirect, useFocusEffect } from 'expo-router';
import AppHeader from '../../components/AppHeader';
import { DashboardDB } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

// ── Paleta (RNF-46): rojo / blanco / gris / negro ──
const C = {
  bg: '#F2F3F5',
  card: '#FFFFFF',
  primary: '#E63946',
  primarySoft: '#FDECEE',
  ink: '#1A1A1A',
  muted: '#7A7A7A',
  line: '#ECECEC',
};

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

const sombra = {
  elevation: 2,
  shadowColor: '#000',
  shadowOpacity: 0.06,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
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

  const RESUMEN = data ? [
    { label: 'Ventas Totales', valor: money(data.resumen.ventasTotales), icono: '💰' },
    { label: 'Órdenes Totales', valor: String(data.resumen.ordenesTotales), icono: '🧾' },
    { label: 'Clientes', valor: String(data.resumen.clientesActivos), icono: '👥' },
    { label: 'Productos Vendidos', valor: String(data.resumen.productosVendidos), icono: '📦' },
  ] : [];

  return (
    <View style={s.pantalla}>
      {/* Barra de navegación superior + perfil (avatar/nombre/rol) en la esquina sup. izq. */}
      <AppHeader titulo="Dashboard" subtitulo={usuario ? `${usuario.nombre} · ${usuario.rol}` : undefined} />

      <ScrollView contentContainerStyle={s.contenido}>
        {/* Título grande en negrita */}
        <Text style={s.tituloGrande}>Statistics Dashboard</Text>
        <Text style={s.subtitulo}>
          {aplicado ? `Periodo: ${aplicado.fechaInicio} a ${aplicado.fechaFin}` : 'Resumen histórico completo'}
        </Text>

        {/* ── Tarjetas de resumen (horizontales / responsive) ── */}
        <View style={s.resumenRow}>
          {(cargando && !data ? [0, 1, 2, 3] : RESUMEN).map((item: any, i) => (
            <View key={i} style={s.resumenCard}>
              {data ? (
                <>
                  <Text style={s.resumenIcono}>{item.icono}</Text>
                  <Text style={s.resumenValor} numberOfLines={1} adjustsFontSizeToFit>{item.valor}</Text>
                  <Text style={s.resumenLabel}>{item.label}</Text>
                </>
              ) : (
                <ActivityIndicator color={C.primary} />
              )}
            </View>
          ))}
        </View>

        {/* ── Filtro de fechas (sobre los gráficos) ── */}
        <View style={s.card}>
          <Text style={s.cardTitulo}>Filtro de fechas</Text>
          <View style={s.filtroRow}>
            <View style={s.filtroCampo}>
              <Text style={s.label}>Start Date</Text>
              <TextInput
                style={s.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#B5B5B5"
                value={startDate}
                onChangeText={setStartDate}
                autoCapitalize="none"
              />
            </View>
            <View style={s.filtroCampo}>
              <Text style={s.label}>End Date</Text>
              <TextInput
                style={s.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#B5B5B5"
                value={endDate}
                onChangeText={setEndDate}
                autoCapitalize="none"
              />
            </View>
          </View>
          <View style={s.filtroAcciones}>
            <TouchableOpacity style={s.btnPrimario} onPress={aplicarFiltro} activeOpacity={0.85}>
              <Text style={s.btnPrimarioTxt}>Apply Filter</Text>
            </TouchableOpacity>
            {aplicado && (
              <TouchableOpacity style={s.btnGhost} onPress={limpiarFiltro} activeOpacity={0.7}>
                <Text style={s.btnGhostTxt}>Limpiar</Text>
              </TouchableOpacity>
            )}
          </View>
          {error ? <Text style={s.error}>{error}</Text> : null}
        </View>

        {cargando ? (
          <ActivityIndicator style={{ marginTop: 30 }} size="large" color={C.primary} />
        ) : !data ? null : (
          <>
            {/* ── Gráfico de ventas (cronológico) ── */}
            <View style={s.card}>
              <Text style={s.cardTitulo}>Ventas por día</Text>
              {data.ventasChart.length === 0 ? (
                <Text style={s.vacio}>Sin ventas completadas en este periodo.</Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.grafica}>
                  {data.ventasChart.map((v) => (
                    <View key={v.fecha} style={s.barraWrap}>
                      <Text style={s.barraValor}>{compact(v.total)}</Text>
                      <View style={[s.barra, { height: Math.max(6, Math.round((v.total / maxVenta) * 130)) }]} />
                      <Text style={s.barraLabel} numberOfLines={1}>{v.etiqueta}</Text>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* ── Estado de las órdenes (distribución tipo pastel apilada) ── */}
            <View style={s.card}>
              <Text style={s.cardTitulo}>Estado de las órdenes</Text>
              {totalOrdenesEstado === 0 ? (
                <Text style={s.vacio}>Sin órdenes en este periodo.</Text>
              ) : (
                <>
                  <View style={s.stack}>
                    {data.ordenesPorEstado.map((e) => (
                      <View
                        key={e.estado}
                        style={{
                          flex: e.cantidad,
                          backgroundColor: ESTADO_COLOR[e.estado] ?? C.muted,
                        }}
                      />
                    ))}
                  </View>
                  <View style={s.leyenda}>
                    {data.ordenesPorEstado.map((e) => (
                      <View key={e.estado} style={s.leyendaItem}>
                        <View style={[s.punto, { backgroundColor: ESTADO_COLOR[e.estado] ?? C.muted }]} />
                        <Text style={s.leyendaTxt}>
                          {e.estado}: <Text style={s.leyendaNum}>{e.cantidad}</Text>{' '}
                          ({Math.round((e.cantidad / totalOrdenesEstado) * 100)}%)
                        </Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </View>

            {/* ── Productos más vendidos ── */}
            <View style={s.card}>
              <Text style={s.cardTitulo}>Productos más vendidos</Text>
              {data.bestSellers.length === 0 ? (
                <Text style={s.vacio}>Sin productos vendidos en este periodo.</Text>
              ) : data.bestSellers.map((p, i) => (
                <View key={p.id} style={s.bsFila}>
                  <Text style={s.bsRank}>{i + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <View style={s.bsTop}>
                      <Text style={s.bsNombre} numberOfLines={1}>{p.nombre}</Text>
                      <Text style={s.bsCantidad}>{p.cantidad} u.</Text>
                    </View>
                    <View style={s.bsTrack}>
                      <View style={[s.bsFill, { width: `${Math.round((p.cantidad / maxCantidad) * 100)}%` }]} />
                    </View>
                    <Text style={s.bsMeta}>{p.categoria} · {money(p.total)}</Text>
                  </View>
                </View>
              ))}
            </View>

            <Text style={s.footer}>Acceso exclusivo Master · Yakult Aguascalientes</Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  pantalla:     { flex: 1, backgroundColor: C.bg },
  contenido:    { padding: 16, gap: 14, paddingBottom: 40 },

  tituloGrande: { fontSize: 28, fontWeight: '800', color: C.ink, letterSpacing: -0.5 },
  subtitulo:    { fontSize: 13, color: C.muted, marginTop: -6 },

  // Resumen
  resumenRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  resumenCard:  { flexGrow: 1, flexBasis: 150, minWidth: 150, backgroundColor: C.card, borderRadius: 16, padding: 16, ...sombra },
  resumenIcono: { fontSize: 20 },
  resumenValor: { fontSize: 22, fontWeight: '800', color: C.primary, marginTop: 6 },
  resumenLabel: { fontSize: 12, color: C.muted, marginTop: 2, fontWeight: '600' },

  // Cards genéricas
  card:         { backgroundColor: C.card, borderRadius: 16, padding: 16, gap: 12, ...sombra },
  cardTitulo:   { fontSize: 15, fontWeight: '800', color: C.ink },

  // Filtro
  filtroRow:    { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  filtroCampo:  { flexGrow: 1, flexBasis: 130, gap: 6 },
  label:        { fontSize: 11, color: C.muted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  input:        { borderWidth: 1, borderColor: C.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: C.ink, backgroundColor: '#FAFAFA' },
  filtroAcciones:{ flexDirection: 'row', alignItems: 'center', gap: 10 },
  btnPrimario:  { backgroundColor: C.primary, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 22, ...sombra },
  btnPrimarioTxt:{ color: '#FFF', fontWeight: '800', fontSize: 14 },
  btnGhost:     { paddingVertical: 12, paddingHorizontal: 12 },
  btnGhostTxt:  { color: C.muted, fontWeight: '700', fontSize: 13 },
  error:        { color: C.primary, fontSize: 12, fontWeight: '600' },

  // Gráfico de barras
  grafica:      { alignItems: 'flex-end', gap: 14, paddingVertical: 8, minHeight: 180 },
  barraWrap:    { width: 48, alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  barraValor:   { fontSize: 10, color: C.muted, fontWeight: '700' },
  barra:        { width: 26, borderRadius: 8, backgroundColor: C.primary },
  barraLabel:   { fontSize: 10, color: C.muted },

  // Stack de estados
  stack:        { flexDirection: 'row', height: 22, borderRadius: 11, overflow: 'hidden', backgroundColor: C.line },
  leyenda:      { gap: 8 },
  leyendaItem:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  punto:        { width: 11, height: 11, borderRadius: 6 },
  leyendaTxt:   { fontSize: 13, color: C.ink },
  leyendaNum:   { fontWeight: '800' },

  // Best sellers
  bsFila:       { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bsRank:       { width: 26, height: 26, borderRadius: 13, backgroundColor: C.primarySoft, color: C.primary, textAlign: 'center', lineHeight: 26, fontWeight: '800', fontSize: 13 },
  bsTop:        { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  bsNombre:     { flex: 1, fontSize: 13, fontWeight: '700', color: C.ink },
  bsCantidad:   { fontSize: 12, fontWeight: '800', color: C.ink },
  bsTrack:      { height: 8, backgroundColor: C.line, borderRadius: 4, marginTop: 5, overflow: 'hidden' },
  bsFill:       { height: 8, backgroundColor: C.primary, borderRadius: 4 },
  bsMeta:       { fontSize: 11, color: C.muted, marginTop: 4 },

  vacio:        { textAlign: 'center', color: C.muted, paddingVertical: 16 },
  footer:       { textAlign: 'center', color: '#B5B5B5', fontSize: 11, marginTop: 8 },
});
