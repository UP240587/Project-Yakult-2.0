import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Spinner, YStack } from 'tamagui';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../tamagui.config';
import type { IconName } from '../../components/ui';

const TABS: Array<{ name: string; label: string; icon: IconName; iconOutline: IconName }> = [
  { name: 'index',     label: 'Inicio',    icon: 'home',        iconOutline: 'home-outline' },
  { name: 'productos', label: 'Productos', icon: 'cube',        iconOutline: 'cube-outline' },
  { name: 'clientes',  label: 'Clientes',  icon: 'people',      iconOutline: 'people-outline' },
  { name: 'ordenes',   label: 'Órdenes',   icon: 'cart',        iconOutline: 'cart-outline' },
  { name: 'reportes',  label: 'Reportes',  icon: 'stats-chart', iconOutline: 'stats-chart-outline' },
];

export default function TabLayout() {
  const { usuario, cargando } = useAuth();

  if (cargando) return (
    <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$bg">
      <Spinner size="large" color="$primary" />
    </YStack>
  );

  if (!usuario) return <Redirect href="/auth" />;

  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor:   colors.primary,
      tabBarInactiveTintColor: colors.muted,
      tabBarStyle: { backgroundColor: '#FFF', borderTopColor: colors.line, height: 60, paddingBottom: 6 },
      tabBarLabelStyle: { fontFamily: 'Inter_600SemiBold', fontSize: 10.5 },
    }}>
      {TABS.map(tab => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{
          title: tab.label,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? tab.icon : tab.iconOutline} size={20} color={color} />
          ),
        }} />
      ))}
      {/* Accesibles via router.push pero ocultos del tab bar */}
      <Tabs.Screen name="perfil"    options={{ href: null }} />
      <Tabs.Screen name="admin"     options={{ href: null }} />
      <Tabs.Screen name="ventas"    options={{ href: null }} />
      <Tabs.Screen name="dashboard" options={{ href: null }} />
    </Tabs>
  );
}
