// ═══════════════════════════════════════════════════════════════════════════
// Sprint 9 — Pasarela de pago Mercado Pago (Checkout Pro)
//
// Flujo:
//   1. POST /preferencia        → crea una preferencia de Checkout Pro para una
//      orden y devuelve el link de pago (init_point).
//   2. El cliente paga en el checkout hospedado de MP (link abierto en la app
//      o enviado por WhatsApp).
//   3a. Con PUBLIC_URL https (túnel/dominio): MP llama a POST /webhook.
//   3b. En local sin túnel: la página de retorno (GET /retorno/:resultado)
//       procesa el payment_id que MP agrega al redirect, y además la app tiene
//       GET /orden/:id/verificar que consulta a MP por polling.
//   4. Al confirmarse un pago aprobado: ordenes.pago_estado = 'Aprobado',
//      la orden pasa a 'Entregado' y se notifica a vendedor y repartidor
//      (decisión del usuario, Sprint 9).
// ═══════════════════════════════════════════════════════════════════════════
const router = require('express').Router();
const db     = require('../db');
const { requiereAuth } = require('../authToken');
const {
  MercadoPagoConfig, Preference, Payment,
  WebhookSignatureValidator,
} = require('mercadopago');

const ACCESS_TOKEN   = process.env.MP_ACCESS_TOKEN || '';
const WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET || '';
const PUBLIC_URL     = (process.env.PUBLIC_URL || 'http://localhost:3000').replace(/\/+$/, '');
// auto_return y webhooks solo tienen sentido con una URL alcanzable por MP.
const URL_PUBLICA_HTTPS = PUBLIC_URL.startsWith('https://');

const credencialesListas = () =>
  Boolean(ACCESS_TOKEN) && !ACCESS_TOKEN.includes('PON-AQUI');

let _cliente = null;
function clienteMP() {
  if (!credencialesListas()) {
    const err = new Error('Mercado Pago no está configurado: pega tu MP_ACCESS_TOKEN en backend/.env y reinicia el servidor.');
    err.statusCode = 503;
    throw err;
  }
  if (!_cliente) _cliente = new MercadoPagoConfig({ accessToken: ACCESS_TOKEN });
  return _cliente;
}

// Envuelve handlers async y convierte errores en JSON uniforme.
const manejar = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    console.error('[pagos]', err);
    res.status(err.statusCode || 500).json({ error: err.message || 'Error en pagos.' });
  }
};

// Estado de MP → estado interno del ENUM de pagos.
function mapEstado(statusMP) {
  switch (statusMP) {
    case 'approved':     return 'Aprobado';
    case 'rejected':
    case 'cancelled':    return 'Rechazado';
    case 'refunded':
    case 'charged_back': return 'Reembolsado';
    default:             return 'Pendiente'; // pending, in_process, authorized…
  }
}

async function notificar({ usuarioId, ordenId = null, tipo = 'info', titulo, mensaje }) {
  if (!usuarioId) return;
  await db.query(
    'INSERT INTO notificaciones (usuario_id, orden_id, tipo, titulo, mensaje) VALUES (?,?,?,?,?)',
    [usuarioId, ordenId, tipo, titulo, mensaje]
  );
}

async function cargarOrden(ordenId) {
  const [[orden]] = await db.query(
    `SELECT o.id, o.total, o.estado, o.pago_estado AS pagoEstado,
            o.vendedor_id AS vendedorId, o.repartidor_id AS repartidorId,
            c.nombre AS clienteNombre
     FROM ordenes o JOIN clientes c ON c.id = o.cliente_id
     WHERE o.id = ?`,
    [ordenId]
  );
  return orden || null;
}

// ── Núcleo idempotente: aplica un payment de MP sobre la BD ────────────────
// Se invoca desde webhook, retorno y verificación; puede llegar varias veces
// el mismo payment sin duplicar filas ni notificaciones.
async function aplicarPago(payment) {
  const ordenId = Number(payment.external_reference);
  if (!ordenId) return null;

  const orden = await cargarOrden(ordenId);
  if (!orden) return null;

  let estadoNuevo   = mapEstado(payment.status);
  const paymentId   = String(payment.id);
  const metodo      = payment.payment_method_id || payment.payment_type_id || null;
  const montoMP     = Number(payment.transaction_amount);
  const monto       = Number.isFinite(montoMP) ? montoMP : Number(orden.total);

  // ── Validación estricta de monto (Sprint 9 · PoC seguridad) ──
  // Un pago "approved" solo se acepta si lo que MP cobró coincide exactamente
  // con el total de la orden en BD (comparado en centavos para evitar ruido
  // de punto flotante). Si no coincide, se registra como Rechazado y la orden
  // NUNCA se marca como pagada; el detalle completo queda en raw_json.
  const montoCoincide =
    Number.isFinite(montoMP) &&
    Math.round(montoMP * 100) === Math.round(Number(orden.total) * 100);
  if (estadoNuevo === 'Aprobado' && !montoCoincide) {
    console.warn(
      `[pagos] ⚠️ Monto no coincide en orden #${ordenId}: MP cobró $${montoMP} pero la orden vale $${orden.total}. Pago ${paymentId} marcado como Rechazado.`
    );
    estadoNuevo = 'Rechazado';
  }

  // Upsert del intento por mp_payment_id.
  const [[existente]] = await db.query(
    'SELECT id, estado FROM pagos WHERE mp_payment_id = ? LIMIT 1',
    [paymentId]
  );
  if (existente) {
    await db.query(
      'UPDATE pagos SET estado=?, metodo=?, monto=?, raw_json=? WHERE id=?',
      [estadoNuevo, metodo, monto, JSON.stringify(payment), existente.id]
    );
  } else {
    // Si hay un intento Pendiente sin payment asociado (la preferencia recién
    // creada), lo completa; si no, registra una fila nueva.
    const [[pendiente]] = await db.query(
      `SELECT id FROM pagos
       WHERE orden_id = ? AND mp_payment_id IS NULL AND estado = 'Pendiente'
       ORDER BY creado_en DESC LIMIT 1`,
      [ordenId]
    );
    if (pendiente) {
      await db.query(
        'UPDATE pagos SET mp_payment_id=?, estado=?, metodo=?, monto=?, raw_json=? WHERE id=?',
        [paymentId, estadoNuevo, metodo, monto, JSON.stringify(payment), pendiente.id]
      );
    } else {
      await db.query(
        'INSERT INTO pagos (orden_id, mp_payment_id, estado, metodo, monto, raw_json) VALUES (?,?,?,?,?,?)',
        [ordenId, paymentId, estadoNuevo, metodo, monto, JSON.stringify(payment)]
      );
    }
  }

  // Consolidar en la orden. Nunca degradar una orden ya Aprobada
  // (p. ej. si llega tarde un webhook de un intento rechazado anterior).
  const yaAprobada = orden.pagoEstado === 'Aprobado';
  if (!yaAprobada && estadoNuevo !== orden.pagoEstado) {
    await db.query('UPDATE ordenes SET pago_estado=? WHERE id=?', [estadoNuevo, ordenId]);
  }

  // Efectos secundarios SOLO en la primera transición a Aprobado.
  if (estadoNuevo === 'Aprobado' && !yaAprobada) {
    let mensajeEstado = '';
    if (orden.estado !== 'Entregado') {
      await db.query("UPDATE ordenes SET estado='Entregado' WHERE id=?", [ordenId]);
      mensajeEstado = ' La orden pasó a "Entregado".';
    }
    const aviso = {
      ordenId,
      tipo: 'info',
      titulo: `Pago aprobado · Orden #${ordenId}`,
      mensaje: `${orden.clienteNombre} pagó $${monto.toFixed(2)} vía Mercado Pago.${mensajeEstado}`,
    };
    await notificar({ usuarioId: orden.vendedorId, ...aviso });
    if (orden.repartidorId && orden.repartidorId !== orden.vendedorId) {
      await notificar({ usuarioId: orden.repartidorId, ...aviso });
    }
  }

  return { ordenId, estado: estadoNuevo, paymentId, metodo, monto };
}

// ── POST /api/pagos/preferencia — crea el link de cobro de una orden ────────
router.post('/preferencia', requiereAuth, manejar(async (req, res) => {
  const ordenId = Number(req.body?.ordenId);
  if (!ordenId) return res.status(400).json({ error: 'ordenId es requerido.' });

  const orden = await cargarOrden(ordenId);
  if (!orden) return res.status(404).json({ error: `La orden #${ordenId} no existe.` });
  if (orden.pagoEstado === 'Aprobado')
    return res.status(400).json({ error: `La orden #${ordenId} ya está pagada.` });

  const [items] = await db.query(
    `SELECT oi.producto_id, p.nombre, oi.cantidad, oi.precio_unit
     FROM orden_items oi JOIN productos p ON p.id = oi.producto_id
     WHERE oi.orden_id = ?`,
    [ordenId]
  );
  if (items.length === 0)
    return res.status(400).json({ error: 'La orden no tiene productos.' });

  const preferencia = await new Preference(clienteMP()).create({
    body: {
      items: items.map((i) => ({
        id: String(i.producto_id),
        title: i.nombre,
        quantity: Number(i.cantidad),
        unit_price: Number(i.precio_unit),
        currency_id: 'MXN',
      })),
      external_reference: String(ordenId),
      statement_descriptor: 'YAKULT AGS',
      metadata: { orden_id: ordenId },
      back_urls: {
        success: `${PUBLIC_URL}/api/pagos/retorno/success`,
        failure: `${PUBLIC_URL}/api/pagos/retorno/failure`,
        pending: `${PUBLIC_URL}/api/pagos/retorno/pending`,
      },
      // MP exige URLs alcanzables para estos dos campos; en localhost se omiten
      // y la confirmación local se hace vía retorno + verificación por polling.
      ...(URL_PUBLICA_HTTPS ? {
        auto_return: 'approved',
        notification_url: `${PUBLIC_URL}/api/pagos/webhook`,
      } : {}),
    },
  });

  const link = preferencia.init_point || preferencia.sandbox_init_point;

  // Registra el intento y marca la orden como cobro Pendiente.
  await db.query(
    'INSERT INTO pagos (orden_id, mp_preference_id, estado, monto, link_pago) VALUES (?,?,?,?,?)',
    [ordenId, preferencia.id, 'Pendiente', orden.total, link]
  );
  await db.query(
    "UPDATE ordenes SET pago_estado='Pendiente' WHERE id=? AND pago_estado <> 'Aprobado'",
    [ordenId]
  );

  res.json({ ok: true, ordenId, preferenceId: preferencia.id, link });
}));

// ── POST /api/pagos/webhook — notificaciones server-to-server de MP ─────────
router.post('/webhook', manejar(async (req, res) => {
  // Valida la firma solo si hay secreto configurado en .env.
  if (WEBHOOK_SECRET) {
    try {
      WebhookSignatureValidator.validate({
        xSignature: req.headers['x-signature'],
        xRequestId: req.headers['x-request-id'],
        dataId: req.query['data.id'],
        secret: WEBHOOK_SECRET,
        toleranceSeconds: 300,
      });
    } catch {
      return res.status(401).json({ error: 'Firma de webhook inválida.' });
    }
  }

  // MP manda type/topic + id por query o por body según el tipo de evento.
  const tipo = req.query.type || req.query.topic || req.body?.type || req.body?.topic;
  const paymentId = req.query['data.id'] || req.body?.data?.id || req.query.id;

  if (tipo === 'payment' && paymentId) {
    const payment = await new Payment(clienteMP()).get({ id: paymentId });
    await aplicarPago(payment);
  }
  // 200 siempre que se procesó (o se ignoró un evento no relevante),
  // para que MP no reintente indefinidamente.
  res.sendStatus(200);
}));

// ── GET /api/pagos/orden/:id/verificar — fallback por polling (local) ───────
router.get('/orden/:id/verificar', requiereAuth, manejar(async (req, res) => {
  const ordenId = Number(req.params.id);
  const orden = await cargarOrden(ordenId);
  if (!orden) return res.status(404).json({ error: `La orden #${ordenId} no existe.` });

  const busqueda = await new Payment(clienteMP()).search({
    options: {
      external_reference: String(ordenId),
      sort: 'date_created',
      criteria: 'desc',
    },
  });

  const resultados = busqueda?.results || [];
  for (const payment of resultados) {
    await aplicarPago(payment);
  }

  const actualizada = await cargarOrden(ordenId);
  res.json({
    ok: true,
    ordenId,
    pagoEstado: actualizada.pagoEstado,
    intentosEnMP: resultados.length,
    mensaje: resultados.length === 0
      ? 'Mercado Pago aún no registra ningún intento de pago para esta orden.'
      : `Estado de cobro: ${actualizada.pagoEstado}.`,
  });
}));

// ── GET /api/pagos — cobranza para la pantalla "Ventas" ─────────────────────
router.get('/', requiereAuth, manejar(async (_req, res) => {
  const [pagos] = await db.query(`
    SELECT pg.id, pg.orden_id AS ordenId, c.nombre AS clienteNombre,
           pg.estado, pg.monto, pg.metodo, pg.mp_payment_id AS mpPaymentId,
           pg.link_pago AS linkPago,
           DATE_FORMAT(pg.creado_en, '%d %b %H:%i') AS fecha
    FROM pagos pg
    JOIN ordenes o  ON o.id = pg.orden_id
    JOIN clientes c ON c.id = o.cliente_id
    ORDER BY pg.creado_en DESC
  `);

  const [[resumen]] = await db.query(`
    SELECT
      COALESCE(SUM(CASE WHEN estado = 'Aprobado'  THEN monto END), 0) AS cobrado,
      COALESCE(SUM(CASE WHEN estado = 'Pendiente' THEN monto END), 0) AS porCobrar,
      COUNT(*) AS totalIntentos,
      SUM(estado = 'Aprobado') AS aprobados
    FROM pagos
  `);

  res.json({ pagos, resumen });
}));

// ── GET /api/pagos/retorno/:resultado — páginas back_urls de Checkout Pro ───
// Además de informar al usuario, si MP adjunta payment_id en el redirect se
// procesa aquí mismo: así el pago queda confirmado en BD incluso en local
// sin webhooks.
const RETORNOS = {
  success: { icono: '✅', titulo: '¡Pago aprobado!',   detalle: 'Tu pago se procesó correctamente. Ya puedes volver a la app Yakult.', color: '#2E7D32' },
  pending: { icono: '⏳', titulo: 'Pago en proceso',   detalle: 'Mercado Pago está procesando tu pago. En la app usa "Verificar" en unos minutos.', color: '#E65100' },
  failure: { icono: '❌', titulo: 'Pago no completado', detalle: 'El pago fue rechazado o cancelado. Puedes intentarlo de nuevo desde la app.', color: '#C62828' },
};

router.get('/retorno/:resultado', manejar(async (req, res) => {
  const meta = RETORNOS[req.params.resultado] || RETORNOS.pending;

  // Confirmación oportunista con el payment_id del redirect.
  const paymentId = req.query.payment_id || req.query.collection_id;
  if (paymentId && paymentId !== 'null' && credencialesListas()) {
    try {
      const payment = await new Payment(clienteMP()).get({ id: paymentId });
      await aplicarPago(payment);
    } catch (err) {
      // No bloquea la página de retorno: la app puede verificar por polling.
      console.error('[pagos] No se pudo confirmar el pago del retorno:', err.message);
    }
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Yakult · ${meta.titulo}</title>
<style>
  body { margin:0; font-family: system-ui, -apple-system, sans-serif; background:#F4F5F7;
         display:flex; align-items:center; justify-content:center; min-height:100vh; }
  .card { background:#fff; border-radius:16px; padding:40px 32px; max-width:420px; margin:16px;
          text-align:center; box-shadow:0 2px 8px rgba(26,26,46,.08); }
  .icono { font-size:56px; }
  h1 { color:${meta.color}; font-size:22px; margin:16px 0 8px; }
  p { color:#555; font-size:15px; line-height:1.5; margin:0 0 20px; }
  .marca { color:#E63946; font-weight:800; font-size:14px; letter-spacing:1px; }
</style></head>
<body><div class="card">
  <div class="icono">${meta.icono}</div>
  <h1>${meta.titulo}</h1>
  <p>${meta.detalle}</p>
  <div class="marca">YAKULT · Distribuidor Aguascalientes</div>
</div></body></html>`);
}));

module.exports = router;
// Exportado para poder probar la validación de montos sin pasar por MP.
module.exports.aplicarPago = aplicarPago;
