import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity,
         ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import AppHeader from '../../components/AppHeader';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { confirmar } from '../../utils/confirmar';
import { listarReportes, abrirReporte, eliminarReporte, Reporte } from '../../services/reportes';

type Seccion = 'info' | 'reportes';

const fmtFecha = (iso: string) => {
  try { return new Date(iso).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }); }
  catch { return iso; }
};
const fmtMoney = (n: number) => `$${Number(n).toFixed(2)}`;

export default function PerfilScreen() {
  const { usuario } = useAuth();
  const { mostrar } = useToast();
  const [seccion, setSeccion]   = useState<Seccion>('info');
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [cargando, setCargando] = useState(false);
  const [refresh, setRefresh]   = useState(false);

  const cargar = async () => {
    if (!usuario) return;
    setCargando(true);
    setReportes(await listarReportes(usuario.id));
    setCargando(false);
  };

  useFocusEffect(useCallback(() => { cargar(); }, [usuario?.id]));

  const onRefresh = async () => { setRefresh(true); await cargar(); setRefresh(false); };

  const abrir = async (r: Reporte) => {
    try { await abrirReporte(r); }
    catch (e: any) { mostrar(e.message ?? 'No se pudo abrir el reporte.', 'error'); }
  };

  const borrar = (r: Reporte) => {
    confirmar('Eliminar reporte', `¿Eliminar el reporte de la orden #${r.ordenId}?`, async () => {
      if (!usuario) return;
      await eliminarReporte(usuario.id, r.id);
      mostrar('Reporte eliminado.', 'info');
      await cargar();
    });
  };

  return (
    <View style={s.pantalla}>
      <AppHeader titulo="Perfil" />

      {/* Tabs internas */}
      <View style={s.tabs}>
        {(['info', 'reportes'] as Seccion[]).map(t => (
          <TouchableOpacity key={t} style={[s.tab, seccion === t && s.tabActiva]} onPress={() => setSeccion(t)}>
            <Text style={[s.tabTxt, seccion === t && s.tabTxtActiva]}>
              {t === 'info' ? '👤 Información' : '📄 Reportes'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── INFO ── */}
      {seccion === 'info' && (
        <ScrollView contentContainerStyle={s.contenido}>
          <View style={s.tarjeta}>
            <View style={s.avatarGrande}>
              <Text style={s.avatarTxt}>{usuario?.nombre?.[0]?.toUpperCase() ?? '?'}</Text>
            </View>
            <Text style={s.nombre}>{usuario?.nombre}</Text>
            <Text style={s.correo}>{usuario?.correo}</Text>
            <View style={[s.badge, usuario?.rol === 'Master' ? s.badgeMaster : s.badgePromotor]}>
              <Text style={[s.badgeTxt, usuario?.rol === 'Master' ? s.badgeMasterTxt : s.badgePromotorTxt]}>
                {usuario?.rol === 'Master' ? '⭐ Master' : 'Promotor'}
              </Text>
            </View>
          </View>

          <View style={s.tarjeta}>
            <Text style={s.tarjetaTitulo}>Resumen</Text>
            <View style={s.fila}>
              <Text style={s.filaLabel}>Reportes generados</Text>
              <Text style={s.filaValor}>{reportes.length}</Text>
            </View>
          </View>
        </ScrollView>
      )}

      {/* ── REPORTES ── */}
      {seccion === 'reportes' && (
        cargando ? (
          <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#E63946" />
        ) : reportes.length === 0 ? (
          <ScrollView
            contentContainerStyle={s.vacioWrap}
            refreshControl={<RefreshControl refreshing={refresh} onRefresh={onRefresh} />}
          >
            <Text style={s.vacioIcono}>📄</Text>
            <Text style={s.vacioTitulo}>Sin reportes</Text>
            <Text style={s.vacioSub}>Los reportes que generes desde el historial de órdenes aparecerán aquí.</Text>
          </ScrollView>
        ) : (
          <ScrollView
            contentContainerStyle={s.contenido}
            refreshControl={<RefreshControl refreshing={refresh} onRefresh={onRefresh} />}
          >
            <Text style={s.contador}>
              {reportes.length} {reportes.length === 1 ? 'reporte guardado' : 'reportes guardados'}
            </Text>
            {reportes.map(r => (
              <TouchableOpacity key={r.id} style={s.reporte} onPress={() => abrir(r)} activeOpacity={0.85}>
                <View style={s.reporteIcono}><Text style={{ fontSize: 22 }}>📄</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.reporteTitulo}>Orden #{r.ordenId} · {r.clienteNombre}</Text>
                  <Text style={s.reporteSub}>{fmtFecha(r.fechaGeneracion)} · {fmtMoney(r.total)}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => borrar(r)}
                  style={s.btnBorrar}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={{ fontSize: 16 }}>🗑️</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )
      )}
    </View>
  );
}

const s = StyleSheet.create({
  pantalla:      { flex: 1, backgroundColor: '#F2F2F2' },

  tabs:          { flexDirection: 'row', backgroundColor: '#FFF', paddingHorizontal: 16, paddingTop: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: '#EBEBEB' },
  tab:           { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActiva:     { borderBottomColor: '#E63946' },
  tabTxt:        { fontSize: 13, fontWeight: '600', color: '#9E9E9E' },
  tabTxtActiva:  { color: '#E63946' },

  contenido:     { padding: 16, gap: 12 },

  tarjeta:       { backgroundColor: '#FFF', borderRadius: 12, padding: 20, alignItems: 'center', elevation: 1 },
  tarjetaTitulo: { alignSelf: 'flex-start', fontSize: 13, fontWeight: '700', color: '#1A1A1A', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  avatarGrande:  { width: 80, height: 80, borderRadius: 40, backgroundColor: '#E63946', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  avatarTxt:     { color: '#FFF', fontSize: 32, fontWeight: '700' },
  nombre:        { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  correo:        { fontSize: 13, color: '#9E9E9E', marginTop: 2, marginBottom: 12 },
  badge:           { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20 },
  badgeMaster:     { backgroundColor: '#FFF3CD' }, badgeMasterTxt:   { color: '#856404' },
  badgePromotor:   { backgroundColor: '#E8F5E9' }, badgePromotorTxt: { color: '#2E7D32' },
  badgeTxt:        { fontSize: 12, fontWeight: '700' },

  fila:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', alignSelf: 'stretch', paddingVertical: 6 },
  filaLabel:     { fontSize: 13, color: '#9E9E9E' },
  filaValor:     { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },

  contador:      { fontSize: 12, color: '#9E9E9E', marginBottom: 4 },

  reporte:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 10, padding: 12, gap: 12, elevation: 1 },
  reporteIcono:  { width: 44, height: 44, borderRadius: 10, backgroundColor: '#FFF3F3', alignItems: 'center', justifyContent: 'center' },
  reporteTitulo: { fontSize: 13, fontWeight: '600', color: '#1A1A1A' },
  reporteSub:    { fontSize: 11, color: '#9E9E9E', marginTop: 2 },
  btnBorrar:     { padding: 8 },

  vacioWrap:     { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  vacioIcono:    { fontSize: 56, marginBottom: 14 },
  vacioTitulo:   { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  vacioSub:      { fontSize: 13, color: '#9E9E9E', textAlign: 'center', marginTop: 6 },
});