const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'yakult-reportes-dev-secret';

function crearToken(usuario) {
  return jwt.sign(
    { id: usuario.id, rol: usuario.rol },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

function leerToken(req) {
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  return req.query.token || req.body?.token || null;
}

function verificarToken(req) {
  const token = leerToken(req);
  if (!token) {
    const err = new Error('Token de autenticación requerido.');
    err.statusCode = 401;
    throw err;
  }
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    const err = new Error('Token inválido o expirado.');
    err.statusCode = 401;
    throw err;
  }
}

// Middleware: exige un JWT válido y deja la sesión en req.usuario.
function requiereAuth(req, res, next) {
  try {
    req.usuario = verificarToken(req);
    next();
  } catch (err) {
    res.status(err.statusCode || 401).json({ error: err.message });
  }
}

// Middleware: además del token, exige rol Master (usar después de requiereAuth).
function soloMaster(req, res, next) {
  if (req.usuario?.rol !== 'Master')
    return res.status(403).json({ error: 'Se requiere rol Master.' });
  next();
}

module.exports = { crearToken, verificarToken, requiereAuth, soloMaster };
