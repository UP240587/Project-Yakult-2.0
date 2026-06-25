import { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity,
         StyleSheet, ActivityIndicator, Linking } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { OrdenesDB, ClientesDB, ProductosDB, NotificacionesDB, AuthDB } from '../../services/db';
import AppHeader from '../../components/AppHeader';
import { confirmar } from '../../utils/confirmar';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

type Tab    = 'historial' | 'nueva' | 'notificaciones';

const COLOR_ESTADO: Record<string, string> = {
  'Entregado': '#4CAF50', 'En camino': '#2196F3', 'Pendiente': '#FF9800',
};

// ── WhatsApp: arma el link con lada 52 + mensaje pre-llenado ──
const waLink = (telefono: string, texto: string) => {
  const digits = String(telefono || '').replace(/\D/g, '');
  if (!digits) return null;
  const num = digits.startsWith('52') ? digits : `52${digits}`;
  return `https://wa.me/${num}?text=${encodeURIComponent(texto)}`;
};

// ── Plantilla de mensaje según el estado de la orden ──
const mensajeCliente = (o: any) => {
  const items = (o.items || []).map((i: any) => `• ${i.nombre} x${i.cantidad}`).join('\n');
  const total = `$${Number(o.total).toFixed(2)}`;
  if (o.estado === 'En camino')
    return `Hola ${o.clienteNombre} 👋\nTu pedido #${o.id} de Yakult ya va en camino 🚚\n¡Pronto llega!`;
  if (o.estado === 'Entregado')
    return `Hola ${o.clienteNombre} 👋\nTu pedido #${o.id} fue entregado ✅\n¡Gracias por tu compra! 🥛`;
  // Pendiente → confirmar pedido
  return `Hola ${o.clienteNombre} 👋\nGracias por tu pedido en Yakult:\n${items}\nTotal: ${total}\n¿Confirmas tu pedido? 🥛`;
};

const ICONO_NOTIF: Record<string, string> = {
  asignacion: '🚚', estado: '🔄', info: '🔔',
};

export default function OrdenesScreen() {
  const { usuario } = useAuth();
  const { mostrar } = useToast();
  const [tab,       setTab]       = useState<Tab>('historial');
  const [cargando,  setCargando]  = useState(true);
  const [ordenes,   setOrdenes]   = useState<any[]>([]);
  const [clientes,  setClientes]  = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [repartidores, setRepartidores] = useState<any[]>([]);
  const [notifs,    setNotifs]    = useState<any[]>([]);
  const [clienteSel,  setClienteSel]  = useState<any>(null);
  const [repartidorSel, setRepartidorSel] = useState<any>(null);
  const [cantidades,  setCantidades]  = useState<Record<number, number>>({});
  const [guardando,   setGuardando]   = useState(false);
  const [asignandoId, setAsignandoId] = useState<number | null>(null);

  const puedeAsignar = usuario?.rol === 'Master' || usuario?.rol === 'Promotor';

  useFocusEffect(useCallback(() => { cargar(); }, []));

  const cargar = async () => {
    setCargando(true);
    const [o, c, p, u, n] = await Promise.all([
      OrdenesDB.getAll(), ClientesDB.getAll(), ProductosDB.getAll(),
      AuthDB.getUsuarios(), NotificacionesDB.getAll(),
    ]);
    setOrdenes(Array.isArray(o) ? o : []);
    setClientes(Array.isArray(c) ? c : []);
    setProductos(Array.isArray(p) ? p : []);
    setRepartidores(Array.isArray(u) ? u.filter((x: any) => x.rol === 'Repartidor' && x.activo) : []);
    setNotifs(Array.isArray(n) ? n : []);
    setCargando(false);
  };

  const cambiarCantidad = (id: number, delta: number) => {
    const prod = productos.find((p: any) => p.id === id);
    const maxStock = prod ? prod.stock : 0;

    setCantidades(prev => {
      let nuevo = (prev[id] ?? 0) + delta;
      if (nuevo < 0) nuevo = 0;
      if (nuevo > maxStock) nuevo = maxStock;

      const copia = { ...prev };
      if (nuevo === 0) delete copia[id]; else copia[id] = nuevo;
      return copia;
    });
  };

  const total = productos.reduce((sum: number, p: any) =>
    sum + (cantidades[p.id] ?? 0) * p.precio, 0);

  // ── Avisar al cliente por WhatsApp ──────────────────
  const avisarCliente = async (o: any) => {
    const link = waLink(o.clienteTelefono, mensajeCliente(o));
    if (!link) { mostrar('Este cliente no tiene teléfono registrado.', 'error'); return; }
    try { await Linking.openURL(link); }
    catch { mostrar('No se pudo abrir WhatsApp.', 'error'); }
  };

  // ── Asignar repartidor a una orden ──────────────────
  const asignarRepartidor = async (ordenId: number, repartidorId: number | null) => {
    await OrdenesDB.asignarRepartidor(ordenId, repartidorId);
    setAsignandoId(null);
    mostrar(repartidorId ? 'Repartidor asignado' : 'Repartidor quitado', 'success');
    await cargar();
  };

  // ── Marcar directamente como Entregado ──────────────
  const marcarEntregado = async (ordenId: number) => {
    await OrdenesDB.cambiarEstado(ordenId, 'Entregado');
    mostrar('Orden marcada como entregada', 'success');
    await cargar();
  };

  const eliminarOrden = (o: any) => {
    confirmar('Eliminar orden', `¿Eliminar la orden #${o.id} de ${o.clienteNombre}?`, async () => {
      await OrdenesDB.eliminar(o.id);
      mostrar('Orden eliminada', 'info');
      await cargar();
    });
  };

  // ── Avanzar estado (Pendiente → En camino → Entregado) ──
  const avanzarEstado = async (o: any) => {
    if (o.estado === 'Pendiente')  await OrdenesDB.cambiarEstado(o.id, 'En camino');
    if (o.estado === 'En camino')  await OrdenesDB.cambiarEstado(o.id, 'Entregado');
    mostrar('Estado actualizado', 'success');
    await cargar();
  };

  const crearOrden = async () => {
    if (!clienteSel || total === 0) return;
    setGuardando(true);
    const items = Object.entries(cantidades).map(([prodId, cantidad]) => {
      const prod = productos.find((p: any) => p.id === +prodId);
      return { productoId: +prodId, cantidad, precio: prod.precio };
    });
    await OrdenesDB.agregar({
      clienteId: clienteSel.id,
      vendedorId: usuario?.id ?? null,
      repartidorId: repartidorSel?.id ?? null,
      items,
      total,
    });
    mostrar('Orden creada correctamente', 'success');
    await cargar();
    setClienteSel(null); setRepartidorSel(null); setCantidades({});
    setTab('historial');
    setGuardando(false);
  };

  // ── Notificaciones ──────────────────────────────────
  const noLeidas = notifs.filter((n: any) => !n.leida).length;

  const abrirNotif = async (n: any) => {
    if (!n.leida) {
      await NotificacionesDB.marcarLeida(n.id);
      setNotifs((prev) => prev.map((x) => (x.id === n.id ? { ...x, leida: true } : x)));
    }
  };

  const marcarTodas = async () => {
    if (noLeidas === 0) return;
    await NotificacionesDB.marcarTodas();
    setNotifs((prev) => prev.map((x) => ({ ...x, leida: true })));
    mostrar('Todas marcadas como leídas', 'info');
  };

  // ── Botón confirmar deshabilitado sin cliente ────────
  const puedeConfirmar = !!clienteSel && total > 0;

  return (
    <View style={s.pantalla}>
      <AppHeader titulo="Órdenes" />

      {/* Tabs internos */}
      <View style={s.tabs}>
        {(['historial', 'nueva', 'notificaciones'] as Tab[]).map(t => (
          <TouchableOpacity key={t} style={[s.tabBtn, tab === t && s.tabActivo]} onPress={() => setTab(t)}>
            <View style={s.tabContenido}>
              <Text style={[s.tabTxt, tab === t && s.tabTxtActivo]}>
                {t === 'historial' ? 'Historial' : t === 'nueva' ? 'Nueva' : 'Avisos'}
              </Text>
              {t === 'notificaciones' && noLeidas > 0 && (
                <View style={s.badge}><Text style={s.badgeTxt}>{noLeidas}</Text></View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {cargando
        ? <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#E63946" />
        : (
          <>
            {/* ── HISTORIAL ── */}
            {tab === 'historial' && (
              <ScrollView contentContainerStyle={s.lista}>
                {ordenes.length === 0
                  ? <Text style={s.vacio}>Sin órdenes. Crea una.</Text>
                  : ordenes.map((o: any) => (
                    <View key={o.id} style={s.tarjeta}>
                      {/* Cabecera de la orden */}
                      <View style={s.ordenTop}>
                        <Text style={s.ordenId}>#{o.id} · {o.clienteNombre}</Text>
                        <View style={[s.estadoBadge, { backgroundColor: COLOR_ESTADO[o.estado] + '22' }]}>
                          <Text style={[s.estadoTxt, { color: COLOR_ESTADO[o.estado] }]}>{o.estado}</Text>
                        </View>
                      </View>

                      <Text style={s.ordenItems}>
                        {o.items?.map((i: any) => `${i.nombre} ×${i.cantidad}`).join(', ')}
                      </Text>

                      <View style={s.ordenBottom}>
                        <Text style={s.ordenFecha}>{o.fecha}</Text>
                        <Text style={s.ordenTotal}>${Number(o.total).toFixed(2)}</Text>
                      </View>

                      {/* ── Repartidor ── */}
                      <View style={s.repartidorRow}>
                        <Text style={s.repartidorTxt}>
                          🚚 {o.repartidorNombre ? o.repartidorNombre : 'Sin repartidor'}
                        </Text>
                        {puedeAsignar && o.estado !== 'Entregado' && (
                          <TouchableOpacity onPress={() => setAsignandoId(asignandoId === o.id ? null : o.id)}>
                            <Text style={s.asignarLink}>{o.repartidorId ? 'Cambiar' : 'Asignar'}</Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* Selector de repartidor (desplegable) */}
                      {asignandoId === o.id && (
                        <View style={s.repartidorChips}>
                          {repartidores.length === 0 ? (
                            <Text style={s.sinRepartidores}>No hay repartidores registrados.</Text>
                          ) : repartidores.map((r: any) => (
                            <TouchableOpacity
                              key={r.id}
                              style={[s.repChip, o.repartidorId === r.id && s.repChipActivo]}
                              onPress={() => asignarRepartidor(o.id, r.id)}
                            >
                              <Text style={[s.repChipTxt, o.repartidorId === r.id && s.repChipTxtActivo]}>{r.nombre}</Text>
                            </TouchableOpacity>
                          ))}
                          {o.repartidorId && (
                            <TouchableOpacity style={s.repChipQuitar} onPress={() => asignarRepartidor(o.id, null)}>
                              <Text style={s.repChipQuitarTxt}>Quitar</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}

                      {/* ── Acciones ── */}
                      <View style={s.accionesOrden}>
                        <TouchableOpacity style={s.btnWhats} onPress={() => avisarCliente(o)}>
                          <Text style={s.btnWhatsTxt}>
                            {o.estado === 'Pendiente' ? '💬 Confirmar' : '💬 Avisar'}
                          </Text>
                        </TouchableOpacity>

                        {o.estado === 'Pendiente' && (
                          <TouchableOpacity style={s.btnEnCamino} onPress={() => avanzarEstado(o)}>
                            <Text style={s.btnEnCaminoTxt}>🚚 En camino</Text>
                          </TouchableOpacity>
                        )}
                        {o.estado !== 'Entregado' && (
                          <TouchableOpacity style={s.btnEntregado} onPress={() => marcarEntregado(o.id)}>
                            <Text style={s.btnEntregadoTxt}>✓ Entregado</Text>
                          </TouchableOpacity>
                        )}
                        {o.estado !== 'Entregado' && (
                          <TouchableOpacity style={s.btnEliminarOrden} onPress={() => eliminarOrden(o)}>
                            <Text style={s.btnEliminarOrdenTxt}>🗑️</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))
                }
              </ScrollView>
            )}

            {/* ── NUEVA ORDEN ── */}
            {tab === 'nueva' && (
              <ScrollView contentContainerStyle={s.lista}>

                {/* Selección de cliente */}
                <Text style={s.seccion}>Cliente</Text>
                <View style={s.chips}>
                  {clientes.map((c: any) => (
                    <TouchableOpacity
                      key={c.id}
                      style={[s.chip, clienteSel?.id === c.id && s.chipActivo]}
                      onPress={() => setClienteSel(clienteSel?.id === c.id ? null : c)}
                    >
                      <Text style={[s.chipTxt, clienteSel?.id === c.id && s.chipTxtActivo]}>
                        {c.nombre}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Aviso si no hay cliente seleccionado */}
                {!clienteSel && (
                  <View style={s.avisoCliente}>
                    <Text style={s.avisoClienteTxt}>⚠️ Selecciona un cliente para continuar</Text>
                  </View>
                )}

                {/* Repartidor (opcional) */}
                <Text style={s.seccion}>Repartidor (opcional)</Text>
                <View style={s.chips}>
                  {repartidores.length === 0 ? (
                    <Text style={s.sinRepartidores}>No hay repartidores registrados.</Text>
                  ) : repartidores.map((r: any) => (
                    <TouchableOpacity
                      key={r.id}
                      style={[s.chip, repartidorSel?.id === r.id && s.chipActivo]}
                      onPress={() => setRepartidorSel(repartidorSel?.id === r.id ? null : r)}
                    >
                      <Text style={[s.chipTxt, repartidorSel?.id === r.id && s.chipTxtActivo]}>
                        {r.nombre}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Productos */}
                <Text style={s.seccion}>Productos</Text>
                {productos.map((p: any) => (
                  <View key={p.id} style={[s.tarjeta, s.filaProducto]}>
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

                {/* Total */}
                <View style={s.totalWrap}>
                  <Text style={s.totalLabel}>Total</Text>
                  <Text style={s.totalValor}>${total.toFixed(2)}</Text>
                </View>

                {/* Botón — deshabilitado si no hay cliente */}
                <TouchableOpacity
                  style={[s.btnPrimario, !puedeConfirmar && s.btnDeshabilitado]}
                  onPress={crearOrden}
                  disabled={!puedeConfirmar || guardando}
                >
                  {guardando
                    ? <ActivityIndicator color="#FFF" />
                    : <Text style={s.btnPrimarioTxt}>
                        {!clienteSel ? 'Selecciona un cliente' : total === 0 ? 'Agrega productos' : 'Confirmar orden'}
                      </Text>
                  }
                </TouchableOpacity>
              </ScrollView>
            )}

            {/* ── NOTIFICACIONES (bandeja real) ── */}
            {tab === 'notificaciones' && (
              <ScrollView contentContainerStyle={s.lista}>
                {noLeidas > 0 && (
                  <TouchableOpacity style={s.marcarTodas} onPress={marcarTodas}>
                    <Text style={s.marcarTodasTxt}>Marcar todas como leídas ({noLeidas})</Text>
                  </TouchableOpacity>
                )}
                {notifs.length === 0
                  ? <Text style={s.vacio}>No tienes notificaciones.</Text>
                  : notifs.map((n: any) => (
                    <TouchableOpacity
                      key={n.id}
                      style={[s.notif, !n.leida && s.notifNoLeida]}
                      onPress={() => abrirNotif(n)}
                    >
                      <Text style={s.notifIcono}>{ICONO_NOTIF[n.tipo] ?? '🔔'}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={s.notifTitulo}>{n.titulo}</Text>
                        <Text style={s.notifMsg}>{n.mensaje}</Text>
                        <Text style={s.notifTiempo}>{n.fecha}</Text>
                      </View>
                      {!n.leida && <View style={s.puntoNoLeido} />}
                    </TouchableOpacity>
                  ))
                }
              </ScrollView>
            )}
          </>
        )
      }
    </View>
  );
}

const s = StyleSheet.create({
  pantalla:       { flex: 1, backgroundColor: '#F2F2F2' },
  tabs:           { flexDirection: 'row', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EBEBEB' },
  tabBtn:         { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabContenido:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tabActivo:      { borderBottomWidth: 2, borderBottomColor: '#E63946' },
  tabTxt:         { fontSize: 12, color: '#9E9E9E' },
  tabTxtActivo:   { color: '#E63946', fontWeight: '700' },
  badge:          { backgroundColor: '#E63946', borderRadius: 10, minWidth: 18, height: 18, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' },
  badgeTxt:       { color: '#FFF', fontSize: 10, fontWeight: '800' },
  lista:          { padding: 16, gap: 10 },
  vacio:          { textAlign: 'center', color: '#9E9E9E', marginTop: 40 },
  seccion:        { fontSize: 14, fontWeight: '600', color: '#1A1A1A', marginTop: 4 },

  tarjeta:        { backgroundColor: '#FFF', borderRadius: 12, padding: 14, elevation: 1 },
  filaProducto:   { flexDirection: 'row', alignItems: 'center' },
  ordenTop:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  ordenId:        { fontSize: 13, fontWeight: '600', color: '#1A1A1A' },
  estadoBadge:    { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  estadoTxt:      { fontSize: 11, fontWeight: '700' },
  ordenItems:     { fontSize: 12, color: '#9E9E9E', marginBottom: 8 },
  ordenBottom:    { flexDirection: 'row', justifyContent: 'space-between' },
  ordenFecha:     { fontSize: 11, color: '#9E9E9E' },
  ordenTotal:     { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },

  // ── Repartidor ──
  repartidorRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  repartidorTxt:  { fontSize: 12, color: '#555', fontWeight: '600' },
  asignarLink:    { fontSize: 12, color: '#E63946', fontWeight: '700' },
  repartidorChips:{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  sinRepartidores:{ fontSize: 12, color: '#9E9E9E', fontStyle: 'italic' },
  repChip:        { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#E2E2E2' },
  repChipActivo:  { backgroundColor: '#2196F3', borderColor: '#2196F3' },
  repChipTxt:     { fontSize: 12, color: '#333' },
  repChipTxtActivo:{ color: '#FFF', fontWeight: '700' },
  repChipQuitar:  { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: '#FFF0F0', borderWidth: 1, borderColor: '#F5C6CB' },
  repChipQuitarTxt:{ fontSize: 12, color: '#E63946', fontWeight: '700' },

  // ── Botones de acción en historial ──
  accionesOrden:  { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F0F0F0', flexWrap: 'wrap' },
  btnWhats:       { flex: 1, backgroundColor: '#E7F8EF', borderRadius: 8, paddingVertical: 8, alignItems: 'center', minWidth: 96 },
  btnWhatsTxt:    { color: '#1B8A4B', fontWeight: '700', fontSize: 13 },
  btnEnCamino:    { flex: 1, backgroundColor: '#E3F2FD', borderRadius: 8, paddingVertical: 8, alignItems: 'center', minWidth: 96 },
  btnEnCaminoTxt: { color: '#1565C0', fontWeight: '600', fontSize: 13 },
  btnEntregado:   { flex: 1, backgroundColor: '#E8F5E9', borderRadius: 8, paddingVertical: 8, alignItems: 'center', minWidth: 96 },
  btnEntregadoTxt:{ color: '#2E7D32', fontWeight: '700', fontSize: 13 },
  btnEliminarOrden:    { backgroundColor: '#FFF0F0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  btnEliminarOrdenTxt: { fontSize: 16 },

  // ── Nueva orden ──
  chips:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:           { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#EBEBEB' },
  chipActivo:     { backgroundColor: '#E63946', borderColor: '#E63946' },
  chipTxt:        { fontSize: 13, color: '#1A1A1A' },
  chipTxtActivo:  { color: '#FFF', fontWeight: '600' },
  avisoCliente:   { backgroundColor: '#FFF8E1', borderRadius: 10, padding: 12, borderLeftWidth: 3, borderLeftColor: '#FF9800' },
  avisoClienteTxt:{ fontSize: 13, color: '#E65100', fontWeight: '500' },

  prodNombre:     { fontSize: 13, fontWeight: '600', color: '#1A1A1A' },
  prodPrecio:     { fontSize: 12, color: '#9E9E9E' },
  contador:       { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cntBtn:         { width: 30, height: 30, borderRadius: 15, backgroundColor: '#E63946', alignItems: 'center', justifyContent: 'center' },
  cntBtnTxt:      { color: '#FFF', fontSize: 18, fontWeight: '700', lineHeight: 22 },
  cntValor:       { fontSize: 16, fontWeight: '700', minWidth: 24, textAlign: 'center' },
  totalWrap:      { backgroundColor: '#FFF', borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel:     { fontSize: 14, color: '#9E9E9E' },
  totalValor:     { fontSize: 20, fontWeight: '700', color: '#1A1A1A' },
  btnPrimario:    { backgroundColor: '#E63946', borderRadius: 12, padding: 16, alignItems: 'center' },
  btnDeshabilitado:{ backgroundColor: '#CCCCCC' },
  btnPrimarioTxt: { color: '#FFF', fontWeight: '700', fontSize: 15 },

  // ── Notificaciones ──
  marcarTodas:    { alignSelf: 'flex-end', paddingVertical: 6, paddingHorizontal: 4 },
  marcarTodasTxt: { fontSize: 12, color: '#E63946', fontWeight: '700' },
  notif:          { backgroundColor: '#FFF', borderRadius: 12, padding: 14, flexDirection: 'row', gap: 12, alignItems: 'flex-start', elevation: 1 },
  notifNoLeida:   { backgroundColor: '#FFF7F8', borderLeftWidth: 3, borderLeftColor: '#E63946' },
  notifIcono:     { fontSize: 24 },
  notifTitulo:    { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  notifMsg:       { fontSize: 13, color: '#444', marginTop: 2 },
  notifTiempo:    { fontSize: 11, color: '#9E9E9E', marginTop: 4 },
  puntoNoLeido:   { width: 9, height: 9, borderRadius: 5, backgroundColor: '#E63946', marginTop: 4 },
});
