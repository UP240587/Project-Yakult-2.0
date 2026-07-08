import { useCallback, useMemo, useState } from 'react';
import { ScrollView, Platform, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { XStack, YStack } from 'tamagui';
import { useFocusEffect } from 'expo-router';
import AppHeader from '../../components/AppHeader';
import { ReportesDB } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { colors } from '../../tamagui.config';
import {
  AppButton, AppText, Card, Chip, EmptyState, Loading, Screen, SectionHeader, a11yState, type IconName,
} from '../../components/ui';

type Agrupacion = 'dia' | 'semana' | 'mes' | 'anio';
type Vista = 'generar' | 'historial';
type CampoFecha = 'fechaInicio' | 'fechaFin';

type Filtros = {
  fechaInicio: string;
  fechaFin: string;
  clienteId: number | null;
  productoId: number | null;
  categoria: string | null;
  vendedorId: number | null;
  agrupacion: Agrupacion;
};

type Opcion = { id: number; nombre: string; categoria?: string; rol?: string };
type VentaReporte = {
  numeroVenta: number;
  fecha: string;
  cliente: string;
  vendedor: string;
  productosVendidos: string;
  cantidad: number;
  total: number;
};
type Resultado = {
  id: number;
  nombre: string;
  filtros: Filtros;
  resumen: { totalVentas: number; unidadesVendidas: number; ingresosTotales: number };
  ventas: VentaReporte[];
  productosMasVendidos: Array<{ id: number; nombre: string; categoria: string; cantidad: number; total: number }>;
  estadisticas: Array<{ clave: string; etiqueta: string; ventas: number; ingresos: number }>;
  generadoPor?: { nombre: string; rol: string };
};

const AGRUPACIONES: Array<{ key: Agrupacion; label: string }> = [
  { key: 'dia', label: 'Día' },
  { key: 'semana', label: 'Semana' },
  { key: 'mes', label: 'Mes' },
  { key: 'anio', label: 'Año' },
];

const DIAS_SEMANA = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const GRAFICA_COLORES = ['#E63946', '#2A9D8F', '#457B9D', '#F4A261', '#7B61FF', '#6A994E', '#D62828', '#118AB2'];
const MEDALLAS = ['#F4B400', '#B9C0CC', '#CD7F32'];

const rangoInicial = () => {
  const hoy = new Date();
  const yyyy = hoy.getFullYear();
  const mm = String(hoy.getMonth() + 1).padStart(2, '0');
  const dd = String(hoy.getDate()).padStart(2, '0');
  return { fechaInicio: `${yyyy}-${mm}-01`, fechaFin: `${yyyy}-${mm}-${dd}` };
};

const parseFecha = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return new Date();
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
};

const formatoFecha = (fecha: Date) => {
  const yyyy = fecha.getFullYear();
  const mm = String(fecha.getMonth() + 1).padStart(2, '0');
  const dd = String(fecha.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const claveMes = (fecha: Date) => `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;

const moverMes = (mes: string, delta: number) => {
  const [yyyy, mm] = mes.split('-').map(Number);
  return claveMes(new Date(yyyy, mm - 1 + delta, 1));
};

const diasCalendario = (mes: string) => {
  const [yyyy, mm] = mes.split('-').map(Number);
  const primero = new Date(yyyy, mm - 1, 1);
  const offset = (primero.getDay() + 6) % 7;
  const inicio = new Date(yyyy, mm - 1, 1 - offset);
  return Array.from({ length: 42 }, (_, index) => {
    const fecha = new Date(inicio);
    fecha.setDate(inicio.getDate() + index);
    return {
      key: formatoFecha(fecha),
      fecha,
      dia: fecha.getDate(),
      enMes: fecha.getMonth() === mm - 1,
    };
  });
};

// Etiqueta pequeña en mayúsculas para los filtros
const Label = ({ children }: { children: React.ReactNode }) => (
  <AppText fontSize={12} tone="muted" fontWeight="700" marginTop={2} textTransform="uppercase" letterSpacing={0.3}>
    {children}
  </AppText>
);

export default function ReportesScreen() {
  const { usuario } = useAuth();
  const { mostrar } = useToast();
  const [vista, setVista] = useState<Vista>('generar');
  const [cargando, setCargando] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState('');
  const [opciones, setOpciones] = useState<{ clientes: Opcion[]; productos: Opcion[]; categorias: string[]; vendedores: Opcion[] }>({
    clientes: [],
    productos: [],
    categorias: [],
    vendedores: [],
  });
  const [historial, setHistorial] = useState<any[]>([]);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [calendario, setCalendario] = useState<{ campo: CampoFecha; mes: string } | null>(null);
  const [filtros, setFiltros] = useState<Filtros>(() => ({
    ...rangoInicial(),
    clienteId: null,
    productoId: null,
    categoria: null,
    vendedorId: null,
    agrupacion: 'dia',
  }));

  useFocusEffect(useCallback(() => { cargarBase(); }, []));

  const cargarBase = async () => {
    setCargando(true);
    setError('');
    const [opc, hist] = await Promise.all([ReportesDB.opciones(), ReportesDB.historial()]);
    if (opc.error || hist.error) {
      setError(opc.error || hist.error);
    } else {
      setOpciones(opc);
      setHistorial(hist);
    }
    setCargando(false);
  };

  const setFiltro = <K extends keyof Filtros>(key: K, value: Filtros[K]) => {
    setFiltros((prev) => ({ ...prev, [key]: value }));
  };

  // Cuántos filtros (aparte del rango de fechas) están activos.
  const filtrosActivos = [filtros.clienteId, filtros.productoId, filtros.categoria, filtros.vendedorId]
    .filter((v) => v !== null).length;

  const limpiarFiltros = () => {
    setFiltros((prev) => ({ ...prev, clienteId: null, productoId: null, categoria: null, vendedorId: null }));
  };

  const generar = async () => {
    setGenerando(true);
    setError('');
    const res = await ReportesDB.generar(filtros);
    if (res.error) {
      setError(res.error);
      mostrar(res.error, 'error');
    } else {
      setResultado(res);
      setVista('generar');
      mostrar('Reporte generado correctamente', 'success');
      const hist = await ReportesDB.historial();
      if (!hist.error) setHistorial(hist);
    }
    setGenerando(false);
  };

  const abrirHistorial = async (id: number) => {
    setGenerando(true);
    setError('');
    const res = await ReportesDB.obtener(id);
    if (res.error) {
      setError(res.error);
    } else {
      setResultado(res);
      setFiltros(res.filtros);
      setVista('generar');
    }
    setGenerando(false);
  };

  const abrirUrl = async (url: string) => {
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
      return;
    }
    await Linking.openURL(url);
  };

  const abrirCalendario = (campo: CampoFecha) => {
    setCalendario({ campo, mes: claveMes(parseFecha(filtros[campo])) });
  };

  const seleccionarFecha = (fecha: Date) => {
    if (!calendario) return;
    setFiltro(calendario.campo, formatoFecha(fecha));
    setCalendario(null);
  };

  const exportarPdf = () => {
    if (!resultado?.id) {
      setError('Genera o abre un reporte antes de exportar.');
      return;
    }
    mostrar('Descargando PDF…', 'info');
    abrirUrl(ReportesDB.exportUrl(resultado.id));
  };

  const imprimir = () => {
    if (!resultado?.id) {
      setError('Genera o abre un reporte antes de imprimir.');
      return;
    }
    mostrar('Abriendo impresión…', 'info');
    abrirUrl(ReportesDB.imprimirUrl(resultado.id));
  };

  const maxIngreso = useMemo(
    () => Math.max(1, ...(resultado?.estadisticas ?? []).map((e) => e.ingresos)),
    [resultado]
  );

  const money = (value: number) => `$${Number(value || 0).toFixed(2)}`;

  const FechaBoton = ({ campo, label }: { campo: CampoFecha; label: string }) => {
    const activo = calendario?.campo === campo;
    return (
      <YStack flex={1} gap={6}>
        <Label>{label}</Label>
        <XStack
          minHeight={44}
          backgroundColor={activo ? '$primaryTint' : '$field'}
          borderWidth={1}
          borderColor={activo ? '$primary' : '$line'}
          borderRadius={12}
          paddingHorizontal={10}
          alignItems="center"
          gap={6}
          cursor="pointer"
          pressStyle={{ opacity: 0.8 }}
          accessibilityRole="button"
          accessibilityLabel={`Seleccionar ${label.toLowerCase()}`}
          onPress={() => abrirCalendario(campo)}
        >
          <Ionicons name="calendar-outline" size={15} color={activo ? colors.primary : colors.muted} />
          <AppText flex={1} fontSize={13} fontWeight="700">{filtros[campo]}</AppText>
          <Ionicons name="chevron-down" size={14} color={colors.muted} />
        </XStack>
      </YStack>
    );
  };

  const MiniCalendario = () => {
    if (!calendario) return null;
    const [yyyy, mm] = calendario.mes.split('-').map(Number);
    const valorActivo = filtros[calendario.campo];
    const hoy = new Date();
    hoy.setHours(23, 59, 59, 999);

    const CalNav = ({ icon, delta }: { icon: IconName; delta: number }) => (
      <YStack
        width={30}
        height={30}
        borderRadius={9}
        backgroundColor="$card"
        alignItems="center"
        justifyContent="center"
        borderWidth={1}
        borderColor="$line"
        cursor="pointer"
        pressStyle={{ opacity: 0.7 }}
        accessibilityRole="button"
        onPress={() => setCalendario({ ...calendario, mes: moverMes(calendario.mes, delta) })}
      >
        <Ionicons name={icon} size={16} color={colors.primary} />
      </YStack>
    );

    return (
      <YStack
        alignSelf="center"
        width="100%"
        maxWidth={300}
        backgroundColor="$field"
        borderWidth={1}
        borderColor="$line"
        borderRadius={14}
        padding={10}
        gap={8}
      >
        <XStack alignItems="center" justifyContent="space-between">
          <CalNav icon="chevron-back" delta={-1} />
          <AppText fontSize={13} fontWeight="800">{MESES[mm - 1]} {yyyy}</AppText>
          <CalNav icon="chevron-forward" delta={1} />
        </XStack>

        <XStack>
          {DIAS_SEMANA.map((dia, index) => (
            <AppText key={`${dia}-${index}`} width={`${100 / 7}%`} textAlign="center" fontSize={10} tone="muted" fontWeight="800">
              {dia}
            </AppText>
          ))}
        </XStack>

        <XStack flexWrap="wrap">
          {diasCalendario(calendario.mes).map((item) => {
            const activo = item.key === valorActivo;
            const esFuturo = item.fecha > hoy;
            return (
              <YStack
                key={item.key}
                width={`${100 / 7}%`}
                aspectRatio={1.3}
                alignItems="center"
                justifyContent="center"
                borderRadius={9}
                backgroundColor={activo ? '$primary' : 'transparent'}
                opacity={esFuturo ? 0.25 : !item.enMes ? 0.45 : 1}
                cursor={esFuturo ? 'default' : 'pointer'}
                pressStyle={{ opacity: 0.7 }}
                accessibilityRole="button"
                {...a11yState({ selected: activo, disabled: esFuturo })}
                accessibilityLabel={`Seleccionar ${item.key}`}
                onPress={esFuturo ? undefined : () => seleccionarFecha(item.fecha)}
              >
                <AppText
                  fontSize={12}
                  fontWeight="700"
                  color={activo ? '#FFF' : esFuturo ? '#CCC' : !item.enMes ? '#999' : '#333'}
                >
                  {item.dia}
                </AppText>
              </YStack>
            );
          })}
        </XStack>
      </YStack>
    );
  };

  const RESUMEN_CARDS: Array<{ icon: IconName; color: string; valor: (r: Resultado) => string | number; label: string }> = [
    { icon: 'receipt-outline', color: '#457B9D', valor: (r) => r.resumen.totalVentas, label: 'Ventas' },
    { icon: 'cube-outline', color: '#2A9D8F', valor: (r) => r.resumen.unidadesVendidas, label: 'Unidades' },
    { icon: 'cash-outline', color: colors.primary, valor: (r) => money(r.resumen.ingresosTotales), label: 'Ingresos' },
  ];

  return (
    <Screen>
      <AppHeader titulo="Reportes" subtitulo={usuario ? `Sesión: ${usuario.nombre}` : undefined} />

      <YStack backgroundColor="$card" paddingHorizontal={16} paddingVertical={10} borderBottomWidth={1} borderBottomColor="$line">
        <XStack backgroundColor="$field" borderRadius={12} padding={4} gap={4}>
          {(['generar', 'historial'] as Vista[]).map((v) => (
            <XStack
              key={v}
              flex={1}
              paddingVertical={10}
              borderRadius={9}
              alignItems="center"
              justifyContent="center"
              gap={6}
              backgroundColor={vista === v ? '$primary' : 'transparent'}
              cursor="pointer"
              pressStyle={{ opacity: 0.8 }}
              accessibilityRole="tab"
              {...a11yState({ selected: vista === v })}
              onPress={() => setVista(v)}
            >
              <Ionicons
                name={v === 'generar' ? 'bar-chart-outline' : 'time-outline'}
                size={15}
                color={vista === v ? '#FFF' : colors.muted}
              />
              <AppText fontSize={13} fontWeight={vista === v ? '700' : '600'} color={vista === v ? '#FFF' : '$muted'}>
                {v === 'generar' ? 'Generar' : 'Historial'}
              </AppText>
            </XStack>
          ))}
        </XStack>
      </YStack>

      {cargando ? (
        <Loading />
      ) : (
        <>
          {error ? (
            <XStack
              backgroundColor="$dangerSoft"
              alignItems="center"
              gap={8}
              padding={12}
              marginHorizontal={16}
              marginTop={10}
              borderRadius={12}
            >
              <Ionicons name="alert-circle" size={16} color="#B71C1C" />
              <AppText accessibilityRole="alert" flex={1} color="#B71C1C" fontSize={12} fontWeight="600">{error}</AppText>
            </XStack>
          ) : null}

          {vista === 'generar' && (
            <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
              <Card>
                <SectionHeader icon="calendar-outline" paso="Paso 1" titulo="Rango de fechas" />
                <XStack gap={10}>
                  <FechaBoton campo="fechaInicio" label="Inicio" />
                  <FechaBoton campo="fechaFin" label="Fin" />
                </XStack>
                <MiniCalendario />
              </Card>

              <Card>
                <SectionHeader
                  icon="options-outline"
                  paso="Paso 2"
                  titulo="Filtros"
                  right={filtrosActivos > 0 ? (
                    <XStack
                      alignItems="center"
                      gap={4}
                      backgroundColor="$primarySoft"
                      paddingHorizontal={10}
                      paddingVertical={6}
                      borderRadius={20}
                      cursor="pointer"
                      pressStyle={{ opacity: 0.7 }}
                      accessibilityRole="button"
                      accessibilityLabel="Limpiar filtros"
                      onPress={limpiarFiltros}
                    >
                      <Ionicons name="close-circle" size={14} color={colors.primary} />
                      <AppText tone="primary" fontSize={11} fontWeight="800">Limpiar ({filtrosActivos})</AppText>
                    </XStack>
                  ) : undefined}
                />

                <Label>Cliente</Label>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
                  <Chip minWidth={86} active={!filtros.clienteId} onPress={() => setFiltro('clienteId', null)}>Todos</Chip>
                  {opciones.clientes.map((c) => (
                    <Chip key={c.id} minWidth={86} maxWidth={190} active={filtros.clienteId === c.id} onPress={() => setFiltro('clienteId', c.id)}>
                      {c.nombre}
                    </Chip>
                  ))}
                </ScrollView>

                <Label>Producto</Label>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
                  <Chip minWidth={86} active={!filtros.productoId} onPress={() => setFiltro('productoId', null)}>Todos</Chip>
                  {opciones.productos.map((p) => (
                    <Chip key={p.id} minWidth={86} maxWidth={190} active={filtros.productoId === p.id} onPress={() => setFiltro('productoId', p.id)}>
                      {p.nombre}
                    </Chip>
                  ))}
                </ScrollView>

                <Label>Categoría</Label>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
                  <Chip minWidth={74} compact active={!filtros.categoria} onPress={() => setFiltro('categoria', null)}>Todas</Chip>
                  {opciones.categorias.map((cat) => (
                    <Chip key={cat} minWidth={74} maxWidth={190} compact active={filtros.categoria === cat} onPress={() => setFiltro('categoria', cat)}>
                      {cat}
                    </Chip>
                  ))}
                </ScrollView>

                <Label>Vendedor</Label>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
                  <Chip minWidth={86} active={!filtros.vendedorId} onPress={() => setFiltro('vendedorId', null)}>Todos</Chip>
                  {opciones.vendedores.map((v) => (
                    <Chip key={v.id} minWidth={86} maxWidth={190} active={filtros.vendedorId === v.id} onPress={() => setFiltro('vendedorId', v.id)}>
                      {v.nombre}
                    </Chip>
                  ))}
                </ScrollView>

                <Label>Agrupar estadísticas por</Label>
                <XStack backgroundColor="$field" borderRadius={12} padding={4} gap={4}>
                  {AGRUPACIONES.map((a) => (
                    <YStack
                      key={a.key}
                      flex={1}
                      paddingVertical={9}
                      alignItems="center"
                      borderRadius={9}
                      backgroundColor={filtros.agrupacion === a.key ? '$card' : 'transparent'}
                      cursor="pointer"
                      pressStyle={{ opacity: 0.8 }}
                      accessibilityRole="button"
                      {...a11yState({ selected: filtros.agrupacion === a.key })}
                      onPress={() => setFiltro('agrupacion', a.key)}
                    >
                      <AppText
                        fontSize={12}
                        fontWeight={filtros.agrupacion === a.key ? '800' : '600'}
                        color={filtros.agrupacion === a.key ? '$primary' : '$muted'}
                      >
                        {a.label}
                      </AppText>
                    </YStack>
                  ))}
                </XStack>
              </Card>

              <Card>
                <SectionHeader icon="document-text-outline" paso="Paso 3" titulo="Generar reporte" />
                <AppButton
                  icon="sparkles-outline"
                  loading={generando}
                  disabled={generando}
                  onPress={generar}
                >
                  Generar reporte
                </AppButton>
              </Card>

              {resultado && (
                <>
                  <Card>
                    <SectionHeader icon="share-outline" titulo="Descargar / Imprimir" />
                    <XStack gap={10}>
                      <AppButton flex={1.4} backgroundColor="#2A9D8F" icon="download-outline" onPress={exportarPdf}>
                        Descargar PDF
                      </AppButton>
                      <AppButton flex={1} variant="secondary" icon="print-outline" onPress={imprimir}>
                        Imprimir
                      </AppButton>
                    </XStack>
                  </Card>

                  <XStack gap={10}>
                    {RESUMEN_CARDS.map((rc) => (
                      <Card key={rc.label} flex={1} paddingVertical={16} paddingHorizontal={8} alignItems="center" gap={6}>
                        <YStack
                          width={34}
                          height={34}
                          borderRadius={11}
                          backgroundColor={`${rc.color}1A`}
                          alignItems="center"
                          justifyContent="center"
                        >
                          <Ionicons name={rc.icon} size={16} color={rc.color} />
                        </YStack>
                        <AppText fontSize={18} fontWeight="900" color={rc.color} numberOfLines={1} adjustsFontSizeToFit>
                          {rc.valor(resultado)}
                        </AppText>
                        <AppText fontSize={11} tone="muted" fontWeight="600">{rc.label}</AppText>
                      </Card>
                    ))}
                  </XStack>

                  <Card>
                    <SectionHeader
                      icon="trending-up-outline"
                      titulo={`Ingresos por ${AGRUPACIONES.find((a) => a.key === resultado.filtros.agrupacion)?.label.toLowerCase()}`}
                    />
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ minHeight: 180, paddingHorizontal: 4, paddingTop: 8, paddingBottom: 4, gap: 14, alignItems: 'flex-end' }}
                    >
                      {resultado.estadisticas.length === 0 ? (
                        <AppText textAlign="center" tone="muted" marginTop={10} fontSize={13}>Sin datos para graficar.</AppText>
                      ) : resultado.estadisticas.map((item, index) => (
                        <YStack key={item.clave} width={66} alignItems="center" justifyContent="flex-end" gap={6}>
                          <AppText fontSize={9} fontWeight="700" height={14} color={GRAFICA_COLORES[index % GRAFICA_COLORES.length]}>
                            {money(item.ingresos)}
                          </AppText>
                          <YStack justifyContent="flex-end" minHeight={120}>
                            <YStack
                              accessibilityLabel={`${item.etiqueta}: ${money(item.ingresos)}`}
                              width={30}
                              borderTopLeftRadius={8}
                              borderTopRightRadius={8}
                              height={Math.max(8, Math.round((item.ingresos / maxIngreso) * 120))}
                              backgroundColor={GRAFICA_COLORES[index % GRAFICA_COLORES.length]}
                            />
                          </YStack>
                          <AppText fontSize={10} tone="muted" width={64} textAlign="center" fontWeight="600" numberOfLines={1}>
                            {item.etiqueta}
                          </AppText>
                        </YStack>
                      ))}
                    </ScrollView>
                  </Card>

                  <Card>
                    <SectionHeader icon="trophy-outline" titulo="Productos más vendidos" />
                    {resultado.productosMasVendidos.length === 0 ? (
                      <AppText textAlign="center" tone="muted" marginTop={10} fontSize={13}>Sin productos vendidos.</AppText>
                    ) : resultado.productosMasVendidos.map((p, index) => (
                      <XStack
                        key={p.id}
                        alignItems="center"
                        gap={12}
                        paddingVertical={10}
                        borderTopWidth={index > 0 ? 1 : 0}
                        borderTopColor="$line"
                      >
                        <YStack
                          width={28}
                          height={28}
                          borderRadius={9}
                          backgroundColor={index < 3 ? `${MEDALLAS[index]}22` : '$field'}
                          alignItems="center"
                          justifyContent="center"
                        >
                          <AppText fontWeight="900" fontSize={13} color={index < 3 ? MEDALLAS[index] : '$muted'}>
                            {index + 1}
                          </AppText>
                        </YStack>
                        <YStack flex={1}>
                          <AppText fontSize={13} fontWeight="700" numberOfLines={1}>{p.nombre}</AppText>
                          <AppText fontSize={11} tone="muted" marginTop={2}>{p.categoria} · {p.cantidad} unidades</AppText>
                        </YStack>
                        <AppText fontSize={14} fontWeight="900">{money(p.total)}</AppText>
                      </XStack>
                    ))}
                  </Card>

                  <SectionHeader icon="list-outline" titulo="Detalle de ventas" />
                  {resultado.ventas.length === 0 ? (
                    <Card>
                      <AppText textAlign="center" tone="muted" marginTop={10} fontSize={13}>Sin ventas para este rango.</AppText>
                    </Card>
                  ) : resultado.ventas.map((v) => (
                    <Card key={v.numeroVenta} gap={8} padding={14}>
                      <XStack justifyContent="space-between" alignItems="center" gap={10}>
                        <AppText flex={1} fontSize={13} fontWeight="800" numberOfLines={1}>#{v.numeroVenta} · {v.cliente}</AppText>
                        <AppText fontSize={14} fontWeight="900" tone="primary">{money(v.total)}</AppText>
                      </XStack>
                      <XStack alignItems="center" gap={4} flexWrap="wrap">
                        <Ionicons name="calendar-clear-outline" size={12} color={colors.muted} />
                        <AppText fontSize={11} tone="muted" fontWeight="600">{v.fecha}</AppText>
                        <Ionicons name="person-outline" size={12} color={colors.muted} style={{ marginLeft: 8 }} />
                        <AppText fontSize={11} tone="muted" fontWeight="600">{v.vendedor}</AppText>
                      </XStack>
                      <AppText fontSize={12} color="#444" lineHeight={17}>{v.productosVendidos}</AppText>
                      <XStack alignSelf="flex-start" backgroundColor="$field" paddingHorizontal={10} paddingVertical={4} borderRadius={8}>
                        <AppText fontSize={11} color="#555" fontWeight="700">{v.cantidad} unidades</AppText>
                      </XStack>
                    </Card>
                  ))}
                </>
              )}
            </ScrollView>
          )}

          {vista === 'historial' && (
            <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
              {historial.length === 0 ? (
                <Card alignItems="center" paddingVertical={32}>
                  <EmptyState icon="folder-open-outline" mensaje="Sin reportes generados." />
                </Card>
              ) : historial.map((r) => (
                <Card
                  key={r.id}
                  flexDirection="row"
                  alignItems="center"
                  gap={12}
                  padding={14}
                  cursor="pointer"
                  pressStyle={{ opacity: 0.85 }}
                  accessibilityRole="button"
                  accessibilityLabel={`Abrir ${r.nombre}`}
                  onPress={() => abrirHistorial(r.id)}
                >
                  <YStack
                    width={40}
                    height={40}
                    borderRadius={12}
                    backgroundColor="$primarySoft"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Ionicons name="document-text-outline" size={18} color={colors.primary} />
                  </YStack>
                  <YStack flex={1}>
                    <AppText fontSize={14} fontWeight="800" numberOfLines={1}>{r.nombre}</AppText>
                    <AppText fontSize={11} tone="muted" marginTop={2}>{r.fechaInicio} a {r.fechaFin} · {r.generadoPor}</AppText>
                    <AppText fontSize={11} tone="muted" marginTop={2}>{r.generadoEn}</AppText>
                  </YStack>
                  <YStack alignItems="flex-end">
                    <AppText fontSize={14} fontWeight="900" tone="primary">{money(r.ingresosTotales)}</AppText>
                    <AppText fontSize={11} tone="muted" marginTop={2}>{r.totalVentas} ventas</AppText>
                    <Ionicons name="chevron-forward" size={16} color={colors.muted} style={{ marginTop: 2 }} />
                  </YStack>
                </Card>
              ))}
            </ScrollView>
          )}
        </>
      )}
    </Screen>
  );
}
