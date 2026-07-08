import { useState } from 'react';
import { Modal, Alert, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { XStack, YStack } from 'tamagui';
import { useAuth } from '../context/AuthContext';
import { confirmar } from '../utils/confirmar';
import { colors } from '../tamagui.config';
import { AppText, Avatar, Badge, type IconName } from './ui';

export default function ProfileButton() {
  const [abierto, setAbierto] = useState(false);
  const { usuario, logout }   = useAuth();
  const router                = useRouter();

  const inicial  = usuario?.nombre?.[0]?.toUpperCase() ?? '?';
  const esMaster = usuario?.rol === 'Master';

  const navegar = (ruta: any) => { setAbierto(false); router.push(ruta); };

  const cerrarSesion = () => {
    setAbierto(false);
    confirmar('Cerrar sesión', '¿Confirmas cerrar sesión?', async () => {
      await logout();
      router.replace('/auth');
    });
  };

  const irAdmin = () => {
    if (!esMaster) {
      Alert.alert('Acceso restringido', 'Solo los usuarios Master pueden acceder al panel de administración.');
      return;
    }
    navegar('/(tabs)/admin');
  };

  const irDashboard = () => {
    if (!esMaster) {
      Alert.alert('Acceso restringido', 'Solo los usuarios Master pueden acceder al dashboard.');
      return;
    }
    navegar('/(tabs)/dashboard');
  };

  // Fila de menú reutilizable
  const Item = ({
    icon, label, onPress, right, color, disabledLook,
  }: {
    icon: IconName;
    label: string;
    onPress?: () => void;
    right?: React.ReactNode;
    color?: string;
    disabledLook?: boolean;
  }) => (
    <XStack
      alignItems="center"
      padding={14}
      gap={12}
      cursor="pointer"
      pressStyle={{ backgroundColor: '$field' }}
      onPress={onPress}
    >
      <Ionicons
        name={icon}
        size={19}
        color={color ?? (disabledLook ? '#BBBBBB' : colors.muted)}
        style={{ width: 24, textAlign: 'center' }}
      />
      <AppText flex={1} color={color ?? (disabledLook ? '#BBBBBB' : '$ink')}>{label}</AppText>
      {right}
    </XStack>
  );

  return (
    <YStack alignItems="center">
      <Pressable onPress={() => setAbierto(true)}>
        <Avatar inicial={inicial} size={42} elevation={3} />
      </Pressable>
      <AppText fontSize={9} tone="muted" marginTop={3} fontWeight="600" letterSpacing={0.3}>
        {esMaster ? 'Master' : 'Promotor'}
      </AppText>

      <Modal visible={abierto} transparent animationType="fade" onRequestClose={() => setAbierto(false)}>
        <Pressable style={s.overlay} onPress={() => setAbierto(false)}>
          <Pressable onPress={e => e.stopPropagation()}>
            <YStack
              backgroundColor="$card"
              borderRadius={16}
              width={290}
              overflow="hidden"
              elevation={10}
              shadowColor="#1A1A2E"
              shadowOpacity={0.18}
              shadowRadius={24}
              shadowOffset={{ width: 0, height: 8 }}
            >

              {/* Info usuario */}
              <XStack alignItems="center" padding={16} gap={12} backgroundColor="$field">
                <Avatar inicial={inicial} size={46} />
                <YStack flex={1}>
                  <AppText fontSize={14} fontWeight="700" numberOfLines={1}>{usuario?.nombre}</AppText>
                  <AppText fontSize={12} tone="muted" marginTop={2} numberOfLines={1}>{usuario?.correo}</AppText>
                </YStack>
              </XStack>

              <YStack height={1} backgroundColor="$line" />

              {/* Rol */}
              <Item
                icon="person-outline"
                label="Rol"
                right={
                  <Badge tone={esMaster ? 'master' : 'success'}>
                    {esMaster ? 'Master' : 'Promotor'}
                  </Badge>
                }
              />

              {/* Mi Perfil */}
              <Item
                icon="id-card-outline"
                label="Mi Perfil"
                onPress={() => navegar('/(tabs)/perfil')}
                right={<Ionicons name="chevron-forward" size={16} color="#C0C0C0" />}
              />

              {/* Ventas / Cobranza (Sprint 9: pagos Mercado Pago) */}
              <Item
                icon="wallet-outline"
                label="Ventas / Cobranza"
                onPress={() => navegar('/(tabs)/ventas')}
                right={<Ionicons name="chevron-forward" size={16} color="#C0C0C0" />}
              />

              {/* Dashboard de estadísticas (solo Master) */}
              <Item
                icon={esMaster ? 'stats-chart-outline' : 'lock-closed-outline'}
                label="Dashboard"
                onPress={irDashboard}
                disabledLook={!esMaster}
                right={!esMaster ? <AppText fontSize={11} color="#BBBBBB">Solo Masters</AppText> : undefined}
              />

              {/* Administrador */}
              <Item
                icon={esMaster ? 'settings-outline' : 'lock-closed-outline'}
                label="Administrador"
                onPress={irAdmin}
                disabledLook={!esMaster}
                right={!esMaster ? <AppText fontSize={11} color="#BBBBBB">Solo Masters</AppText> : undefined}
              />

              {/* Ayuda */}
              <Item
                icon="help-circle-outline"
                label="Ayuda"
                onPress={() => { setAbierto(false); Alert.alert('Ayuda', 'Soporte: soporte@yakult-ags.mx'); }}
              />

              <YStack height={1} backgroundColor="$line" />

              {/* Cerrar sesión */}
              <Item icon="log-out-outline" label="Cerrar sesión" color={colors.primary} onPress={cerrarSesion} />

            </YStack>
          </Pressable>
        </Pressable>
      </Modal>
    </YStack>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-start', alignItems: 'flex-start', paddingTop: 90, paddingLeft: 12 },
});
