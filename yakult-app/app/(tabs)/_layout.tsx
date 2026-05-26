import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// ── Para cambiar íconos busca en: icons.expo.fyi ──
const TABS: {
  name: string;
  label: string;
  icono: keyof typeof Ionicons.glyphMap;
}[] = [
  { name: 'index',    label: 'Inicio',   icono: 'home-outline'      },
  { name: 'ventas',   label: 'Ventas',   icono: 'cart-outline'      },
  { name: 'reportes', label: 'Reportes', icono: 'bar-chart-outline'  },
  { name: 'clientes', label: 'Clientes', icono: 'people-outline'    },
  { name: 'perfil',   label: 'Perfil',   icono: 'person-outline'    },
];

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#E63946',
        tabBarInactiveTintColor: '#9E9E9E',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#EBEBEB',
          height: 60,
          paddingBottom: 6,
        },
      }}
    >
      {TABS.map(tab => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.label,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name={tab.icono} size={size} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}