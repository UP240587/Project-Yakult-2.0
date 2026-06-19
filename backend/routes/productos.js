const router  = require('express').Router();
const db      = require('../db');

// GET todos los productos
router.get('/', async (req, res) => {
  const [rows] = await db.query(
    `SELECT id, nombre, sku, precio, stock,
            COALESCE(NULLIF(categoria,''), 'General') AS categoria,
            creado_en
     FROM productos
     ORDER BY nombre`
  );
  res.json(rows);
});

// POST agregar producto
router.post('/', async (req, res) => {
  const { nombre, sku, precio, stock, categoria = 'General' } = req.body;
  const [r] = await db.query(
    'INSERT INTO productos (nombre, sku, precio, stock, categoria) VALUES (?,?,?,?,?)',
    [nombre, sku, precio, stock, categoria || 'General']
  );
  res.json({ id: r.insertId, nombre, sku, precio, stock, categoria: categoria || 'General' });
});

// PUT editar producto
router.put('/:id', async (req, res) => {
  const { nombre, sku, precio, stock, categoria = 'General' } = req.body;
  await db.query(
    'UPDATE productos SET nombre=?, sku=?, precio=?, stock=?, categoria=? WHERE id=?',
    [nombre, sku, precio, stock, categoria || 'General', req.params.id]
  );
  res.json({ ok: true });
});

// DELETE eliminar producto
router.delete('/:id', async (req, res) => {
  await db.query('DELETE FROM productos WHERE id=?', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
