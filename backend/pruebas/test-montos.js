// ═══════════════════════════════════════════════════════════════════════════
// Sprint 9 · PoC Seguridad — Prueba de validación estricta de montos
//
// Simula dos pagos "approved" de Mercado Pago directamente contra aplicarPago
// (sin pasar por MP) y verifica:
//   Caso 1: monto exacto    → la orden se marca Aprobada.
//   Caso 2: monto alterado  → el pago queda Rechazado y la orden NO se paga.
//
// Ejecutar desde la carpeta backend/:   node pruebas/test-montos.js
// Requiere MySQL corriendo (XAMPP). Crea sus datos de prueba y los borra al final.
// ═══════════════════════════════════════════════════════════════════════════
const db = require('../db');
const { aplicarPago } = require('../routes/pagos');

async function main() {
  // ── Datos de prueba ──
  const [c] = await db.query(
    "INSERT INTO clientes (nombre, telefono, direccion) VALUES ('TEST PoC Montos', '0000000000', 'n/a')"
  );
  const clienteId = c.insertId;
  const [o1] = await db.query(
    "INSERT INTO ordenes (cliente_id, total, estado) VALUES (?, 150.00, 'Pendiente')", [clienteId]);
  const [o2] = await db.query(
    "INSERT INTO ordenes (cliente_id, total, estado) VALUES (?, 150.00, 'Pendiente')", [clienteId]);

  // ── Caso 1: pago aprobado con el monto EXACTO ──
  await aplicarPago({
    id: 999000111, status: 'approved', external_reference: String(o1.insertId),
    payment_method_id: 'visa', transaction_amount: 150.00,
  });
  const [[r1]] = await db.query('SELECT pago_estado FROM ordenes WHERE id=?', [o1.insertId]);
  const [[p1]] = await db.query('SELECT estado FROM pagos WHERE mp_payment_id=?', ['999000111']);

  // ── Caso 2: pago aprobado con monto MANIPULADO ($1 en vez de $150) ──
  await aplicarPago({
    id: 999000222, status: 'approved', external_reference: String(o2.insertId),
    payment_method_id: 'visa', transaction_amount: 1.00,
  });
  const [[r2]] = await db.query('SELECT pago_estado FROM ordenes WHERE id=?', [o2.insertId]);
  const [[p2]] = await db.query('SELECT estado FROM pagos WHERE mp_payment_id=?', ['999000222']);

  console.log('Caso 1 (monto exacto 150==150):   orden =', r1.pago_estado, '| pago =', p1.estado,
    r1.pago_estado === 'Aprobado' && p1.estado === 'Aprobado' ? '✅' : '❌');
  console.log('Caso 2 (monto alterado 1!=150):   orden =', r2.pago_estado, '| pago =', p2.estado,
    r2.pago_estado !== 'Aprobado' && p2.estado === 'Rechazado' ? '✅' : '❌');

  // ── Limpieza ──
  await db.query('DELETE FROM pagos WHERE orden_id IN (?,?)', [o1.insertId, o2.insertId]);
  await db.query('DELETE FROM notificaciones WHERE orden_id IN (?,?)', [o1.insertId, o2.insertId]);
  await db.query('DELETE FROM ordenes WHERE id IN (?,?)', [o1.insertId, o2.insertId]);
  await db.query('DELETE FROM clientes WHERE id=?', [clienteId]);
  console.log('Datos de prueba eliminados.');
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
