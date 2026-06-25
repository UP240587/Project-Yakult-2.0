const router = require('express').Router();
const db = require('../db');
const { ensureSchema } = require('../schema');

router.use(async (req, res, next) => {
  try {
    await ensureSchema();
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Id del usuario que consulta (lo manda la app en x-user-id).
function actorId(req) {
  return Number(req.headers['x-user-id']) || null;
}

// GET — mis notificaciones (más recientes primero)
router.get('/', async (req, res) => {
  const uid = actorId(req);
  if (!uid) return res.json([]);
  const [rows] = await db.query(
    `SELECT id, orden_id AS ordenId, tipo, titulo, mensaje, leida,
            DATE_FORMAT(creado_en, '%d %b %H:%i') AS fecha
     FROM notificaciones
     WHERE usuario_id = ?
     ORDER BY creado_en DESC
     LIMIT 50`,
    [uid]
  );
  res.json(rows.map((r) => ({ ...r, leida: !!r.leida })));
});

// PUT — marcar una como leída
router.put('/:id/leida', async (req, res) => {
  const uid = actorId(req);
  await db.query(
    'UPDATE notificaciones SET leida = 1 WHERE id = ? AND usuario_id = ?',
    [req.params.id, uid]
  );
  res.json({ ok: true });
});

// PUT — marcar todas como leídas
router.put('/leer-todas', async (req, res) => {
  const uid = actorId(req);
  await db.query('UPDATE notificaciones SET leida = 1 WHERE usuario_id = ?', [uid]);
  res.json({ ok: true });
});

module.exports = router;
