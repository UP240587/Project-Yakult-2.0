require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { ensureSchema } = require('./schema');
const { requiereAuth } = require('./authToken');
const app = express();

// Necesario para que express-rate-limit identifique la IP real detrás de un
// túnel https (ngrok/localtunnel) cuando se prueban los webhooks de MP.
app.set('trust proxy', 1);

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-github-token', 'x-user-id'],
  exposedHeaders: ['Content-Disposition'],
}));
app.use(express.json());

// ── Rate limiting (Sprint 9 · PoC seguridad) ──
// Global: 100 peticiones por IP cada 15 min. Si la demo lo alcanza
// (navegación intensa entre tabs), basta subir `limit` aquí.
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: true, legacyHeaders: false }));
// Estricto: 5 por minuto en login/registro y creación de pagos.
// Una instancia por ruta: cada una lleva su propio contador por IP.
const limiteEstricto = () => rateLimit({
  windowMs: 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Demasiados intentos. Espera un minuto y vuelve a intentar.' },
});
app.use('/api/auth/login', limiteEstricto());
app.use('/api/auth/registro', limiteEstricto());
app.use('/api/pagos/preferencia', limiteEstricto());

// ── Rutas ──
// requiereAuth exige el JWT que la app manda tras el login (services/db.ts).
// dashboard y reportes ya validan el token internamente; auth y pagos
// protegen sus sub-rutas sensibles dentro de cada router (webhook y retorno
// de MP deben quedar públicos porque Mercado Pago los llama sin nuestro token).
app.use('/api/productos', requiereAuth, require('./routes/productos'));
app.use('/api/clientes', requiereAuth, require('./routes/clientes'));
app.use('/api/ordenes', requiereAuth, require('./routes/ordenes'));
app.use('/api/notificaciones', requiereAuth, require('./routes/notificaciones'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/reportes', require('./routes/reportes'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/pagos', require('./routes/pagos'));

// Ruta de prueba
app.get('/', (req, res) => res.json({ ok: true, mensaje: 'API Yakult funcionando ✅' }));

const PORT = Number(process.env.PORT) || 3000;
ensureSchema()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
      // Recordatorio visible mientras las credenciales de MP sean placeholders.
      const token = process.env.MP_ACCESS_TOKEN || '';
      if (!token || token.includes('PON-AQUI')) {
        console.warn('⚠️  Mercado Pago SIN CONFIGURAR: pega tu MP_ACCESS_TOKEN en backend/.env (los cobros fallarán hasta entonces).');
      }
    });
  })
  .catch((err) => {
    console.error('No se pudo preparar la base de datos:', err);
    process.exit(1);
  });
