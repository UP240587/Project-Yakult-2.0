import { useState, useCallback } from 'react';
import { ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { XStack, YStack } from 'tamagui';
import { useFocusEffect } from 'expo-router';
import { ClientesDB } from '../../services/db';
import { confirmar } from '../../utils/confirmar';
import AppHeader from '../../components/AppHeader';
import { colors } from '../../tamagui.config';
import {
  AppButton, AppText, Avatar, Badge, Card, Chip, EmptyState, Field, Loading, Screen,
} from '../../components/ui';


type Cliente = { id: number; nombre: string; telefono: string; direccion: string; activo: boolean };
type Filtro  = 'todos' | 'activos' | 'inactivos';
type Vista   = 'lista' | 'agregar' | 'editar';

const soloLetras  = (v: string) => /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(v.trim());
const telefonoVal = (v: string) => /^\d{10}$/.test(v.trim());
const mixto       = (v: string) => v.trim().length >= 5;

const validar = (nombre: string, telefono: string, direccion: string) => {
  if (!nombre || !telefono || !direccion) return 'Completa todos los campos.';
  if (!soloLetras(nombre))  return 'El nombre solo debe contener letras.';
  if (!telefonoVal(telefono)) return 'El teléfono debe tener exactamente 10 dígitos.';
  if (!mixto(direccion))    return 'La dirección debe tener al menos 5 caracteres.';
  return null;
};

export default function ClientesScreen() {
  const [clientes, setClientes]   = useState<Cliente[]>([]);
  const [cargando, setCargando]   = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [vista, setVista]         = useState<Vista>('lista');
  const [editando, setEditando]   = useState<Cliente | null>(null);
  const [busqueda, setBusqueda]   = useState('');
  const [filtro, setFiltro]       = useState<Filtro>('todos');
  const [nombre, setNombre]       = useState('');
  const [telefono, setTelefono]   = useState('');
  const [direccion, setDireccion] = useState('');
  const [errores, setErrores]     = useState<Record<string, string>>({});

  useFocusEffect(useCallback(() => { cargar(); }, []));

  const cargar = async () => {
    setCargando(true);
    setClientes(await ClientesDB.getAll());
    setCargando(false);
  };

  const filtrados = clientes.filter(c => {
    const coincideBusqueda =
      c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.telefono.includes(busqueda);
    const coincideFiltro =
      filtro === 'todos'    ? true :
      filtro === 'activos'  ? c.activo :
      !c.activo;
    return coincideBusqueda && coincideFiltro;
  });

  const validarCampo = (campo: string, valor: string) => {
    let error = '';
    if (!valor.trim())                           error = 'Obligatorio.';
    else if (campo === 'nombre'   && !soloLetras(valor))  error = 'Solo letras.';
    else if (campo === 'telefono' && !telefonoVal(valor)) error = '10 dígitos numéricos.';
    else if (campo === 'direccion'&& !mixto(valor))       error = 'Mínimo 5 caracteres.';
    setErrores(prev => ({ ...prev, [campo]: error }));
  };

  const abrirEditar = (c: Cliente) => {
    setEditando(c);
    setNombre(c.nombre); setTelefono(c.telefono); setDireccion(c.direccion);
    setErrores({});
    setVista('editar');
  };

  const guardar = async () => {
    const error = validar(nombre, telefono, direccion);
    if (error) { Alert.alert('Error', error); return; }
    setGuardando(true);
    if (vista === 'agregar') {
      await ClientesDB.agregar({ nombre: nombre.trim(), telefono: telefono.trim(), direccion: direccion.trim() });
    } else if (editando) {
      await ClientesDB.editar(editando.id, { nombre: nombre.trim(), telefono: telefono.trim(), direccion: direccion.trim() });
    }
    await cargar();
    resetForm();
    setGuardando(false);
  };

  const toggleActivo = async (c: Cliente) => {
    await ClientesDB.toggleActivo(c.id, !c.activo);
    await cargar();
  };

  const eliminar = (c: Cliente) => {
    confirmar('Eliminar', `¿Eliminar a "${c.nombre}"?`, async () => {
      await ClientesDB.eliminar(c.id);
      await cargar();
    });
  };

  const resetForm = () => {
    setNombre(''); setTelefono(''); setDireccion('');
    setEditando(null); setErrores({}); setVista('lista');
  };

  const CAMPOS = [
    { label: 'Nombre del negocio', key: 'nombre',   value: nombre,   set: setNombre,   ph: 'Tienda López',    kb: 'default'    as const, hint: 'Solo letras'        },
    { label: 'Teléfono',           key: 'telefono', value: telefono, set: setTelefono, ph: '4491234567',      kb: 'phone-pad'  as const, hint: '10 dígitos'         },
    { label: 'Dirección',          key: 'direccion',value: direccion,set: setDireccion,ph: 'Calle Morelos 45',kb: 'default'    as const, hint: 'Letras y números'   },
  ];

  // ── FORMULARIO (agregar / editar) ──────────────────────
  if (vista !== 'lista') return (
    <Screen>

      {/* Header personalizado */}
      <AppHeader
        titulo="Clientes"
        derecha={
          <AppButton size="sm" icon="add" onPress={() => setVista('agregar')}>
            Agregar
          </AppButton>
        }
      />

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Card gap={14} padding={20}>
          {CAMPOS.map(c => (
            <Field
              key={c.key}
              label={c.label}
              hint={c.hint}
              value={c.value}
              onChangeText={c.set}
              onBlur={() => validarCampo(c.key, c.value)}
              placeholder={c.ph}
              keyboardType={c.kb}
              maxLength={c.key === 'telefono' ? 10 : undefined}
              error={errores[c.key] || undefined}
            />
          ))}
          <AppButton marginTop={8} icon="save-outline" loading={guardando} disabled={guardando} onPress={guardar}>
            Guardar en MySQL
          </AppButton>
        </Card>
      </ScrollView>
    </Screen>
  );

  // ── LISTA ───────────────────────────────────────────────
  return (
    <Screen>

      <AppHeader
        titulo="Clientes"
        derecha={
          <AppButton size="sm" icon="add" onPress={() => setVista('agregar')}>
            Agregar
          </AppButton>
        }
      />

      {/* Barra de búsqueda y filtros */}
      <YStack backgroundColor="$card" padding={14} gap={10} borderBottomWidth={1} borderBottomColor="$line">
        <Field
          placeholder="Buscar..."
          value={busqueda}
          onChangeText={setBusqueda}
          izquierda={<Ionicons name="search" size={16} color={colors.muted} style={{ marginLeft: 12 }} />}
        />
        <XStack gap={8}>
          {(['todos','activos','inactivos'] as Filtro[]).map(f => (
            <Chip key={f} compact active={filtro === f} onPress={() => setFiltro(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Chip>
          ))}
        </XStack>
        <AppText fontSize={12} tone="muted">{filtrados.length} cliente{filtrados.length !== 1 ? 's' : ''}</AppText>
      </YStack>

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
            <AppText flex={2}   fontSize={11} fontWeight="700" tone="muted" textTransform="uppercase" letterSpacing={0.5}>Cliente</AppText>
            <AppText flex={1.5} fontSize={11} fontWeight="700" tone="muted" textTransform="uppercase" letterSpacing={0.5}>Teléfono</AppText>
            <AppText flex={0.8} fontSize={11} fontWeight="700" tone="muted" textTransform="uppercase" letterSpacing={0.5}>Código</AppText>
            <AppText flex={0.9} fontSize={11} fontWeight="700" tone="muted" textTransform="uppercase" letterSpacing={0.5}>Estado</AppText>
            <AppText flex={1.8} fontSize={11} fontWeight="700" tone="muted" textTransform="uppercase" letterSpacing={0.5} textAlign="right">Acciones</AppText>
          </XStack>

          {/* Filas */}
          {filtrados.length === 0
            ? <EmptyState icon="people-outline" mensaje={busqueda ? 'Sin resultados' : 'Sin clientes. Agrega uno.'} />
            : filtrados.map((c, i) => (
              <XStack
                key={c.id}
                alignItems="center"
                paddingHorizontal={16}
                paddingVertical={12}
                backgroundColor={i % 2 === 0 ? '$field' : '$card'}
                borderBottomWidth={1}
                borderBottomColor="$line"
              >

                {/* Avatar + nombre */}
                <XStack flex={2} alignItems="center" gap={8}>
                  <Avatar inicial={c.nombre[0].toUpperCase()} />
                  <AppText flex={1} fontSize={13} fontWeight="600" numberOfLines={1}>{c.nombre}</AppText>
                </XStack>

                {/* Teléfono */}
                <AppText flex={1.5} fontSize={13}>{c.telefono}</AppText>

                {/* Código */}
                <AppText flex={0.8} fontSize={13} tone="muted">#{String(c.id).padStart(3,'0')}</AppText>

                {/* Estado */}
                <YStack flex={0.9} alignItems="flex-start">
                  <Badge tone={c.activo ? 'success' : 'danger'}>
                    {c.activo ? 'Activo' : 'Inactivo'}
                  </Badge>
                </YStack>

                {/* Acciones */}
                <XStack flex={1.8} gap={6} justifyContent="flex-end" alignItems="center">
                  <AppButton size="sm" variant="secondary" onPress={() => abrirEditar(c)}>
                    Editar
                  </AppButton>
                  <AppButton
                    size="sm"
                    variant={c.activo ? 'primary' : 'solidSuccess'}
                    onPress={() => toggleActivo(c)}
                  >
                    {c.activo ? 'Desactivar' : 'Activar'}
                  </AppButton>
                  <YStack
                    padding={7}
                    backgroundColor="$dangerSoft"
                    borderRadius={8}
                    cursor="pointer"
                    pressStyle={{ opacity: 0.7 }}
                    onPress={() => eliminar(c)}
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
