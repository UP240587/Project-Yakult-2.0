import { useState, useCallback } from 'react';
import { ScrollView, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { XStack, YStack } from 'tamagui';
import { useFocusEffect } from 'expo-router';
import { ProductosDB } from '../../services/db';
import { confirmar } from '../../utils/confirmar';
import AppHeader from '../../components/AppHeader';
import { colors } from '../../tamagui.config';
import { AppButton, AppText, Card, EmptyState, Field, Loading, Screen } from '../../components/ui';

type Producto = { id: number; nombre: string; sku: string; precio: number; stock: number; categoria?: string };
type Vista    = 'lista' | 'agregar' | 'editar';

// ── Alerta compatible web + nativo ──────────────────────────────────────────
const alerta = (titulo: string, mensaje: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${titulo}\n\n${mensaje}`);
  } else {
    Alert.alert(titulo, mensaje);
  }
};

export default function ProductosScreen() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando]   = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [vista, setVista]         = useState<Vista>('lista');
  const [editando, setEditando]   = useState<Producto | null>(null);
  const [nombre, setNombre]       = useState('');
  const [sku, setSku]             = useState('');
  const [precio, setPrecio]       = useState('');
  const [stock, setStock]         = useState('');
  const [categoria, setCategoria] = useState('General');

  useFocusEffect(useCallback(() => { cargar(); }, []));


  useFocusEffect(useCallback(() => { cargar(); }, []));

  const cargar = async () => {
    setCargando(true);
    setProductos(await ProductosDB.getAll());
    setCargando(false);
  };

  const abrirEditar = (p: Producto) => {
    setEditando(p);
    setNombre(p.nombre); setSku(p.sku);
    setPrecio(String(p.precio)); setStock(String(p.stock));
    setCategoria(p.categoria || 'General');
    setVista('editar');
  };

  // ── Handlers numéricos ──────────────────────────────────────────────────────

  const handlePrecio = (text: string) => {
    const limpio = text.replace(/[^0-9.]/g, '');
    if (text.length > 0 && text.includes('-')) {
      alerta('Valor inválido', 'El precio no puede ser negativo.');
    }
    const partes = limpio.split('.');
    if (partes.length > 2) return;
    setPrecio(limpio);
  };

  const handleStock = (text: string) => {
    const limpio = text.replace(/[^0-9]/g, '');
    if (text.length > 0 && text.includes('-')) {
      alerta('Valor inválido', 'El stock no puede ser negativo.');
    }
    setStock(limpio);
  };

  // ───────────────────────────────────────────────────────────────────────────

  const guardar = async () => {
    const faltantes: string[] = [];
    if (!nombre.trim()) faltantes.push('Nombre');
    if (!sku.trim())    faltantes.push('SKU');
    if (!precio.trim()) faltantes.push('Precio');
    if (!stock.trim())  faltantes.push('Stock');

    if (faltantes.length > 0) {
      alerta('Campos requeridos', `Completa los siguientes campos:\n\n• ${faltantes.join('\n• ')}`);
      return;
    }

    const precioNum = parseFloat(precio);
    const stockNum  = parseInt(stock, 10);
    const categoriaFinal = categoria.trim() || 'General';

    if (isNaN(precioNum) || precioNum < 0) {
      alerta('Precio inválido', 'Ingresa un precio numérico mayor o igual a 0.'); return;
    }
    if (isNaN(stockNum) || stockNum < 0) {
      alerta('Stock inválido', 'Ingresa un stock numérico igual o mayor a 0.'); return;
    }

    setGuardando(true);
    if (vista === 'agregar') {
      await ProductosDB.agregar({ nombre, sku, precio: precioNum, stock: stockNum, categoria: categoriaFinal });
    } else if (editando) {
      await ProductosDB.editar(editando.id, { nombre, sku, precio: precioNum, stock: stockNum, categoria: categoriaFinal });
    }
    await cargar();
    resetForm();
    setGuardando(false);
  };

  const eliminar = (p: Producto) => {
    confirmar('Eliminar', `¿Eliminar "${p.nombre}"?`, async () => {
      await ProductosDB.eliminar(p.id);
      await cargar();
    });
  };

  const resetForm = () => {
    setNombre(''); setSku(''); setPrecio(''); setStock(''); setCategoria('General');
    setEditando(null); setVista('lista');
  };

  const CAMPOS = [
    { label: 'Nombre', value: nombre,  set: setNombre,   ph: 'Yakult Original 65ml' },
    { label: 'SKU',    value: sku,     set: setSku,      ph: 'YK-001'               },
    { label: 'Categoría', value: categoria, set: setCategoria, ph: 'Bebida probiótica' },
    { label: 'Precio', value: precio,  set: handlePrecio, ph: '12.50', kb: 'decimal-pad' as const },
    { label: 'Stock',  value: stock,   set: handleStock,  ph: '100',   kb: 'number-pad'  as const },
  ];

  if (vista !== 'lista') return (
    <Screen>
      <XStack
        backgroundColor="$card"
        paddingTop={52}
        paddingBottom={12}
        paddingHorizontal={16}
        alignItems="center"
        justifyContent="space-between"
        borderBottomWidth={1}
        borderBottomColor="$line"
      >
        <XStack
          alignItems="center"
          gap={6}
          cursor="pointer"
          pressStyle={{ opacity: 0.6 }}
          onPress={resetForm}
        >
          <Ionicons name="arrow-back" size={16} color={colors.primary} />
          <AppText fontSize={14} tone="primary" fontWeight="600">Volver</AppText>
        </XStack>
        <AppText fontSize={18} fontWeight="700">{vista === 'agregar' ? 'Nuevo producto' : 'Editar producto'}</AppText>
      </XStack>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Card gap={14} padding={20}>
          {CAMPOS.map(c => (
            <Field
              key={c.label}
              label={c.label}
              value={c.value}
              onChangeText={c.set}
              placeholder={c.ph}
              keyboardType={c.kb ?? 'default'}
            />
          ))}
          <AppButton marginTop={8} icon="save-outline" loading={guardando} disabled={guardando} onPress={guardar}>
            Guardar en MySQL
          </AppButton>
        </Card>
      </ScrollView>
    </Screen>
  );

  return (
    <Screen>
      <AppHeader
        titulo="Productos"
        derecha={
          <AppButton size="sm" icon="add" onPress={() => setVista('agregar')}>
            Agregar
          </AppButton>
        }
      />

      {cargando ? <Loading />
      : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
          {productos.length === 0
            ? <EmptyState icon="cube-outline" mensaje="Sin productos. Agrega uno." />
            : productos.map(p => (
              <Card key={p.id} flexDirection="row" alignItems="center" padding={14}>
                <YStack flex={1} gap={2}>
                  <AppText fontSize={14} fontWeight="600">{p.nombre}</AppText>
                  <AppText fontSize={12} tone="muted">SKU: {p.sku} · ${p.precio}</AppText>
                  <AppText fontSize={11} color="$infoInk" fontWeight="600">{p.categoria || 'General'}</AppText>
                  <XStack alignItems="center" gap={4}>
                    <AppText
                      fontSize={12}
                      fontWeight="600"
                      color={p.stock < 50 ? '$danger' : '$success'}
                    >
                      Stock: {p.stock}
                    </AppText>
                    {p.stock < 50 && <Ionicons name="warning" size={13} color={colors.warning} />}
                  </XStack>
                </YStack>
                <XStack gap={8}>
                  <YStack
                    padding={9}
                    backgroundColor="$infoSoft"
                    borderRadius={10}
                    cursor="pointer"
                    pressStyle={{ opacity: 0.7 }}
                    onPress={() => abrirEditar(p)}
                  >
                    <Ionicons name="pencil" size={16} color={colors.infoInk} />
                  </YStack>
                  <YStack
                    padding={9}
                    backgroundColor="$dangerSoft"
                    borderRadius={10}
                    cursor="pointer"
                    pressStyle={{ opacity: 0.7 }}
                    onPress={() => eliminar(p)}
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.dangerInk} />
                  </YStack>
                </XStack>
              </Card>
            ))
          }
        </ScrollView>
      )}
    </Screen>
  );
}
