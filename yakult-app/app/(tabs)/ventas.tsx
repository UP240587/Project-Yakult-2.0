import { useCallback, useState } from 'react';
import { ScrollView, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { XStack, YStack } from 'tamagui';
import { useFocusEffect } from 'expo-router';
import AppHeader from '../../components/AppHeader';
import { PagosDB } from '../../services/db';
import { colors } from '../../tamagui.config';
import { AppText, Badge, Card, EmptyState, Loading, Screen, type IconName } from '../../components/ui';

// ── Sprint 9: pantalla de cobranza (pagos Mercado Pago) ──

const PAGO_META: Record<string, { label: string; color: string }> = {
  'Pendiente':   { label: 'Pendiente',   color: '#FF9800' },
  'Aprobado':    { label: 'Aprobado',    color: '#4CAF50' },
  'Rechazado':   { label: 'Rechazado',   color: '#E63946' },
  'Reembolsado': { label: 'Reembolsado', color: '#7B61FF' },
};

const money = (n: number) =>
  `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const abrirUrl = async (url: string) => {
  if (Platform.OS === 'web') { window.open(url, '_blank'); return; }
  await Linking.openURL(url);
};

type Pago = {
  id: number;
  ordenId: number;
  clienteNombre: string;
  estado: string;
  monto: number;
  metodo: string | null;
  mpPaymentId: string | null;
  linkPago: string | null;
  fecha: string;
};

type Resumen = { cobrado: number; porCobrar: number; totalIntentos: number; aprobados: number };

export default function VentasScreen() {
  const [cargando, setCargando] = useState(true);
  const [error, setError]       = useState('');
  const [pagos, setPagos]       = useState<Pago[]>([]);
  const [resumen, setResumen]   = useState<Resumen | null>(null);

  useFocusEffect(useCallback(() => { cargar(); }, []));

  const cargar = async () => {
    setCargando(true);
    setError('');
    const res = await PagosDB.getAll();
    if (res?.error) {
      setError(res.error);
    } else {
      setPagos(res.pagos ?? []);
      setResumen(res.resumen ?? null);
    }
    setCargando(false);
  };

  const RESUMEN_CARDS: Array<{ label: string; valor: string; icono: IconName; color: string }> = resumen ? [
    { label: 'Cobrado',     valor: money(resumen.cobrado),          icono: 'checkmark-circle-outline', color: '#4CAF50' },
    { label: 'Por cobrar',  valor: money(resumen.porCobrar),        icono: 'time-outline',             color: '#FF9800' },
    { label: 'Intentos',    valor: String(resumen.totalIntentos),   icono: 'card-outline',             color: colors.primary },
  ] : [];

  return (
    <Screen>
      <AppHeader titulo="Ventas" subtitulo="Cobranza · Mercado Pago" />

      {cargando ? (
        <Loading />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}>

          {error ? (
            <XStack
              backgroundColor="$dangerSoft"
              alignItems="center"
              gap={8}
              padding={12}
              borderRadius={12}
            >
              <Ionicons name="alert-circle" size={16} color="#B71C1C" />
              <AppText flex={1} color="#B71C1C" fontSize={12} fontWeight="600">{error}</AppText>
            </XStack>
          ) : null}

          {/* Resumen de cobranza */}
          {resumen && (
            <XStack gap={10} flexWrap="wrap">
              {RESUMEN_CARDS.map((c) => (
                <Card key={c.label} flex={1} minWidth={100} alignItems="center" gap={6} paddingVertical={16} paddingHorizontal={8}>
                  <YStack
                    width={34}
                    height={34}
                    borderRadius={11}
                    backgroundColor={`${c.color}1A`}
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Ionicons name={c.icono} size={16} color={c.color} />
                  </YStack>
                  <AppText fontSize={17} fontWeight="900" color={c.color} numberOfLines={1} adjustsFontSizeToFit>{c.valor}</AppText>
                  <AppText fontSize={11} tone="muted" fontWeight="600">{c.label}</AppText>
                </Card>
              ))}
            </XStack>
          )}

          {/* Historial de pagos */}
          <AppText fontSize={15} fontWeight="700" marginTop={4}>Historial de cobros</AppText>
          {pagos.length === 0 ? (
            <EmptyState
              icon="wallet-outline"
              mensaje="Sin cobros registrados."
              detalle="Los pagos de Mercado Pago aparecerán aquí al generar cobros desde Órdenes."
            />
          ) : pagos.map((p) => {
            const meta = PAGO_META[p.estado] ?? PAGO_META['Pendiente'];
            return (
              <Card key={p.id} padding={14} gap={8}>
                <XStack justifyContent="space-between" alignItems="center" gap={8}>
                  <AppText flex={1} fontSize={13} fontWeight="700" numberOfLines={1}>
                    Orden #{p.ordenId} · {p.clienteNombre}
                  </AppText>
                  <AppText fontSize={14} fontWeight="900" color={meta.color}>{money(p.monto)}</AppText>
                </XStack>
                <XStack alignItems="center" gap={8} flexWrap="wrap">
                  <Badge color={meta.color}>{meta.label}</Badge>
                  {p.metodo ? <AppText fontSize={11} tone="muted" fontWeight="600">{p.metodo}</AppText> : null}
                  <AppText fontSize={11} tone="muted">{p.fecha}</AppText>
                  {p.mpPaymentId ? <AppText fontSize={11} tone="muted">MP #{p.mpPaymentId}</AppText> : null}
                </XStack>
                {p.estado === 'Pendiente' && p.linkPago ? (
                  <XStack
                    alignSelf="flex-start"
                    alignItems="center"
                    gap={6}
                    backgroundColor="$primarySoft"
                    paddingHorizontal={12}
                    paddingVertical={6}
                    borderRadius={20}
                    cursor="pointer"
                    pressStyle={{ opacity: 0.7 }}
                    onPress={() => abrirUrl(p.linkPago!)}
                  >
                    <Ionicons name="open-outline" size={13} color={colors.primary} />
                    <AppText fontSize={11.5} tone="primary" fontWeight="700">Abrir link de pago</AppText>
                  </XStack>
                ) : null}
              </Card>
            );
          })}
        </ScrollView>
      )}
    </Screen>
  );
}
