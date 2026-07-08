import { useState, useCallback } from 'react';
import { ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { XStack, YStack } from 'tamagui';
import { Redirect, useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { AuthDB } from '../../services/db';
import AppHeader from '../../components/AppHeader';
import { confirmar } from '../../utils/confirmar';
import { colors } from '../../tamagui.config';
import {
  AppButton, AppText, Avatar, Badge, EmptyState, Loading, Screen, a11yState,
} from '../../components/ui';

type Rol = 'Master' | 'Promotor' | 'Repartidor';
type Usuario = { id: number; nombre: string; correo: string; rol: Rol; activo: boolean };

const ROLES: Rol[] = ['Master', 'Promotor', 'Repartidor'];
const ROL_META: Record<Rol, { label: string; tone: 'master' | 'success' | 'info'; ink: string }> = {
  Master:     { label: 'Master',     tone: 'master',  ink: '#856404' },
  Promotor:   { label: 'Promotor',   tone: 'success', ink: '#2E7D32' },
  Repartidor: { label: 'Repartidor', tone: 'info',    ink: '#1565C0' },
};

export default function AdminScreen() {
  const { usuario }           = useAuth();
  const [lista,   setLista]   = useState<Usuario[]>([]);
  const [cargando,setCargando]= useState(true);

  // Solo Masters pueden ver esta pantalla
  if (usuario?.rol !== 'Master') return <Redirect href="/(tabs)" />;

  useFocusEffect(useCallback(() => { cargar(); }, []));

  const cargar = async () => {
    setCargando(true);
    setLista(await AuthDB.getUsuarios());
    setCargando(false);
  };

  const toggleActivo = async (u: Usuario) => {
    await AuthDB.editarUsuario(u.id, { activo: !u.activo });
    await cargar();
  };

  const cambiarRol = (u: Usuario, rol: Rol) => {
    if (u.id === usuario?.id) { Alert.alert('Error', 'No puedes modificar tu propio rol.'); return; }
    if (u.rol === rol) return;
    confirmar('Cambiar rol', `¿Asignar el rol "${rol}" a "${u.nombre}"?`,
      async () => { await AuthDB.toggleMaster(u.id, rol); await cargar(); });
  };

  const eliminar = (u: Usuario) => {
    if (u.id === usuario?.id) { Alert.alert('Error', 'No puedes eliminarte a ti mismo.'); return; }
    confirmar('Eliminar', `¿Eliminar a "${u.nombre}"?`, async () => {
      await AuthDB.eliminarUsuario(u.id);
      await cargar();
    });
  };

  const HCol = ({ flex, children, right }: { flex: number; children: React.ReactNode; right?: boolean }) => (
    <AppText
      flex={flex}
      fontSize={11}
      fontWeight="700"
      tone="muted"
      textTransform="uppercase"
      letterSpacing={0.5}
      textAlign={right ? 'right' : 'left'}
    >
      {children}
    </AppText>
  );

  return (
    <Screen>
      <AppHeader titulo="Panel Administrador" subtitulo={`${lista.length} usuarios registrados`} />

      {cargando ? <Loading /> : (
        <ScrollView>
          {/* Encabezado tabla */}
          <XStack
            alignItems="center"
            paddingHorizontal={16}
            paddingVertical={10}
            backgroundColor="$field"
            borderBottomWidth={1}
            borderBottomColor="$line"
          >
            <HCol flex={2}>Promotor</HCol>
            <HCol flex={1.8}>Correo</HCol>
            <HCol flex={0.9}>Rol</HCol>
            <HCol flex={0.8}>Estado</HCol>
            <HCol flex={2.2} right>Acciones</HCol>
          </XStack>

          {lista.length === 0
            ? <EmptyState icon="people-outline" mensaje="Sin usuarios registrados." />
            : lista.map((u, i) => (
              <XStack
                key={u.id}
                alignItems="center"
                paddingHorizontal={16}
                paddingVertical={12}
                gap={8}
                backgroundColor={i % 2 === 0 ? '$field' : '$card'}
                borderBottomWidth={1}
                borderBottomColor="$line"
              >

                {/* Nombre */}
                <XStack flex={2} alignItems="center" gap={8}>
                  <Avatar
                    inicial={u.nombre[0].toUpperCase()}
                    color={u.rol === 'Master' ? '#F59E0B' : '$primary'}
                  />
                  <YStack flex={1}>
                    <AppText fontSize={13} fontWeight="600" numberOfLines={1}>{u.nombre}</AppText>
                    {u.id === usuario?.id && <AppText fontSize={9} tone="primary" fontWeight="700">Tú</AppText>}
                  </YStack>
                </XStack>

                {/* Correo */}
                <AppText flex={1.8} fontSize={12} color="#555" numberOfLines={1}>{u.correo}</AppText>

                {/* Rol badge */}
                <YStack flex={0.9}>
                  <Badge tone={ROL_META[u.rol].tone}>{ROL_META[u.rol].label}</Badge>
                </YStack>

                {/* Estado badge */}
                <YStack flex={0.8}>
                  <Badge tone={u.activo ? 'success' : 'danger'}>
                    {u.activo ? 'Activo' : 'Inactivo'}
                  </Badge>
                </YStack>

                {/* Acciones */}
                <XStack flex={2.2} gap={6} justifyContent="flex-end" alignItems="center">
                  <AppButton
                    size="sm"
                    variant={u.activo ? 'danger' : 'success'}
                    disabled={u.id === usuario?.id}
                    onPress={() => toggleActivo(u)}
                  >
                    {u.activo ? 'Desactivar' : 'Activar'}
                  </AppButton>

                  <XStack gap={4} backgroundColor="$line" borderRadius={8} padding={3}>
                    {ROLES.map((r) => (
                      <YStack
                        key={r}
                        width={26}
                        height={26}
                        borderRadius={6}
                        alignItems="center"
                        justifyContent="center"
                        backgroundColor={u.rol === r ? ROL_META[r].ink : '$card'}
                        cursor={u.id === usuario?.id ? 'default' : 'pointer'}
                        pressStyle={{ opacity: 0.7 }}
                        accessibilityLabel={`Asignar rol ${r}`}
                        {...a11yState({ disabled: u.id === usuario?.id })}
                        onPress={u.id === usuario?.id ? undefined : () => cambiarRol(u, r)}
                      >
                        <AppText fontSize={12} fontWeight="800" color={u.rol === r ? '#FFF' : '$muted'}>
                          {r[0]}
                        </AppText>
                      </YStack>
                    ))}
                  </XStack>

                  <YStack
                    padding={7}
                    backgroundColor="$dangerSoft"
                    borderRadius={8}
                    opacity={u.id === usuario?.id ? 0.3 : 1}
                    cursor={u.id === usuario?.id ? 'default' : 'pointer'}
                    pressStyle={{ opacity: 0.7 }}
                    {...a11yState({ disabled: u.id === usuario?.id })}
                    onPress={u.id === usuario?.id ? undefined : () => eliminar(u)}
                  >
                    <Ionicons name="trash-outline" size={15} color={colors.dangerInk} />
                  </YStack>
                </XStack>

              </XStack>
            ))
          }
        </ScrollView>
      )}
    </Screen>
  );
}
