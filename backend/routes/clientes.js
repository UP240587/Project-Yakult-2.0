const router = require('express').Router();
const db     = require('../db');

router.get('/', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM clientes ORDER BY nombre');
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { nombre, telefono, direccion } = req.body;
  const [r] = await db.query(
    'INSERT INTO clientes (nombre, telefono, direccion) VALUES (?,?,?)',
    [nombre, telefono, direccion]
  );
  res.json({ id: r.insertId, nombre, telefono, direccion, activo: true });
});

// ── Editar cliente ──
router.put('/:id', async (req, res) => {
  const { nombre, telefono, direccion } = req.body;
  await db.query(
    'UPDATE clientes SET nombre=?, telefono=?, direccion=? WHERE id=?',
    [nombre, telefono, direccion, req.params.id]
  );
  res.json({ ok: true });
});

// ── Activar / Desactivar ──
router.put('/:id/activo', async (req, res) => {
  await db.query('UPDATE clientes SET activo=? WHERE id=?', [req.body.activo, req.params.id]);
  res.json({ ok: true });
});

router.delete('/:id', async (req, res) => {
  await db.query('DELETE FROM clientes WHERE id=?', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;