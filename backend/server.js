require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { ensureSchema } = require('./schema');
const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-github-token', 'x-user-id'],
  exposedHeaders: ['Content-Disposition'],
}));
app.use(express.json());

// ── Rutas ──
app.use('/api/productos', require('./routes/productos'));
app.use('/api/clientes', require('./routes/clientes'));
app.use('/api/ordenes', require('./routes/ordenes'));
app.use('/api/notificaciones', require('./routes/notificaciones'));
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
