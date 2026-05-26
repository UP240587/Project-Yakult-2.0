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
  res.json({ id: r.insertId, nombre, telefono, direccion });
});

router.delete('/:id', async (req, res) => {
  await db.query('DELETE FROM clientes WHERE id=?', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;