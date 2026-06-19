import { useCallback, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Platform, Linking,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import AppHeader from '../../components/AppHeader';
import { ReportesDB } from '../../services/db';
import { useAuth } from '../../context/AuthContext';

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

export default function ReportesScreen() {
  const { usuario } = useAuth();
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

  const generar = async () => {
    setGenerando(true);
    setError('');
    const res = await ReportesDB.generar(filtros);
    if (res.error) {
      setError(res.error);
    } else {
      setResultado(res);
      setVista('generar');
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
    abrirUrl(ReportesDB.exportUrl(resultado.id));
  };

  const imprimir = () => {
    if (!resultado?.id) {
      setError('Genera o abre un reporte antes de imprimir.');
      return;
    }
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
        <Text style={s.fechaBotonTxt}>{filtros[campo]}</Text>
        <Text style={s.fechaIcono}>▾</Text>
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
            <Text style={s.calNavTxt}>‹</Text>
          </TouchableOpacity>
          <Text style={s.calTitulo}>{MESES[mm - 1]} {yyyy}</Text>
          <TouchableOpacity accessibilityRole="button" style={s.calNav} onPress={() => setCalendario({ ...calendario, mes: moverMes(calendario.mes, 1) })}>
            <Text style={s.calNavTxt}>›</Text>
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

  return (
    <View style={s.pantalla}>
      <AppHeader titulo="Reportes" subtitulo={usuario ? `Sesión: ${usuario.nombre}` : undefined} />

      <View style={s.tabs}>
        <TouchableOpacity
          accessibilityRole="tab"
          accessibilityState={{ selected: vista === 'generar' }}
          style={[s.tabBtn, vista === 'generar' && s.tabActivo]}
          onPress={() => setVista('generar')}
        >
          <Text style={[s.tabTxt, vista === 'generar' && s.tabTxtActivo]}>Generar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="tab"
          accessibilityState={{ selected: vista === 'historial' }}
          style={[s.tabBtn, vista === 'historial' && s.tabActivo]}
          onPress={() => setVista('historial')}
        >
          <Text style={[s.tabTxt, vista === 'historial' && s.tabTxtActivo]}>Historial</Text>
        </TouchableOpacity>
      </View>

      {cargando ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#E63946" />
      ) : (
        <>
          {error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}

          {vista === 'generar' && (
            <ScrollView contentContainerStyle={s.contenido}>
              <View style={s.bloque}>
                <Text style={s.paso}>1. Rango</Text>
                <View style={s.fechas}>
                  <FechaBoton campo="fechaInicio" label="Inicio" />
                  <FechaBoton campo="fechaFin" label="Fin" />
                </View>
                <MiniCalendario />
              </View>

              <View style={s.bloque}>
                <Text style={s.paso}>2. Filtros</Text>

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

                <Text style={s.label}>Estadísticas</Text>
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
              </View>

              <View style={s.bloque}>
                <Text style={s.paso}>3. Reporte</Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  style={[s.btnPrimario, generando && s.btnDeshabilitado]}
                  onPress={generar}
                  disabled={generando}
                >
                  {generando ? <ActivityIndicator color="#FFF" /> : <Text style={s.btnPrimarioTxt}>Generar reporte</Text>}
                </TouchableOpacity>

                {resultado && (
                  <View style={s.accionesExportar}>
                    <TouchableOpacity accessibilityRole="button" style={s.btnSecundario} onPress={exportarPdf}>
                      <Text style={s.btnSecundarioTxt}>Exportar PDF</Text>
                    </TouchableOpacity>
                    <TouchableOpacity accessibilityRole="button" style={s.btnSecundario} onPress={imprimir}>
                      <Text style={s.btnSecundarioTxt}>Imprimir</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {resultado && (
                <>
                  <View style={s.resumenGrid}>
                    <View style={s.resumenCard}>
                      <Text style={s.resumenValor}>{resultado.resumen.totalVentas}</Text>
                      <Text style={s.resumenLabel}>Ventas</Text>
                    </View>
                    <View style={s.resumenCard}>
                      <Text style={s.resumenValor}>{resultado.resumen.unidadesVendidas}</Text>
                      <Text style={s.resumenLabel}>Unidades</Text>
                    </View>
                    <View style={s.resumenCard}>
                      <Text style={s.resumenValor}>{money(resultado.resumen.ingresosTotales)}</Text>
                      <Text style={s.resumenLabel}>Ingresos</Text>
                    </View>
                  </View>

                  <Text style={s.seccion}>Ventas por {AGRUPACIONES.find((a) => a.key === resultado.filtros.agrupacion)?.label.toLowerCase()}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.grafica}>
                    {resultado.estadisticas.length === 0 ? (
                      <Text style={s.vacio}>Sin datos para graficar.</Text>
                    ) : resultado.estadisticas.map((item, index) => (
                      <View key={item.clave} style={s.barraWrap}>
                        <Text style={[s.barraValor, { color: GRAFICA_COLORES[index % GRAFICA_COLORES.length] }]}>{money(item.ingresos)}</Text>
                        <View
                          accessibilityLabel={`${item.etiqueta}: ${money(item.ingresos)}`}
                          style={[
                            s.barra,
                            {
                              height: Math.max(8, Math.round((item.ingresos / maxIngreso) * 110)),
                              backgroundColor: GRAFICA_COLORES[index % GRAFICA_COLORES.length],
                            },
                          ]}
                        />
                        <Text style={s.barraLabel} numberOfLines={1}>{item.etiqueta}</Text>
                      </View>
                    ))}
                  </ScrollView>

                  <Text style={s.seccion}>Productos más vendidos</Text>
                  {resultado.productosMasVendidos.length === 0 ? (
                    <Text style={s.vacio}>Sin productos vendidos.</Text>
                  ) : resultado.productosMasVendidos.map((p, index) => (
                    <View key={p.id} style={s.filaRanking}>
                      <Text style={s.rankingNumero}>{index + 1}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={s.rankingNombre}>{p.nombre}</Text>
                        <Text style={s.rankingMeta}>{p.categoria} · {p.cantidad} unidades</Text>
                      </View>
                      <Text style={s.rankingTotal}>{money(p.total)}</Text>
                    </View>
                  ))}

                  <Text style={s.seccion}>Detalle de ventas</Text>
                  {resultado.ventas.length === 0 ? (
                    <Text style={s.vacio}>Sin ventas para este rango.</Text>
                  ) : resultado.ventas.map((v) => (
                    <View key={v.numeroVenta} style={s.ventaCard}>
                      <View style={s.ventaTop}>
                        <Text style={s.ventaId}>#{v.numeroVenta} · {v.cliente}</Text>
                        <Text style={s.ventaTotal}>{money(v.total)}</Text>
                      </View>
                      <Text style={s.ventaMeta}>{v.fecha} · {v.vendedor}</Text>
                      <Text style={s.ventaProductos}>{v.productosVendidos}</Text>
                      <Text style={s.ventaCantidad}>Cantidad: {v.cantidad}</Text>
                    </View>
                  ))}
                </>
              )}
            </ScrollView>
          )}

          {vista === 'historial' && (
            <ScrollView contentContainerStyle={s.contenido}>
              {historial.length === 0 ? (
                <Text style={s.vacio}>Sin reportes generados.</Text>
              ) : historial.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Abrir ${r.nombre}`}
                  style={s.historialCard}
                  onPress={() => abrirHistorial(r.id)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={s.historialTitulo}>{r.nombre}</Text>
                    <Text style={s.historialMeta}>{r.fechaInicio} a {r.fechaFin} · {r.generadoPor}</Text>
                    <Text style={s.historialMeta}>{r.generadoEn}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.historialMonto}>{money(r.ingresosTotales)}</Text>
                    <Text style={s.historialVentas}>{r.totalVentas} ventas</Text>
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

const s = StyleSheet.create({
  pantalla:       { flex: 1, backgroundColor: '#F2F2F2' },
  tabs:           { flexDirection: 'row', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EBEBEB' },
  tabBtn:         { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActivo:      { borderBottomWidth: 2, borderBottomColor: '#E63946' },
  tabTxt:         { fontSize: 12, color: '#777' },
  tabTxtActivo:   { color: '#E63946', fontWeight: '700' },
  contenido:      { padding: 16, gap: 12 },
  bloque:         { backgroundColor: '#FFF', borderRadius: 8, padding: 14, gap: 10, elevation: 1 },
  paso:           { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  label:          { fontSize: 12, color: '#555', fontWeight: '700', marginTop: 2 },
  fechas:         { flexDirection: 'row', gap: 10 },
  campoFecha:     { flex: 1, gap: 6 },
  fechaBoton:     { minHeight: 42, backgroundColor: '#FAFAFA', borderWidth: 1, borderColor: '#DFDFDF', borderRadius: 8, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fechaBotonActivo:{ borderColor: '#E63946', backgroundColor: '#FFF7F8' },
  fechaBotonTxt:  { fontSize: 13, color: '#1A1A1A', fontWeight: '700' },
  fechaIcono:     { fontSize: 16, color: '#777' },
  calendario:     { alignSelf: 'center', width: '100%', maxWidth: 280, backgroundColor: '#FAFAFA', borderWidth: 1, borderColor: '#E4E4E4', borderRadius: 8, padding: 8, gap: 6 },
  calHeader:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  calNav:         { width: 28, height: 26, borderRadius: 7, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E6E6E6' },
  calNavTxt:      { fontSize: 17, color: '#E63946', fontWeight: '800', lineHeight: 19 },
  calTitulo:      { fontSize: 12, color: '#1A1A1A', fontWeight: '800' },
  calDias:        { flexDirection: 'row' },
  calDiaNombre:   { width: `${100 / 7}%`, textAlign: 'center', fontSize: 9, color: '#777', fontWeight: '800' },
  calGrid:        { flexDirection: 'row', flexWrap: 'wrap' },
  calDia:         { width: `${100 / 7}%`, aspectRatio: 1.35, alignItems: 'center', justifyContent: 'center', borderRadius: 7 },
  calDiaFuera:    { opacity: 0.45 },
  calDiaDeshabilitado: { opacity: 0.25 },
  calDiaTxtDeshabilitado: { color: '#CCC' },
  calDiaActivo:   { backgroundColor: '#E63946' },
  calDiaTxt:      { fontSize: 11, color: '#333', fontWeight: '700' },
  calDiaTxtFuera: { color: '#999' },
  calDiaTxtActivo:{ color: '#FFF' },
  chips:          { gap: 8, paddingVertical: 2 },
  chip:           { minWidth: 86, maxWidth: 190, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#FAFAFA', borderWidth: 1, borderColor: '#E2E2E2' },
  chipCompacto:   { minWidth: 74 },
  chipActivo:     { backgroundColor: '#E63946', borderColor: '#E63946' },
  chipTxt:        { color: '#333', fontSize: 12, textAlign: 'center' },
  chipTxtActivo:  { color: '#FFF', fontWeight: '700' },
  segmentos:      { flexDirection: 'row', backgroundColor: '#F1F1F1', borderRadius: 8, padding: 3 },
  segmento:       { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  segmentoActivo: { backgroundColor: '#FFF', elevation: 1 },
  segmentoTxt:    { fontSize: 12, color: '#777' },
  segmentoTxtActivo:{ color: '#E63946', fontWeight: '700' },
  btnPrimario:    { backgroundColor: '#E63946', borderRadius: 8, padding: 14, alignItems: 'center' },
  btnDeshabilitado:{ opacity: 0.6 },
  btnPrimarioTxt: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  accionesExportar:{ flexDirection: 'row', gap: 8 },
  btnSecundario:  { flex: 1, backgroundColor: '#F7F7F7', borderRadius: 8, borderWidth: 1, borderColor: '#E0E0E0', paddingVertical: 10, alignItems: 'center' },
  btnSecundarioTxt:{ color: '#1A1A1A', fontWeight: '700', fontSize: 12 },
  error:          { backgroundColor: '#FFEBEE', color: '#B71C1C', padding: 10, marginHorizontal: 16, marginTop: 10, borderRadius: 8, fontSize: 12, fontWeight: '600' },
  resumenGrid:    { flexDirection: 'row', gap: 8 },
  resumenCard:    { flex: 1, backgroundColor: '#FFF', borderRadius: 8, padding: 12, alignItems: 'center', elevation: 1 },
  resumenValor:   { fontSize: 17, fontWeight: '800', color: '#E63946' },
  resumenLabel:   { fontSize: 11, color: '#777', marginTop: 3 },
  seccion:        { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginTop: 8 },
  grafica:        { backgroundColor: '#FFF', borderRadius: 8, minHeight: 170, paddingHorizontal: 12, paddingTop: 12, paddingBottom: 10, gap: 10, alignItems: 'flex-end' },
  barraWrap:      { width: 70, alignItems: 'center', justifyContent: 'flex-end', gap: 5 },
  barra:          { width: 26, borderRadius: 6, backgroundColor: '#2A9D8F' },
  barraValor:     { fontSize: 9, color: '#555', height: 14 },
  barraLabel:     { fontSize: 10, color: '#777', width: 68, textAlign: 'center' },
  filaRanking:    { backgroundColor: '#FFF', borderRadius: 8, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, elevation: 1 },
  rankingNumero:  { width: 26, height: 26, borderRadius: 13, backgroundColor: '#FDECEE', color: '#E63946', textAlign: 'center', lineHeight: 26, fontWeight: '800' },
  rankingNombre:  { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  rankingMeta:    { fontSize: 11, color: '#777', marginTop: 2 },
  rankingTotal:   { fontSize: 13, fontWeight: '800', color: '#1A1A1A' },
  ventaCard:      { backgroundColor: '#FFF', borderRadius: 8, padding: 12, gap: 4, elevation: 1 },
  ventaTop:       { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  ventaId:        { flex: 1, fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  ventaTotal:     { fontSize: 13, fontWeight: '800', color: '#E63946' },
  ventaMeta:      { fontSize: 11, color: '#777' },
  ventaProductos: { fontSize: 12, color: '#333', lineHeight: 17 },
  ventaCantidad:  { fontSize: 11, color: '#555', fontWeight: '700' },
  historialCard:  { backgroundColor: '#FFF', borderRadius: 8, padding: 14, flexDirection: 'row', gap: 10, elevation: 1 },
  historialTitulo:{ fontSize: 13, color: '#1A1A1A', fontWeight: '700' },
  historialMeta:  { fontSize: 11, color: '#777', marginTop: 2 },
  historialMonto: { fontSize: 13, fontWeight: '800', color: '#E63946' },
  historialVentas:{ fontSize: 11, color: '#777', marginTop: 2 },
  vacio:          { textAlign: 'center', color: '#777', marginTop: 18 },
});
