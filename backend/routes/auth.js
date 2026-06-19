const router = require('express').Router();
const db     = require('../db');
const bcrypt = require('bcryptjs');
const { crearToken } = require('../authToken');

// ── Registro ────────────────────────────────────────────
router.post('/registro', async (req, res) => {
  const { nombre, correo, contrasena } = req.body;
  if (!nombre || !correo || !contrasena)
    return res.status(400).json({ error: 'Todos los campos son obligatorios.' });

  const [existe] = await db.query('SELECT id FROM usuarios WHERE correo = ?', [correo.toLowerCase()]);
  if (existe.length > 0)
    return res.status(400).json({ error: 'Este correo ya está registrado.' });

  // ── Regla de negocio: @upa.edu.mx = Master ──
  const rol  = correo.toLowerCase().endsWith('@upa.edu.mx') ? 'Master' : 'Promotor';
  const hash = await bcrypt.hash(contrasena, 10);

  const [r] = await db.query(
    'INSERT INTO usuarios (nombre, correo, contrasena, rol) VALUES (?,?,?,?)',
    [nombre.trim(), correo.toLowerCase().trim(), hash, rol]
  );
  const usuario = { id: r.insertId, nombre: nombre.trim(), correo: correo.toLowerCase().trim(), rol };
  res.json({ usuario, token: crearToken(usuario) });
});

// ── Login ───────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { correo, contrasena } = req.body;
  if (!correo || !contrasena)
    return res.status(400).json({ error: 'Correo y contraseña son obligatorios.' });

  const [rows] = await db.query('SELECT * FROM usuarios WHERE correo = ?', [correo.toLowerCase().trim()]);
  if (rows.length === 0)
    return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });

  const u = rows[0];
  if (!u.activo)
    return res.status(403).json({ error: 'Tu cuenta está desactivada. Contacta al administrador.' });

  const valido = await bcrypt.compare(contrasena, u.contrasena);
  if (!valido)
    return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });

  const usuario = { id: u.id, nombre: u.nombre, correo: u.correo, rol: u.rol };
  res.json({ usuario, token: crearToken(usuario) });
});

// ── Listar usuarios (solo Masters) ─────────────────────
router.get('/usuarios', async (req, res) => {
  const [rows] = await db.query(
    'SELECT id, nombre, correo, rol, activo, creado_en FROM usuarios ORDER BY creado_en DESC'
  );
  res.json(rows);
});

// ── Activar / Desactivar ────────────────────────────────
router.put('/usuarios/:id', async (req, res) => {
  await db.query('UPDATE usuarios SET activo=? WHERE id=?', [req.body.activo, req.params.id]);
  res.json({ ok: true });
});

// ── Asignar / Quitar Master ─────────────────────────────
router.put('/usuarios/:id/rol', async (req, res) => {
  const { rol } = req.body;
  if (!['Master', 'Promotor'].includes(rol))
    return res.status(400).json({ error: 'Rol inválido.' });
  await db.query('UPDATE usuarios SET rol=? WHERE id=?', [rol, req.params.id]);
  res.json({ ok: true });
});

// ── Eliminar ────────────────────────────────────────────
router.delete('/usuarios/:id', async (req, res) => {
  await db.query('DELETE FROM usuarios WHERE id=?', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
