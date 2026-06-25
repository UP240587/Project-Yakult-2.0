import { useCallback, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Platform, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import AppHeader from '../../components/AppHeader';
import { ReportesDB } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

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

// ── Paleta centralizada (theme) ──
const C = {
  bg: '#F4F5F7',
  card: '#FFFFFF',
  primary: '#E63946',
  primarySoft: '#FDECEE',
  primaryTint: '#FFF7F8',
  ink: '#1A1A2E',
  muted: '#8A8F99',
  line: '#ECECF1',
  field: '#F7F8FA',
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

// ── Componentes modulares reutilizables ──
const Card = ({ children, style }: { children: React.ReactNode; style?: any }) => (
  <View style={[s.card, style]}>{children}</View>
);

const SectionHeader = ({ icon, paso, titulo, right }: { icon: keyof typeof Ionicons.glyphMap; paso?: string; titulo: string; right?: React.ReactNode }) => (
  <View style={s.sectionHeader}>
    <View style={s.sectionIcon}>
      <Ionicons name={icon} size={16} color={C.primary} />
    </View>
    <View style={{ flex: 1 }}>
      {paso ? <Text style={s.sectionPaso}>{paso}</Text> : null}
      <Text style={s.sectionTitulo}>{titulo}</Text>
    </View>
    {right}
  </View>
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

  const Chip = ({
    label, active, onPress, compact = false,
  }: { label: string; active: boolean; onPress: () => void; compact?: boolean }) => (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      style={[s.chip, compact && s.chipCompacto, active && s.chipActivo]}
      onPress={onPress}
    >
      <Text style={[s.chipTxt, active && s.chipTxtActivo]} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );

  const FechaBoton = ({ campo, label }: { campo: CampoFecha; label: string }) => (
    <View style={s.campoFecha}>
      <Text style={s.label}>{label}</Text>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`Seleccionar ${label.toLowerCase()}`}
        style={[s.fechaBoton, calendario?.campo === campo && s.fechaBotonActivo]}
        onPress={() => abrirCalendario(campo)}
      >
        <Ionicons name="calendar-outline" size={15} color={calendario?.campo === campo ? C.primary : C.muted} />
        <Text style={s.fechaBotonTxt}>{filtros[campo]}</Text>
        <Ionicons name="chevron-down" size={14} color={C.muted} />
      </TouchableOpacity>
    </View>
  );

  const MiniCalendario = () => {
    if (!calendario) return null;
    const [yyyy, mm] = calendario.mes.split('-').map(Number);
    const valorActivo = filtros[calendario.campo];
    const hoy = new Date();
    hoy.setHours(23, 59, 59, 999);

    return (
      <View style={s.calendario}>
        <View style={s.calHeader}>
          <TouchableOpacity accessibilityRole="button" style={s.calNav} onPress={() => setCalendario({ ...calendario, mes: moverMes(calendario.mes, -1) })}>
            <Ionicons name="chevron-back" size={16} color={C.primary} />
          </TouchableOpacity>
          <Text style={s.calTitulo}>{MESES[mm - 1]} {yyyy}</Text>
          <TouchableOpacity accessibilityRole="button" style={s.calNav} onPress={() => setCalendario({ ...calendario, mes: moverMes(calendario.mes, 1) })}>
            <Ionicons name="chevron-forward" size={16} color={C.primary} />
          </TouchableOpacity>
        </View>

        <View style={s.calDias}>
          {DIAS_SEMANA.map((dia, index) => (
            <Text key={`${dia}-${index}`} style={s.calDiaNombre}>{dia}</Text>
          ))}
        </View>

        <View style={s.calGrid}>
          {diasCalendario(calendario.mes).map((item) => {
            const activo = item.key === valorActivo;
            const esFuturo = item.fecha > hoy;
            return (
              <TouchableOpacity
                key={item.key}
                accessibilityRole="button"
                accessibilityState={{ selected: activo }}
                accessibilityLabel={`Seleccionar ${item.key}`}
                style={[s.calDia, !item.enMes && s.calDiaFuera, activo && s.calDiaActivo, esFuturo && s.calDiaDeshabilitado]}
                onPress={() => seleccionarFecha(item.fecha)}
                disabled={esFuturo}
              >
                <Text style={[s.calDiaTxt, !item.enMes && s.calDiaTxtFuera, activo && s.calDiaTxtActivo, esFuturo && s.calDiaTxtDeshabilitado]}>{item.dia}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const RESUMEN_CARDS: Array<{ icon: keyof typeof Ionicons.glyphMap; color: string; valor: (r: Resultado) => string | number; label: string }> = [
    { icon: 'receipt-outline', color: '#457B9D', valor: (r) => r.resumen.totalVentas, label: 'Ventas' },
    { icon: 'cube-outline', color: '#2A9D8F', valor: (r) => r.resumen.unidadesVendidas, label: 'Unidades' },
    { icon: 'cash-outline', color: C.primary, valor: (r) => money(r.resumen.ingresosTotales), label: 'Ingresos' },
  ];

  return (
    <View style={s.pantalla}>
      <AppHeader titulo="Reportes" subtitulo={usuario ? `Sesión: ${usuario.nombre}` : undefined} />

      <View style={s.tabsWrap}>
        <View style={s.tabs}>
          {(['generar', 'historial'] as Vista[]).map((v) => (
            <TouchableOpacity
              key={v}
              accessibilityRole="tab"
              accessibilityState={{ selected: vista === v }}
              style={[s.tabBtn, vista === v && s.tabActivo]}
              onPress={() => setVista(v)}
            >
              <Ionicons
                name={v === 'generar' ? 'bar-chart-outline' : 'time-outline'}
                size={15}
                color={vista === v ? '#FFF' : C.muted}
              />
              <Text style={[s.tabTxt, vista === v && s.tabTxtActivo]}>
                {v === 'generar' ? 'Generar' : 'Historial'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {cargando ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={C.primary} />
      ) : (
        <>
          {error ? (
            <View style={s.error}>
              <Ionicons name="alert-circle" size={16} color="#B71C1C" />
              <Text accessibilityRole="alert" style={s.errorTxt}>{error}</Text>
            </View>
          ) : null}

          {vista === 'generar' && (
            <ScrollView contentContainerStyle={s.contenido} showsVerticalScrollIndicator={false}>
              <Card>
                <SectionHeader icon="calendar-outline" paso="Paso 1" titulo="Rango de fechas" />
                <View style={s.fechas}>
                  <FechaBoton campo="fechaInicio" label="Inicio" />
                  <FechaBoton campo="fechaFin" label="Fin" />
                </View>
                <MiniCalendario />
              </Card>

              <Card>
                <SectionHeader
                  icon="options-outline"
                  paso="Paso 2"
                  titulo="Filtros"
                  right={filtrosActivos > 0 ? (
                    <TouchableOpacity accessibilityRole="button" accessibilityLabel="Limpiar filtros" style={s.limpiarBtn} onPress={limpiarFiltros}>
                      <Ionicons name="close-circle" size={14} color={C.primary} />
                      <Text style={s.limpiarTxt}>Limpiar ({filtrosActivos})</Text>
                    </TouchableOpacity>
                  ) : undefined}
                />

                <Text style={s.label}>Cliente</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
                  <Chip label="Todos" active={!filtros.clienteId} onPress={() => setFiltro('clienteId', null)} />
                  {opciones.clientes.map((c) => (
                    <Chip key={c.id} label={c.nombre} active={filtros.clienteId === c.id} onPress={() => setFiltro('clienteId', c.id)} />
                  ))}
                </ScrollView>

                <Text style={s.label}>Producto</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
                  <Chip label="Todos" active={!filtros.productoId} onPress={() => setFiltro('productoId', null)} />
                  {opciones.productos.map((p) => (
                    <Chip key={p.id} label={p.nombre} active={filtros.productoId === p.id} onPress={() => setFiltro('productoId', p.id)} />
                  ))}
                </ScrollView>

                <Text style={s.label}>Categoría</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
                  <Chip label="Todas" active={!filtros.categoria} onPress={() => setFiltro('categoria', null)} compact />
                  {opciones.categorias.map((cat) => (
                    <Chip key={cat} label={cat} active={filtros.categoria === cat} onPress={() => setFiltro('categoria', cat)} compact />
                  ))}
                </ScrollView>

                <Text style={s.label}>Vendedor</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
                  <Chip label="Todos" active={!filtros.vendedorId} onPress={() => setFiltro('vendedorId', null)} />
                  {opciones.vendedores.map((v) => (
                    <Chip key={v.id} label={v.nombre} active={filtros.vendedorId === v.id} onPress={() => setFiltro('vendedorId', v.id)} />
                  ))}
                </ScrollView>

                <Text style={s.label}>Agrupar estadísticas por</Text>
                <View style={s.segmentos}>
                  {AGRUPACIONES.map((a) => (
                    <TouchableOpacity
                      key={a.key}
                      accessibilityRole="button"
                      accessibilityState={{ selected: filtros.agrupacion === a.key }}
                      style={[s.segmento, filtros.agrupacion === a.key && s.segmentoActivo]}
                      onPress={() => setFiltro('agrupacion', a.key)}
                    >
                      <Text style={[s.segmentoTxt, filtros.agrupacion === a.key && s.segmentoTxtActivo]}>{a.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Card>

              <Card>
                <SectionHeader icon="document-text-outline" paso="Paso 3" titulo="Generar reporte" />
                <TouchableOpacity
                  accessibilityRole="button"
                  style={[s.btnPrimario, generando && s.btnDeshabilitado]}
                  onPress={generar}
                  disabled={generando}
                >
                  {generando ? <ActivityIndicator color="#FFF" /> : (
                    <>
                      <Ionicons name="sparkles-outline" size={16} color="#FFF" />
                      <Text style={s.btnPrimarioTxt}>Generar reporte</Text>
                    </>
                  )}
                </TouchableOpacity>
              </Card>

              {resultado && (
                <>
                  <Card>
                    <SectionHeader icon="share-outline" titulo="Descargar / Imprimir" />
                    <View style={s.accionesExportar}>
                      <TouchableOpacity accessibilityRole="button" style={s.btnExportar} onPress={exportarPdf}>
                        <Ionicons name="download-outline" size={18} color="#FFF" />
                        <Text style={s.btnExportarTxt}>Descargar PDF</Text>
                      </TouchableOpacity>
                      <TouchableOpacity accessibilityRole="button" style={s.btnSecundario} onPress={imprimir}>
                        <Ionicons name="print-outline" size={16} color={C.ink} />
                        <Text style={s.btnSecundarioTxt}>Imprimir</Text>
                      </TouchableOpacity>
                    </View>
                  </Card>

                  <View style={s.resumenGrid}>
                    {RESUMEN_CARDS.map((rc) => (
                      <View key={rc.label} style={s.resumenCard}>
                        <View style={[s.resumenIcono, { backgroundColor: `${rc.color}1A` }]}>
                          <Ionicons name={rc.icon} size={16} color={rc.color} />
                        </View>
                        <Text style={[s.resumenValor, { color: rc.color }]} numberOfLines={1} adjustsFontSizeToFit>
                          {rc.valor(resultado)}
                        </Text>
                        <Text style={s.resumenLabel}>{rc.label}</Text>
                      </View>
                    ))}
                  </View>

                  <Card>
                    <SectionHeader
                      icon="trending-up-outline"
                      titulo={`Ingresos por ${AGRUPACIONES.find((a) => a.key === resultado.filtros.agrupacion)?.label.toLowerCase()}`}
                    />
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.grafica}>
                      {resultado.estadisticas.length === 0 ? (
                        <Text style={s.vacio}>Sin datos para graficar.</Text>
                      ) : resultado.estadisticas.map((item, index) => (
                        <View key={item.clave} style={s.barraWrap}>
                          <Text style={[s.barraValor, { color: GRAFICA_COLORES[index % GRAFICA_COLORES.length] }]}>{money(item.ingresos)}</Text>
                          <View style={s.barraTrack}>
                            <View
                              accessibilityLabel={`${item.etiqueta}: ${money(item.ingresos)}`}
                              style={[
                                s.barra,
                                {
                                  height: Math.max(8, Math.round((item.ingresos / maxIngreso) * 120)),
                                  backgroundColor: GRAFICA_COLORES[index % GRAFICA_COLORES.length],
                                },
                              ]}
                            />
                          </View>
                          <Text style={s.barraLabel} numberOfLines={1}>{item.etiqueta}</Text>
                        </View>
                      ))}
                    </ScrollView>
                  </Card>

                  <Card>
                    <SectionHeader icon="trophy-outline" titulo="Productos más vendidos" />
                    {resultado.productosMasVendidos.length === 0 ? (
                      <Text style={s.vacio}>Sin productos vendidos.</Text>
                    ) : resultado.productosMasVendidos.map((p, index) => (
                      <View key={p.id} style={[s.filaRanking, index > 0 && s.filaRankingBorde]}>
                        <Text style={[s.rankingNumero, index < 3 && { backgroundColor: `${MEDALLAS[index]}22`, color: MEDALLAS[index] }]}>{index + 1}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={s.rankingNombre} numberOfLines={1}>{p.nombre}</Text>
                          <Text style={s.rankingMeta}>{p.categoria} · {p.cantidad} unidades</Text>
                        </View>
                        <Text style={s.rankingTotal}>{money(p.total)}</Text>
                      </View>
                    ))}
                  </Card>

                  <SectionHeader icon="list-outline" titulo="Detalle de ventas" />
                  {resultado.ventas.length === 0 ? (
                    <Card><Text style={s.vacio}>Sin ventas para este rango.</Text></Card>
                  ) : resultado.ventas.map((v) => (
                    <Card key={v.numeroVenta} style={s.ventaCard}>
                      <View style={s.ventaTop}>
                        <Text style={s.ventaId} numberOfLines={1}>#{v.numeroVenta} · {v.cliente}</Text>
                        <Text style={s.ventaTotal}>{money(v.total)}</Text>
                      </View>
                      <View style={s.ventaMetaRow}>
                        <Ionicons name="calendar-clear-outline" size={12} color={C.muted} />
                        <Text style={s.ventaMeta}>{v.fecha}</Text>
                        <Ionicons name="person-outline" size={12} color={C.muted} style={{ marginLeft: 8 }} />
                        <Text style={s.ventaMeta}>{v.vendedor}</Text>
                      </View>
                      <Text style={s.ventaProductos}>{v.productosVendidos}</Text>
                      <View style={s.ventaCantidadPill}>
                        <Text style={s.ventaCantidad}>{v.cantidad} unidades</Text>
                      </View>
                    </Card>
                  ))}
                </>
              )}
            </ScrollView>
          )}

          {vista === 'historial' && (
            <ScrollView contentContainerStyle={s.contenido} showsVerticalScrollIndicator={false}>
              {historial.length === 0 ? (
                <Card style={s.vacioCard}>
                  <Ionicons name="folder-open-outline" size={34} color={C.muted} />
                  <Text style={s.vacio}>Sin reportes generados.</Text>
                </Card>
              ) : historial.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Abrir ${r.nombre}`}
                  style={s.historialCard}
                  onPress={() => abrirHistorial(r.id)}
                >
                  <View style={s.historialIcono}>
                    <Ionicons name="document-text-outline" size={18} color={C.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.historialTitulo} numberOfLines={1}>{r.nombre}</Text>
                    <Text style={s.historialMeta}>{r.fechaInicio} a {r.fechaFin} · {r.generadoPor}</Text>
                    <Text style={s.historialMeta}>{r.generadoEn}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.historialMonto}>{money(r.ingresosTotales)}</Text>
                    <Text style={s.historialVentas}>{r.totalVentas} ventas</Text>
                    <Ionicons name="chevron-forward" size={16} color={C.muted} style={{ marginTop: 2 }} />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </>
      )}
    </View>
  );
}

// ── Sombra reutilizable (modular) ──
const sombra = Platform.select({
  ios: { shadowColor: '#1A1A2E', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
  android: { elevation: 2 },
  default: {},
}) as object;

const s = StyleSheet.create({
  pantalla:       { flex: 1, backgroundColor: C.bg },

  tabsWrap:       { backgroundColor: '#FFF', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line },
  tabs:           { flexDirection: 'row', backgroundColor: C.field, borderRadius: 12, padding: 4, gap: 4 },
  tabBtn:         { flex: 1, paddingVertical: 10, borderRadius: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  tabActivo:      { backgroundColor: C.primary, ...sombra },
  tabTxt:         { fontSize: 13, color: C.muted, fontWeight: '600' },
  tabTxtActivo:   { color: '#FFF', fontWeight: '700' },

  contenido:      { padding: 16, gap: 14, paddingBottom: 32 },

  card:           { backgroundColor: C.card, borderRadius: 16, padding: 16, gap: 12, ...sombra },

  sectionHeader:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionIcon:    { width: 32, height: 32, borderRadius: 10, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  sectionPaso:    { fontSize: 10, color: C.primary, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  sectionTitulo:  { fontSize: 15, fontWeight: '800', color: C.ink },

  label:          { fontSize: 12, color: C.muted, fontWeight: '700', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.3 },

  limpiarBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.primarySoft, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  limpiarTxt:     { color: C.primary, fontSize: 11, fontWeight: '800' },

  fechas:         { flexDirection: 'row', gap: 10 },
  campoFecha:     { flex: 1, gap: 6 },
  fechaBoton:     { minHeight: 44, backgroundColor: C.field, borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  fechaBotonActivo:{ borderColor: C.primary, backgroundColor: C.primaryTint },
  fechaBotonTxt:  { flex: 1, fontSize: 13, color: C.ink, fontWeight: '700' },

  calendario:     { alignSelf: 'center', width: '100%', maxWidth: 300, backgroundColor: C.field, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 10, gap: 8 },
  calHeader:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  calNav:         { width: 30, height: 30, borderRadius: 9, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line },
  calTitulo:      { fontSize: 13, color: C.ink, fontWeight: '800' },
  calDias:        { flexDirection: 'row' },
  calDiaNombre:   { width: `${100 / 7}%`, textAlign: 'center', fontSize: 10, color: C.muted, fontWeight: '800' },
  calGrid:        { flexDirection: 'row', flexWrap: 'wrap' },
  calDia:         { width: `${100 / 7}%`, aspectRatio: 1.3, alignItems: 'center', justifyContent: 'center', borderRadius: 9 },
  calDiaFuera:    { opacity: 0.45 },
  calDiaDeshabilitado: { opacity: 0.25 },
  calDiaTxtDeshabilitado: { color: '#CCC' },
  calDiaActivo:   { backgroundColor: C.primary, ...sombra },
  calDiaTxt:      { fontSize: 12, color: '#333', fontWeight: '700' },
  calDiaTxtFuera: { color: '#999' },
  calDiaTxtActivo:{ color: '#FFF' },

  chips:          { gap: 8, paddingVertical: 2 },
  chip:           { minWidth: 86, maxWidth: 190, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, backgroundColor: C.field, borderWidth: 1, borderColor: C.line },
  chipCompacto:   { minWidth: 74 },
  chipActivo:     { backgroundColor: C.primary, borderColor: C.primary, ...sombra },
  chipTxt:        { color: '#444', fontSize: 12, textAlign: 'center', fontWeight: '600' },
  chipTxtActivo:  { color: '#FFF', fontWeight: '700' },

  segmentos:      { flexDirection: 'row', backgroundColor: C.field, borderRadius: 12, padding: 4, gap: 4 },
  segmento:       { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 9 },
  segmentoActivo: { backgroundColor: '#FFF', ...sombra },
  segmentoTxt:    { fontSize: 12, color: C.muted, fontWeight: '600' },
  segmentoTxtActivo:{ color: C.primary, fontWeight: '800' },

  btnPrimario:    { backgroundColor: C.primary, borderRadius: 12, padding: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, ...sombra },
  btnDeshabilitado:{ opacity: 0.6 },
  btnPrimarioTxt: { color: '#FFF', fontWeight: '800', fontSize: 14 },
  accionesExportar:{ flexDirection: 'row', gap: 10 },
  btnExportar:    { flex: 1.4, backgroundColor: '#2A9D8F', borderRadius: 12, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, ...sombra },
  btnExportarTxt: { color: '#FFF', fontWeight: '800', fontSize: 13 },
  btnSecundario:  { flex: 1, backgroundColor: C.field, borderRadius: 12, borderWidth: 1, borderColor: C.line, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  btnSecundarioTxt:{ color: C.ink, fontWeight: '700', fontSize: 12 },

  error:          { backgroundColor: '#FFEBEE', flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, marginHorizontal: 16, marginTop: 10, borderRadius: 12 },
  errorTxt:       { flex: 1, color: '#B71C1C', fontSize: 12, fontWeight: '600' },

  resumenGrid:    { flexDirection: 'row', gap: 10 },
  resumenCard:    { flex: 1, backgroundColor: C.card, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 8, alignItems: 'center', gap: 6, ...sombra },
  resumenIcono:   { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  resumenValor:   { fontSize: 18, fontWeight: '900' },
  resumenLabel:   { fontSize: 11, color: C.muted, fontWeight: '600' },

  grafica:        { minHeight: 180, paddingHorizontal: 4, paddingTop: 8, paddingBottom: 4, gap: 14, alignItems: 'flex-end' },
  barraWrap:      { width: 66, alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  barraValor:     { fontSize: 9, fontWeight: '700', height: 14 },
  barraTrack:     { justifyContent: 'flex-end', minHeight: 120 },
  barra:          { width: 30, borderTopLeftRadius: 8, borderTopRightRadius: 8, backgroundColor: '#2A9D8F' },
  barraLabel:     { fontSize: 10, color: C.muted, width: 64, textAlign: 'center', fontWeight: '600' },

  filaRanking:    { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  filaRankingBorde:{ borderTopWidth: 1, borderTopColor: C.line },
  rankingNumero:  { width: 28, height: 28, borderRadius: 9, backgroundColor: C.field, color: C.muted, textAlign: 'center', lineHeight: 28, fontWeight: '900', fontSize: 13, overflow: 'hidden' },
  rankingNombre:  { fontSize: 13, fontWeight: '700', color: C.ink },
  rankingMeta:    { fontSize: 11, color: C.muted, marginTop: 2 },
  rankingTotal:   { fontSize: 14, fontWeight: '900', color: C.ink },

  ventaCard:      { gap: 8, padding: 14 },
  ventaTop:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  ventaId:        { flex: 1, fontSize: 13, fontWeight: '800', color: C.ink },
  ventaTotal:     { fontSize: 14, fontWeight: '900', color: C.primary },
  ventaMetaRow:   { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  ventaMeta:      { fontSize: 11, color: C.muted, fontWeight: '600' },
  ventaProductos: { fontSize: 12, color: '#444', lineHeight: 17 },
  ventaCantidadPill:{ alignSelf: 'flex-start', backgroundColor: C.field, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  ventaCantidad:  { fontSize: 11, color: '#555', fontWeight: '700' },

  historialCard:  { backgroundColor: C.card, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, ...sombra },
  historialIcono: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  historialTitulo:{ fontSize: 14, color: C.ink, fontWeight: '800' },
  historialMeta:  { fontSize: 11, color: C.muted, marginTop: 2 },
  historialMonto: { fontSize: 14, fontWeight: '900', color: C.primary },
  historialVentas:{ fontSize: 11, color: C.muted, marginTop: 2 },

  vacio:          { textAlign: 'center', color: C.muted, marginTop: 10, fontSize: 13 },
  vacioCard:      { alignItems: 'center', paddingVertical: 32 },
});
