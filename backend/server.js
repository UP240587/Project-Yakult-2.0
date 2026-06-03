const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// ── Rutas ──
app.use('/api/productos', require('./routes/productos'));
app.use('/api/clientes', require('./routes/clientes'));
app.use('/api/ordenes', require('./routes/ordenes'));
app.use('/api/auth', require('./routes/auth'));     

// Ruta de prueba
app.get('/', (req, res) => res.json({ ok: true, mensaje: 'API Yakult funcionando ✅' }));

const PORT = 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'x-github-token'],
}));
