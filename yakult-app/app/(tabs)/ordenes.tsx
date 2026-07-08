import { useState, useCallback } from 'react';
import { ScrollView, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { XStack, YStack } from 'tamagui';
import { useFocusEffect } from 'expo-router';
import { OrdenesDB, ClientesDB, ProductosDB, NotificacionesDB, AuthDB, PagosDB } from '../../services/db';
import AppHeader from '../../components/AppHeader';
import { confirmar } from '../../utils/confirmar';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { colors } from '../../tamagui.config';
import {
  AppButton, AppText, Badge, Card, Chip, EmptyState, Loading, Screen, type IconName,
} from '../../components/ui';

type Tab    = 'historial' | 'nueva' | 'notificaciones';

const COLOR_ESTADO: Record<string, string> = {
  'Entregado': '#4CAF50', 'En camino': '#2196F3', 'Pendiente': '#FF9800',
};

// ── Sprint 9: estado de cobro (Mercado Pago) ──
const PAGO_META: Record<string, { label: string; color: string }> = {
  'Sin pago':    { label: 'Sin cobro',       color: '#8A8F99' },
  'Pendiente':   { label: 'Pago pendiente',  color: '#FF9800' },
  'Aprobado':    { label: 'Pagada',          color: '#4CAF50' },
  'Rechazado':   { label: 'Pago rechazado',  color: '#E63946' },
  'Reembolsado': { label: 'Reembolsado',     color: '#7B61FF' },
};

// Abre una URL en web (pestaña nueva) o nativo
const abrirUrl = async (url: string) => {
  if (Platform.OS === 'web') { window.open(url, '_blank'); return; }
  await Linking.openURL(url);
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

const ICONO_NOTIF: Record<string, IconName> = {
  asignacion: 'car-outline', estado: 'sync-outline', info: 'notifications-outline',
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
  const [cobrandoId,    setCobrandoId]    = useState<number | null>(null);
  const [verificandoId, setVerificandoId] = useState<number | null>(null);

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

  // ── Sprint 9: cobro con Mercado Pago ────────────────
  // Abre el Checkout Pro para cobrar en el momento (en persona / mismo dispositivo).
  const cobrarOrden = async (o: any) => {
    setCobrandoId(o.id);
    const res = await PagosDB.crearPreferencia(o.id);
    setCobrandoId(null);
    if (res?.error) { mostrar(res.error, 'error'); return; }
    mostrar('Abriendo Checkout de Mercado Pago…', 'info');
    await abrirUrl(res.link);
    await cargar();
  };

  // Genera el link de pago y se lo manda al cliente por WhatsApp.
  const enviarLinkPago = async (o: any) => {
    if (!o.clienteTelefono) { mostrar('Este cliente no tiene teléfono registrado.', 'error'); return; }
    setCobrandoId(o.id);
    const res = await PagosDB.crearPreferencia(o.id);
    setCobrandoId(null);
    if (res?.error) { mostrar(res.error, 'error'); return; }
    const msg = `Hola ${o.clienteNombre} 👋\nTu pedido #${o.id} de Yakult está confirmado.\nTotal: $${Number(o.total).toFixed(2)}\nPaga aquí de forma segura con Mercado Pago:\n${res.link}\n¡Gracias! 🥛`;
    const link = waLink(o.clienteTelefono, msg);
    if (!link) { mostrar('Este cliente no tiene teléfono registrado.', 'error'); return; }
    try { await abrirUrl(link); } catch { mostrar('No se pudo abrir WhatsApp.', 'error'); }
    await cargar();
  };

  // Fallback sin webhooks (local): consulta a MP el estado real del cobro.
  const verificarPago = async (o: any) => {
    setVerificandoId(o.id);
    const res = await PagosDB.verificar(o.id);
    setVerificandoId(null);
    if (res?.error) { mostrar(res.error, 'error'); return; }
    mostrar(res.mensaje ?? `Estado de cobro: ${res.pagoEstado}`, res.pagoEstado === 'Aprobado' ? 'success' : 'info');
    await cargar();
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
    const nueva = await OrdenesDB.agregar({
      clienteId: clienteSel.id,
      vendedorId: usuario?.id ?? null,
      repartidorId: repartidorSel?.id ?? null,
      items,
      total,
    });
    // Sprint 9: el pago es obligatorio y 100% digital → se genera el cobro
    // de Mercado Pago automáticamente al crear la orden.
    if (nueva?.id) {
      const pref = await PagosDB.crearPreferencia(nueva.id);
      if (pref?.error) {
        mostrar(`Orden #${nueva.id} creada, pero el cobro no se generó: ${pref.error}`, 'error');
      } else {
        mostrar(`Orden #${nueva.id} creada · cobro de Mercado Pago generado`, 'success');
      }
    } else {
      mostrar('Orden creada correctamente', 'success');
    }
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

  // Stepper circular +/− para cantidades
  const StepBtn = ({ icon, onPress }: { icon: IconName; onPress: () => void }) => (
    <YStack
      width={30}
      height={30}
      borderRadius={15}
      backgroundColor="$primary"
      alignItems="center"
      justifyContent="center"
      cursor="pointer"
      pressStyle={{ opacity: 0.75 }}
      onPress={onPress}
    >
      <Ionicons name={icon} size={16} color="#FFF" />
    </YStack>
  );

  return (
    <Screen>
      <AppHeader titulo="Órdenes" />

      {/* Tabs internos */}
      <XStack backgroundColor="$card" borderBottomWidth={1} borderBottomColor="$line">
        {(['historial', 'nueva', 'notificaciones'] as Tab[]).map(t => (
          <YStack
            key={t}
            flex={1}
            paddingVertical={12}
            alignItems="center"
            borderBottomWidth={2}
            borderBottomColor={tab === t ? '$primary' : 'transparent'}
            cursor="pointer"
            pressStyle={{ opacity: 0.7 }}
            onPress={() => setTab(t)}
          >
            <XStack alignItems="center" gap={6}>
              <AppText
                fontSize={12.5}
                fontWeight={tab === t ? '700' : '600'}
                color={tab === t ? '$primary' : '$muted'}
              >
                {t === 'historial' ? 'Historial' : t === 'nueva' ? 'Nueva' : 'Avisos'}
              </AppText>
              {t === 'notificaciones' && noLeidas > 0 && (
                <YStack
                  backgroundColor="$primary"
                  borderRadius={10}
                  minWidth={18}
                  height={18}
                  paddingHorizontal={5}
                  alignItems="center"
                  justifyContent="center"
                >
                  <AppText color="#FFF" fontSize={10} fontWeight="800">{noLeidas}</AppText>
                </YStack>
              )}
            </XStack>
          </YStack>
        ))}
      </XStack>

      {cargando
        ? <Loading />
        : (
          <>
            {/* ── HISTORIAL ── */}
            {tab === 'historial' && (
              <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
                {ordenes.length === 0
                  ? <EmptyState icon="receipt-outline" mensaje="Sin órdenes. Crea una." />
                  : ordenes.map((o: any) => (
                    <Card key={o.id} padding={14} gap={0}>
                      {/* Cabecera de la orden */}
                      <XStack justifyContent="space-between" alignItems="center" marginBottom={6} gap={8}>
                        <AppText flex={1} fontSize={13} fontWeight="600" numberOfLines={1}>#{o.id} · {o.clienteNombre}</AppText>
                        <XStack gap={6}>
                          <Badge color={(PAGO_META[o.pagoEstado] ?? PAGO_META['Sin pago']).color}>
                            {(PAGO_META[o.pagoEstado] ?? PAGO_META['Sin pago']).label}
                          </Badge>
                          <Badge color={COLOR_ESTADO[o.estado]}>{o.estado}</Badge>
                        </XStack>
                      </XStack>

                      <AppText fontSize={12} tone="muted" marginBottom={8}>
                        {o.items?.map((i: any) => `${i.nombre} ×${i.cantidad}`).join(', ')}
                      </AppText>

                      <XStack justifyContent="space-between">
                        <AppText fontSize={11} tone="muted">{o.fecha}</AppText>
                        <AppText fontSize={13} fontWeight="700">${Number(o.total).toFixed(2)}</AppText>
                      </XStack>

                      {/* ── Repartidor ── */}
                      <XStack
                        justifyContent="space-between"
                        alignItems="center"
                        marginTop={10}
                        paddingTop={10}
                        borderTopWidth={1}
                        borderTopColor="$line"
                      >
                        <XStack alignItems="center" gap={6}>
                          <Ionicons name="car-outline" size={15} color={colors.muted} />
                          <AppText fontSize={12} fontWeight="600" color="#555">
                            {o.repartidorNombre ? o.repartidorNombre : 'Sin repartidor'}
                          </AppText>
                        </XStack>
                        {puedeAsignar && o.estado !== 'Entregado' && (
                          <AppText
                            fontSize={12}
                            tone="primary"
                            fontWeight="700"
                            cursor="pointer"
                            pressStyle={{ opacity: 0.6 }}
                            onPress={() => setAsignandoId(asignandoId === o.id ? null : o.id)}
                          >
                            {o.repartidorId ? 'Cambiar' : 'Asignar'}
                          </AppText>
                        )}
                      </XStack>

                      {/* Selector de repartidor (desplegable) */}
                      {asignandoId === o.id && (
                        <XStack flexWrap="wrap" gap={8} marginTop={10}>
                          {repartidores.length === 0 ? (
                            <AppText fontSize={12} tone="muted" fontStyle="italic">No hay repartidores registrados.</AppText>
                          ) : repartidores.map((r: any) => (
                            <Chip
                              key={r.id}
                              tone="info"
                              compact
                              active={o.repartidorId === r.id}
                              onPress={() => asignarRepartidor(o.id, r.id)}
                            >
                              {r.nombre}
                            </Chip>
                          ))}
                          {o.repartidorId && (
                            <XStack
                              paddingHorizontal={12}
                              paddingVertical={6}
                              borderRadius={20}
                              backgroundColor="$dangerSoft"
                              borderWidth={1}
                              borderColor="#F5C6CB"
                              cursor="pointer"
                              pressStyle={{ opacity: 0.7 }}
                              onPress={() => asignarRepartidor(o.id, null)}
                            >
                              <AppText fontSize={12} tone="primary" fontWeight="700">Quitar</AppText>
                            </XStack>
                          )}
                        </XStack>
                      )}

                      {/* ── Acciones ── */}
                      <XStack
                        gap={8}
                        marginTop={12}
                        paddingTop={10}
                        borderTopWidth={1}
                        borderTopColor="$line"
                        flexWrap="wrap"
                      >
                        <AppButton
                          size="sm"
                          variant="whatsapp"
                          icon="logo-whatsapp"
                          flex={1}
                          minWidth={96}
                          onPress={() => avisarCliente(o)}
                        >
                          {o.estado === 'Pendiente' ? 'Confirmar' : 'Avisar'}
                        </AppButton>

                        {o.estado === 'Pendiente' && (
                          <AppButton
                            size="sm"
                            variant="info"
                            icon="bicycle"
                            flex={1}
                            minWidth={96}
                            onPress={() => avanzarEstado(o)}
                          >
                            En camino
                          </AppButton>
                        )}
                        {o.estado !== 'Entregado' && (
                          <AppButton
                            size="sm"
                            variant="success"
                            icon="checkmark"
                            flex={1}
                            minWidth={96}
                            onPress={() => marcarEntregado(o.id)}
                          >
                            Entregado
                          </AppButton>
                        )}
                        {/* Una orden pagada es registro contable: no se elimina */}
                        {o.estado !== 'Entregado' && o.pagoEstado !== 'Aprobado' && (
                          <AppButton size="sm" variant="danger" icon="trash-outline" onPress={() => eliminarOrden(o)} />
                        )}
                      </XStack>

                      {/* ── Cobro con Mercado Pago (Sprint 9) ── */}
                      {o.pagoEstado !== 'Aprobado' && (
                        <XStack
                          gap={8}
                          marginTop={8}
                          paddingTop={10}
                          borderTopWidth={1}
                          borderTopColor="$line"
                          flexWrap="wrap"
                        >
                          <AppButton
                            size="sm"
                            icon="card-outline"
                            flex={1}
                            minWidth={96}
                            loading={cobrandoId === o.id}
                            onPress={() => cobrarOrden(o)}
                          >
                            Cobrar
                          </AppButton>
                          <AppButton
                            size="sm"
                            variant="whatsapp"
                            icon="link-outline"
                            flex={1}
                            minWidth={96}
                            loading={cobrandoId === o.id}
                            onPress={() => enviarLinkPago(o)}
                          >
                            Enviar link
                          </AppButton>
                          <AppButton
                            size="sm"
                            variant="secondary"
                            icon="refresh"
                            flex={1}
                            minWidth={96}
                            loading={verificandoId === o.id}
                            onPress={() => verificarPago(o)}
                          >
                            Verificar
                          </AppButton>
                        </XStack>
                      )}
                    </Card>
                  ))
                }
              </ScrollView>
            )}

            {/* ── NUEVA ORDEN ── */}
            {tab === 'nueva' && (
              <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>

                {/* Selección de cliente */}
                <AppText fontSize={14} fontWeight="700" marginTop={4}>Cliente</AppText>
                <XStack flexWrap="wrap" gap={8}>
                  {clientes.map((c: any) => (
                    <Chip
                      key={c.id}
                      active={clienteSel?.id === c.id}
                      onPress={() => setClienteSel(clienteSel?.id === c.id ? null : c)}
                    >
                      {c.nombre}
                    </Chip>
                  ))}
                </XStack>

                {/* Aviso si no hay cliente seleccionado */}
                {!clienteSel && (
                  <XStack
                    alignItems="center"
                    gap={8}
                    backgroundColor="$warningSoft"
                    borderRadius={10}
                    padding={12}
                    borderLeftWidth={3}
                    borderLeftColor="$warning"
                  >
                    <Ionicons name="warning" size={16} color={colors.warningInk} />
                    <AppText flex={1} fontSize={13} color="$warningInk" fontWeight="500">
                      Selecciona un cliente para continuar
                    </AppText>
                  </XStack>
                )}

                {/* Repartidor (opcional) */}
                <AppText fontSize={14} fontWeight="700" marginTop={4}>Repartidor (opcional)</AppText>
                <XStack flexWrap="wrap" gap={8}>
                  {repartidores.length === 0 ? (
                    <AppText fontSize={12} tone="muted" fontStyle="italic">No hay repartidores registrados.</AppText>
                  ) : repartidores.map((r: any) => (
                    <Chip
                      key={r.id}
                      tone="info"
                      active={repartidorSel?.id === r.id}
                      onPress={() => setRepartidorSel(repartidorSel?.id === r.id ? null : r)}
                    >
                      {r.nombre}
                    </Chip>
                  ))}
                </XStack>

                {/* Productos */}
                <AppText fontSize={14} fontWeight="700" marginTop={4}>Productos</AppText>
                {productos.map((p: any) => (
                  <Card key={p.id} flexDirection="row" alignItems="center" padding={14}>
                    <YStack flex={1} gap={2}>
                      <AppText fontSize={13} fontWeight="600">{p.nombre}</AppText>
                      <AppText fontSize={12} tone="muted">${p.precio} · Stock: {p.stock}</AppText>
                    </YStack>
                    <XStack alignItems="center" gap={12}>
                      <StepBtn icon="remove" onPress={() => cambiarCantidad(p.id, -1)} />
                      <AppText fontSize={16} fontWeight="700" minWidth={24} textAlign="center">
                        {cantidades[p.id] ?? 0}
                      </AppText>
                      <StepBtn icon="add" onPress={() => cambiarCantidad(p.id, 1)} />
                    </XStack>
                  </Card>
                ))}

                {/* Total */}
                <Card flexDirection="row" justifyContent="space-between" alignItems="center">
                  <AppText fontSize={14} tone="muted">Total</AppText>
                  <AppText fontSize={20} fontWeight="800">${total.toFixed(2)}</AppText>
                </Card>

                {/* Botón — deshabilitado si no hay cliente */}
                <AppButton
                  loading={guardando}
                  disabled={!puedeConfirmar || guardando}
                  onPress={crearOrden}
                  icon={puedeConfirmar ? 'checkmark-circle-outline' : undefined}
                >
                  {!clienteSel ? 'Selecciona un cliente' : total === 0 ? 'Agrega productos' : 'Confirmar orden'}
                </AppButton>
              </ScrollView>
            )}

            {/* ── NOTIFICACIONES (bandeja real) ── */}
            {tab === 'notificaciones' && (
              <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
                {noLeidas > 0 && (
                  <XStack
                    alignSelf="flex-end"
                    alignItems="center"
                    gap={6}
                    paddingVertical={6}
                    paddingHorizontal={4}
                    cursor="pointer"
                    pressStyle={{ opacity: 0.6 }}
                    onPress={marcarTodas}
                  >
                    <Ionicons name="checkmark-done" size={14} color={colors.primary} />
                    <AppText fontSize={12} tone="primary" fontWeight="700">
                      Marcar todas como leídas ({noLeidas})
                    </AppText>
                  </XStack>
                )}
                {notifs.length === 0
                  ? <EmptyState icon="notifications-off-outline" mensaje="No tienes notificaciones." />
                  : notifs.map((n: any) => (
                    <Card
                      key={n.id}
                      flexDirection="row"
                      gap={12}
                      alignItems="flex-start"
                      padding={14}
                      backgroundColor={n.leida ? '$card' : '$primaryTint'}
                      borderLeftWidth={n.leida ? 0 : 3}
                      borderLeftColor="$primary"
                      cursor="pointer"
                      pressStyle={{ opacity: 0.8 }}
                      onPress={() => abrirNotif(n)}
                    >
                      <YStack
                        width={38}
                        height={38}
                        borderRadius={12}
                        backgroundColor="$primarySoft"
                        alignItems="center"
                        justifyContent="center"
                      >
                        <Ionicons name={ICONO_NOTIF[n.tipo] ?? 'notifications-outline'} size={18} color={colors.primary} />
                      </YStack>
                      <YStack flex={1} gap={2}>
                        <AppText fontSize={13} fontWeight="700">{n.titulo}</AppText>
                        <AppText fontSize={13} color="#444">{n.mensaje}</AppText>
                        <AppText fontSize={11} tone="muted" marginTop={2}>{n.fecha}</AppText>
                      </YStack>
                      {!n.leida && (
                        <YStack width={9} height={9} borderRadius={5} backgroundColor="$primary" marginTop={4} />
                      )}
                    </Card>
                  ))
                }
              </ScrollView>
            )}
          </>
        )
      }
    </Screen>
  );
}
