const router = require('express').Router();
const db = require('../db');
const { ensureSchema } = require('../schema');
const { verificarToken } = require('../authToken');

// En este sistema una orden "completada" es la que ya fue Entregada.
const COMPLETADO = 'Entregado';

// Asegura el esquema antes de cualquier consulta.
router.use(async (req, res, next) => {
  try {
    await ensureSchema();
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// RF-81: solo usuarios Master pueden acceder al dashboard.
router.use(async (req, res, next) => {
  try {
    const sesion = verificarToken(req);
    const [rows] = await db.query(
      'SELECT id, nombre, correo, rol, activo FROM usuarios WHERE id = ? AND activo = 1',
      [sesion.id]
    );
    if (rows.length === 0) return res.status(403).json({ error: 'Usuario sin autorización.' });
    if (rows[0].rol !== 'Master') {
      return res.status(403).json({ error: 'Solo los usuarios Master pueden acceder al dashboard.' });
    }
    req.usuario = rows[0];
    next();
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v);
const badRequest = (m) => { const e = new Error(m); e.statusCode = 400; return e; };

// RF-76: rango de fechas opcional; si viene, ambos campos obligatorios y fin >= inicio.
function parseRango(q) {
  const ini = q.fechaInicio ? String(q.fechaInicio).trim() : null;
  const fin = q.fechaFin ? String(q.fechaFin).trim() : null;
  if (!ini && !fin) return null; // sin filtro → estadísticas globales
  if (!ini || !fin) throw badRequest('Debes indicar fecha inicial y final.');
  if (!isDate(ini) || !isDate(fin)) throw badRequest('Usa fechas con formato YYYY-MM-DD.');
  if (ini > fin) throw badRequest('La fecha final no puede ser menor a la inicial.');
  return { ini, fin };
}

// RF-71/82: arma todo el resumen del dashboard en una sola petición.
router.get('/', async (req, res) => {
  try {
    const rango = parseRango(req.query);
    const ordWhere = rango ? '(o.fecha >= ? AND o.fecha < DATE_ADD(?, INTERVAL 1 DAY))' : '1 = 1';
    const ordParams = rango ? [rango.ini, rango.fin] : [];

    // RF-72: ventas totales (solo órdenes completadas/Entregadas).
    const [[ventas]] = await db.query(
      `SELECT COALESCE(SUM(o.total), 0) AS ventasTotales
       FROM ordenes o
       WHERE o.estado = ? AND ${ordWhere}`,
      [COMPLETADO, ...ordParams]
    );

    // RF-73: total de órdenes registradas (todos los estados).
    const [[ordenes]] = await db.query(
      `SELECT COUNT(*) AS ordenesTotales FROM ordenes o WHERE ${ordWhere}`,
      ordParams
    );

    // RF-74: clientes activos (en el rango, por fecha de alta, si hay filtro).
    const cliWhere = rango
      ? 'activo = 1 AND (creado_en >= ? AND creado_en < DATE_ADD(?, INTERVAL 1 DAY))'
      : 'activo = 1';
    const [[clientes]] = await db.query(
      `SELECT COUNT(*) AS clientesActivos FROM clientes WHERE ${cliWhere}`,
      rango ? [rango.ini, rango.fin] : []
    );

    // RF-75: unidades totales vendidas en órdenes completadas.
    const [[productos]] = await db.query(
      `SELECT COALESCE(SUM(oi.cantidad), 0) AS productosVendidos
       FROM ordenes o
       JOIN orden_items oi ON oi.orden_id = o.id
       WHERE o.estado = ? AND ${ordWhere}`,
      [COMPLETADO, ...ordParams]
    );

    // RF-77: gráfico de ventas cronológico (por día, órdenes completadas).
    const [ventasChart] = await db.query(
      `SELECT DATE_FORMAT(o.fecha, '%Y-%m-%d') AS fecha,
              DATE_FORMAT(o.fecha, '%d/%m')    AS etiqueta,
              COALESCE(SUM(o.total), 0)        AS total
       FROM ordenes o
       WHERE o.estado = ? AND ${ordWhere}
       GROUP BY DATE_FORMAT(o.fecha, '%Y-%m-%d'), DATE_FORMAT(o.fecha, '%d/%m')
       ORDER BY fecha ASC`,
      [COMPLETADO, ...ordParams]
    );

    // RF-78: productos más vendidos (descendente por cantidad, órdenes completadas).
    const [bestSellers] = await db.query(
      `SELECT p.id, p.nombre,
              COALESCE(NULLIF(p.categoria, ''), 'General') AS categoria,
              SUM(oi.cantidad)                 AS cantidad,
              SUM(oi.cantidad * oi.precio_unit) AS total
       FROM ordenes o
       JOIN orden_items oi ON oi.orden_id = o.id
       JOIN productos p     ON p.id = oi.producto_id
       WHERE o.estado = ? AND ${ordWhere}
       GROUP BY p.id, p.nombre, p.categoria
       ORDER BY cantidad DESC, total DESC
       LIMIT 8`,
      [COMPLETADO, ...ordParams]
    );

    // RF-79: órdenes agrupadas por estado (todos los estados presentes).
    const [estados] = await db.query(
      `SELECT o.estado AS estado, COUNT(*) AS cantidad
       FROM ordenes o
       WHERE ${ordWhere}
       GROUP BY o.estado`,
      ordParams
    );

    res.json({
      filtros: rango ? { fechaInicio: rango.ini, fechaFin: rango.fin } : null,
      resumen: {
        ventasTotales: Number(ventas.ventasTotales),
        ordenesTotales: Number(ordenes.ordenesTotales),
        clientesActivos: Number(clientes.clientesActivos),
        productosVendidos: Number(productos.productosVendidos),
      },
      ventasChart: ventasChart.map((r) => ({ ...r, total: Number(r.total) })),
      bestSellers: bestSellers.map((r) => ({
        ...r, cantidad: Number(r.cantidad), total: Number(r.total),
      })),
      ordenesPorEstado: estados.map((r) => ({ estado: r.estado, cantidad: Number(r.cantidad) })),
      generadoEn: new Date().toISOString(),
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

module.exports = router;
