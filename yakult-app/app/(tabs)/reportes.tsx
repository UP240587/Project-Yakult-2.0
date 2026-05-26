import { View, Text, StyleSheet } from 'react-native';

const TITULO = 'Reportes'; 

export default function ReportesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>{TITULO}</Text>
      <Text style={styles.sub}>Próximamente</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F2F2F2' },
  titulo:    { fontSize: 24, fontWeight: '700', color: '#1A1A1A' },
  sub:       { fontSize: 14, color: '#9E9E9E', marginTop: 6 },
});