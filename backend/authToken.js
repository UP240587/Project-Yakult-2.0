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

module.exports = { crearToken, verificarToken };
