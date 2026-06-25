const router = require('express').Router();
const db     = require('../db');

// Lee el id del usuario que hace la petición (lo manda la app en x-user-id).
function actorId(req) {
  return Number(req.headers['x-user-id']) || null;
}

// Inserta una notificación dirigida a un usuario (repartidor, etc.).
async function notificar({ usuarioId, ordenId = null, tipo = 'info', titulo, mensaje }) {
  if (!usuarioId) return;
  await db.query(
    'INSERT INTO notificaciones (usuario_id, orden_id, tipo, titulo, mensaje) VALUES (?,?,?,?,?)',
    [usuarioId, ordenId, tipo, titulo, mensaje]
  );
}

// GET historial con detalle
router.get('/', async (req, res) => {
  const [ordenes] = await db.query(`
    SELECT o.id, c.nombre AS clienteNombre, c.telefono AS clienteTelefono,
           u.nombre AS vendedorNombre,
           o.repartidor_id AS repartidorId, r.nombre AS repartidorNombre,
           o.total, o.estado,
           DATE_FORMAT(o.fecha,'%d %b') AS fecha
    FROM ordenes o
    JOIN clientes c ON c.id = o.cliente_id
    LEFT JOIN usuarios u ON u.id = o.vendedor_id
    LEFT JOIN usuarios r ON r.id = o.repartidor_id
    ORDER BY o.fecha DESC
  `);

  // Agrega los items de cada orden
  for (const orden of ordenes) {
    const [items] = await db.query(`
      SELECT p.nombre, oi.cantidad, oi.precio_unit AS precio
      FROM orden_items oi
      JOIN productos p ON p.id = oi.producto_id
      WHERE oi.orden_id = ?
    `, [orden.id]);
    orden.items = items;
  }

  res.json(ordenes);
});

// POST crear orden
router.post('/', async (req, res) => {
  const { clienteId, vendedorId = null, repartidorId = null, items, total } = req.body;
  // items = [{ productoId, cantidad, precio }]

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [r] = await conn.query(
      'INSERT INTO ordenes (cliente_id, vendedor_id, repartidor_id, total) VALUES (?,?,?,?)',
      [clienteId, vendedorId, repartidorId, total]
    );
    const ordenId = r.insertId;

    for (const item of items) {
      await conn.query(
        'INSERT INTO orden_items (orden_id, producto_id, cantidad, precio_unit) VALUES (?,?,?,?)',
        [ordenId, item.productoId, item.cantidad, item.precio]
      );
      // Descuenta el stock automáticamente
      await conn.query(
        'UPDATE productos SET stock = stock - ? WHERE id = ?',
        [item.cantidad, item.productoId]
      );
    }

    await conn.commit();

    // Si la orden nace con repartidor asignado, avísale.
    if (repartidorId) {
      const [[cli]] = await db.query('SELECT nombre FROM clientes WHERE id = ?', [clienteId]);
      await notificar({
        usuarioId: repartidorId,
        ordenId,
        tipo: 'asignacion',
        titulo: 'Nueva orden asignada',
        mensaje: `Se te asignó la orden #${ordenId} de ${cli?.nombre ?? 'un cliente'}.`,
      });
    }

    res.json({ id: ordenId });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// PUT cambiar estado
router.put('/:id/estado', async (req, res) => {
  const { estado } = req.body;
  const id = req.params.id;
  await db.query('UPDATE ordenes SET estado=? WHERE id=?', [estado, id]);

  // Notifica al repartidor asignado sobre el avance (salvo que él mismo lo haya cambiado).
  const [[ord]] = await db.query(
    `SELECT o.repartidor_id AS repartidorId, c.nombre AS cliente
     FROM ordenes o JOIN clientes c ON c.id = o.cliente_id
     WHERE o.id = ?`,
    [id]
  );
  if (ord?.repartidorId && ord.repartidorId !== actorId(req)) {
    await notificar({
      usuarioId: ord.repartidorId,
      ordenId: Number(id),
      tipo: 'estado',
      titulo: `Orden #${id} actualizada`,
      mensaje: `La orden de ${ord.cliente} cambió a "${estado}".`,
    });
  }

  res.json({ ok: true });
});

// PUT asignar / reasignar repartidor
router.put('/:id/repartidor', async (req, res) => {
  const { repartidorId = null } = req.body;
  const id = req.params.id;
  await db.query('UPDATE ordenes SET repartidor_id=? WHERE id=?', [repartidorId, id]);

  if (repartidorId) {
    const [[ord]] = await db.query(
      `SELECT c.nombre AS cliente
       FROM ordenes o JOIN clientes c ON c.id = o.cliente_id
       WHERE o.id = ?`,
      [id]
    );
    await notificar({
      usuarioId: repartidorId,
      ordenId: Number(id),
      tipo: 'asignacion',
      titulo: 'Nueva orden asignada',
      mensaje: `Se te asignó la orden #${id} de ${ord?.cliente ?? 'un cliente'}.`,
    });
  }

  res.json({ ok: true });
});

// DELETE cancelar orden (con rollback de stock)
router.delete('/:id', async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    // Primero borra los items (foreign key)
    await conn.query('DELETE FROM orden_items WHERE orden_id = ?', [req.params.id]);
    await conn.query('DELETE FROM ordenes WHERE id = ?', [req.params.id]);
    await conn.commit();
    res.json({ ok: true });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

module.exports = router;
