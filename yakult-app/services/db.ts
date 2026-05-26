// ── Cambia esto por tu IP local si pruebas en celular ──
// Para saber tu IP: ejecuta "ipconfig" en Windows y busca IPv4
// Ejemplo: 'http://192.168.1.100:3000'
const BASE = 'http://localhost:3000/api';

const get  = (url: string)             => fetch(`${BASE}${url}`).then(r => r.json());
const post = (url: string, body: any)  => fetch(`${BASE}${url}`, { method: 'POST',   headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json());
const put  = (url: string, body: any)  => fetch(`${BASE}${url}`, { method: 'PUT',    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json());
const del  = (url: string)             => fetch(`${BASE}${url}`, { method: 'DELETE' }).then(r => r.json());

export const ProductosDB = {
  getAll:   ()                  => get('/productos'),
  agregar:  (p: any)            => post('/productos', p),
  editar:   (id: number, p: any)=> put(`/productos/${id}`, p),
  eliminar: (id: number)        => del(`/productos/${id}`),
};

export const ClientesDB = {
  getAll:   ()           => get('/clientes'),
  agregar:  (c: any)     => post('/clientes', c),
  eliminar: (id: number) => del(`/clientes/${id}`),
};

export const OrdenesDB = {
  getAll:        ()                          => get('/ordenes'),
  agregar:       (o: any)                    => post('/ordenes', o),
  cambiarEstado: (id: number, estado: string)=> put(`/ordenes/${id}/estado`, { estado }),
};