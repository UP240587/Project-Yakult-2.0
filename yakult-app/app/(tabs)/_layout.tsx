import { Tabs, Redirect } from 'expo-router';
import { Text, View, ActivityIndicator } from 'react-native';
import { useAuth } from '../../context/AuthContext';

const TABS = [
  { name: 'index',    label: 'Inicio',    icon: '🏠' },
  { name: 'productos',label: 'Productos', icon: '📦' },
  { name: 'clientes', label: 'Clientes',  icon: '👥' },
  { name: 'ordenes',  label: 'Órdenes',   icon: '🛒' },
  { name: 'reportes', label: 'Reportes',  icon: '📈' },
];

export default function TabLayout() {
  const { usuario, cargando } = useAuth();

  if (cargando) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#E63946" />
    </View>
  );

  if (!usuario) return <Redirect href="/auth" />;

  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor:   '#E63946',
      tabBarInactiveTintColor: '#9E9E9E',
      tabBarStyle: { backgroundColor: '#FFF', borderTopColor: '#EBEBEB', height: 60, paddingBottom: 6 },
    }}>
      {TABS.map(tab => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{
          title: tab.label,
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>{tab.icon}</Text>,
        }} />
      ))}
      {/* Accesibles via router.push pero ocultos del tab bar */}
      <Tabs.Screen name="perfil" options={{ href: null }} />
      <Tabs.Screen name="admin"  options={{ href: null }} />
      <Tabs.Screen name="ventas" options={{ href: null }} />
    </Tabs>
  );
}
