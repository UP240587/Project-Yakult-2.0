// ── Cambia esto por tu IP local si pruebas en celular ──
// Para saber tu IP: ejecuta "ipconfig" en Windows y busca IPv4
// Ejemplo: 'http://192.168.1.100:3000'
//http://localhost:3000/api
//https://bchmn5mf-3000.usw3.devtunnels.ms/api
const BASE = 'http://localhost:3000/api';

type UsuarioApi = { id: number; nombre?: string; correo?: string; rol?: string } | null;

let usuarioActual: UsuarioApi = null;
let tokenActual: string | null = null;

export const setAuthUsuario = (usuario: UsuarioApi, token?: string | null) => {
  usuarioActual = usuario;
  tokenActual = token ?? null;
};

// Se invoca cuando el servidor responde 401 (token ausente, inválido o expirado).
// AuthContext registra aquí su logout para sacar al usuario al login automáticamente.
let onAuthError: (() => void) | null = null;
export const setAuthErrorHandler = (fn: (() => void) | null) => {
  onAuthError = fn;
};

const headers = (): Record<string, string> => ({
  'Content-Type': 'application/json',
  'x-github-token': 'anonymous',
  ...(usuarioActual?.id ? { 'x-user-id': String(usuarioActual.id) } : {}),
  ...(tokenActual ? { Authorization: `Bearer ${tokenActual}` } : {}),
});

const leerRespuesta = async (r: Response) => {
  const data = await r.json().catch(() => ({}));
  if (r.status === 401) {
    onAuthError?.();
    return data?.error ? data : { error: 'Tu sesión expiró. Inicia sesión de nuevo.' };
  }
  if (!r.ok) return data?.error ? data : { error: 'Error de comunicación con el servidor.' };
  return data;
};

const withAuthQuery = (url: string) => {
  if (!tokenActual) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}token=${encodeURIComponent(tokenActual)}`;
};

const get = (url: string) => fetch(`${BASE}${url}`, { headers: headers() }).then(leerRespuesta);
const post = (url: string, body: any) => fetch(`${BASE}${url}`, { method: 'POST', headers: headers(), body: JSON.stringify(body) }).then(leerRespuesta);
const put = (url: string, body: any) => fetch(`${BASE}${url}`, { method: 'PUT', headers: headers(), body: JSON.stringify(body) }).then(leerRespuesta);
const del = (url: string) => fetch(`${BASE}${url}`, { method: 'DELETE', headers: headers() }).then(leerRespuesta);

export const ProductosDB = {
  getAll: () => get('/productos'),
  agregar: (p: any) => post('/productos', p),
  editar: (id: number, p: any) => put(`/productos/${id}`, p),
  eliminar: (id: number) => del(`/productos/${id}`),
};

export const ClientesDB = {
  getAll: () => get('/clientes'),
  agregar: (c: any) => post('/clientes', c),
  editar: (id: number, c: any) => put(`/clientes/${id}`, c),
  toggleActivo: (id: number, activo: boolean) => put(`/clientes/${id}/activo`, { activo }),
  eliminar: (id: number) => del(`/clientes/${id}`),
};

export const OrdenesDB = {
  getAll: () => get('/ordenes'),
  agregar: (o: any) => post('/ordenes', o),
  cambiarEstado: (id: number, estado: string) => put(`/ordenes/${id}/estado`, { estado }),
  asignarRepartidor: (id: number, repartidorId: number | null) => put(`/ordenes/${id}/repartidor`, { repartidorId }),
  eliminar:      (id: number)                  => del(`/ordenes/${id}`),
};

export const NotificacionesDB = {
  getAll:        ()           => get('/notificaciones'),
  marcarLeida:   (id: number) => put(`/notificaciones/${id}/leida`, {}),
  marcarTodas:   ()           => put('/notificaciones/leer-todas', {}),
};

export const DashboardDB = {
  get: (filtros?: { fechaInicio?: string; fechaFin?: string }) => {
    const qs = filtros?.fechaInicio && filtros?.fechaFin
      ? `?fechaInicio=${encodeURIComponent(filtros.fechaInicio)}&fechaFin=${encodeURIComponent(filtros.fechaFin)}`
      : '';
    return get(`/dashboard${qs}`);
  },
};

export const ReportesDB = {
  opciones:  () => get('/reportes/opciones'),
  generar:   (filtros: any) => post('/reportes/ventas', filtros),
  historial: () => get('/reportes/historial'),
  obtener:   (id: number) => get(`/reportes/${id}`),
  exportUrl: (id: number) =>
    `${BASE}${withAuthQuery(`/reportes/${id}/export/pdf`)}`,
  imprimirUrl: (id: number) =>
    `${BASE}${withAuthQuery(`/reportes/${id}/imprimir`)}`,
};

// ── Sprint 9: Mercado Pago ──
export const PagosDB = {
  // Historial de cobranza + resumen (pantalla Ventas)
  getAll: () => get('/pagos'),
  // Crea la preferencia de Checkout Pro y devuelve { link } para cobrar
  crearPreferencia: (ordenId: number) => post('/pagos/preferencia', { ordenId }),
  // Consulta a MP el estado real del cobro de una orden (fallback sin webhooks)
  verificar: (ordenId: number) => get(`/pagos/orden/${ordenId}/verificar`),
};

export const AuthDB = {
  login:          (data: any)              => post('/auth/login',    data),
  registro:       (data: any)              => post('/auth/registro',  data),
  getUsuarios:    ()                       => get('/auth/usuarios'),
  editarUsuario:  (id: number, data: any)  => put(`/auth/usuarios/${id}`,      data),
  toggleMaster:   (id: number, rol: string)=> put(`/auth/usuarios/${id}/rol`,  { rol }),
  eliminarUsuario:(id: number)             => del(`/auth/usuarios/${id}`),
};
