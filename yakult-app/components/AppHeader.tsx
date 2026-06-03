import { View, Text, StyleSheet } from 'react-native';
import ProfileButton from './ProfileButton';

type Props = {
  titulo?:    string;
  subtitulo?: string;
  colorFondo?: string;
  derecha?:   React.ReactNode;
};

export default function AppHeader({ titulo, subtitulo, colorFondo = '#FFF', derecha }: Props) {
  const esColorado = !['#FFF','#FFFFFF','#FAFAFA','white'].includes(colorFondo);

  return (
    <View style={[s.header, { backgroundColor: colorFondo, borderBottomColor: esColorado ? 'transparent' : '#EBEBEB' }]}>
      <ProfileButton />
      <View style={s.centro}>
        {titulo    && <Text style={[s.titulo,    { color: esColorado ? '#FFF' : '#1A1A1A' }]}>{titulo}</Text>}
        {subtitulo && <Text style={[s.subtitulo, { color: esColorado ? 'rgba(255,255,255,0.8)' : '#9E9E9E' }]}>{subtitulo}</Text>}
      </View>
      {derecha && <View>{derecha}</View>}
    </View>
  );
}

const s = StyleSheet.create({
  header:   { paddingTop: 52, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1 },
  centro:   { flex: 1 },
  titulo:   { fontSize: 18, fontWeight: '700' },
  subtitulo:{ fontSize: 12, marginTop: 2 },
});