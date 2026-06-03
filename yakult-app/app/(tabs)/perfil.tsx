import { View, Text, StyleSheet } from 'react-native';
import AppHeader from '../../components/AppHeader';

const TITULO = 'Perfil';

export default function PerfilScreen() {
  return (
    <View style={styles.pantalla}>
      <AppHeader titulo="Perfil" />
      
      <View style={styles.container}>
        <Text style={styles.titulo}>{TITULO}</Text>
        <Text style={styles.sub}>Próximamente</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla:  { flex: 1, backgroundColor: '#F2F2F2' },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  titulo:    { fontSize: 24, fontWeight: '700', color: '#1A1A1A' },
  sub:       { fontSize: 14, color: '#9E9E9E', marginTop: 6 },
});