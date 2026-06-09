// ── Cambia esto por tu IP local si pruebas en celular ──
// Para saber tu IP: ejecuta "ipconfig" en Windows y busca IPv4
// Ejemplo: 'http://192.168.1.100:3000'
//http://localhost:3000/api
//https://bchmn5mf-3000.usw3.devtunnels.ms/api
const BASE = 'http://localhost:3000/api';

const headers = {
  'Content-Type': 'application/json',
  'x-github-token': 'anonymous',
};

const get = (url: string) => fetch(`${BASE}${url}`, { headers }).then(r => r.json());
const post = (url: string, body: any) => fetch(`${BASE}${url}`, { method: 'POST', headers, body: JSON.stringify(body) }).then(r => r.json());
const put = (url: string, body: any) => fetch(`${BASE}${url}`, { method: 'PUT', headers, body: JSON.stringify(body) }).then(r => r.json());
const del = (url: string) => fetch(`${BASE}${url}`, { method: 'DELETE', headers }).then(r => r.json());

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
  eliminar:      (id: number)                  => del(`/ordenes/${id}`),
};

export const AuthDB = {
  login:          (data: any)              => post('/auth/login',    data),
  registro:       (data: any)              => post('/auth/registro',  data),
  getUsuarios:    ()                       => get('/auth/usuarios'),
  editarUsuario:  (id: number, data: any)  => put(`/auth/usuarios/${id}`,      data),
  toggleMaster:   (id: number, rol: string)=> put(`/auth/usuarios/${id}/rol`,  { rol }),
  eliminarUsuario:(id: number)             => del(`/auth/usuarios/${id}`),
};
