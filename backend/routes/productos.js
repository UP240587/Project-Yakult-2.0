const router  = require('express').Router();
const db      = require('../db');

// GET todos los productos
router.get('/', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM productos ORDER BY nombre');
  res.json(rows);
});

// POST agregar producto
router.post('/', async (req, res) => {
  const { nombre, sku, precio, stock } = req.body;
  const [r] = await db.query(
    'INSERT INTO productos (nombre, sku, precio, stock) VALUES (?,?,?,?)',
    [nombre, sku, precio, stock]
  );
  res.json({ id: r.insertId, nombre, sku, precio, stock });
});

// PUT editar producto
router.put('/:id', async (req, res) => {
  const { nombre, sku, precio, stock } = req.body;
  await db.query(
    'UPDATE productos SET nombre=?, sku=?, precio=?, stock=? WHERE id=?',
    [nombre, sku, precio, stock, req.params.id]
  );
  res.json({ ok: true });
});

// DELETE eliminar producto
router.delete('/:id', async (req, res) => {
  await db.query('DELETE FROM productos WHERE id=?', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;