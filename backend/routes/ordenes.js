const router = require('express').Router();
const db     = require('../db');

// GET historial con detalle
router.get('/', async (req, res) => {
  const [ordenes] = await db.query(`
    SELECT o.id, c.nombre AS clienteNombre, u.nombre AS vendedorNombre, o.total, o.estado,
           DATE_FORMAT(o.fecha,'%d %b') AS fecha
    FROM ordenes o
    JOIN clientes c ON c.id = o.cliente_id
    LEFT JOIN usuarios u ON u.id = o.vendedor_id
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
  const { clienteId, vendedorId = null, items, total } = req.body;
  // items = [{ productoId, cantidad, precio }]

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [r] = await conn.query(
      'INSERT INTO ordenes (cliente_id, vendedor_id, total) VALUES (?,?,?)',
      [clienteId, vendedorId, total]
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
  await db.query('UPDATE ordenes SET estado=? WHERE id=?', [req.body.estado, req.params.id]);
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
