const router = require('express').Router();
const PDFDocument = require('pdfkit');
const db = require('../db');
const { ensureSchema } = require('../schema');
const { verificarToken } = require('../authToken');

const AGRUPACIONES = new Set(['dia', 'semana', 'mes', 'anio']);

router.use(async (req, res, next) => {
  try {
    await ensureSchema();
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.use(async (req, res, next) => {
  try {
    const sesion = verificarToken(req);
    const [rows] = await db.query(
      'SELECT id, nombre, correo, rol, activo FROM usuarios WHERE id = ? AND activo = 1',
      [sesion.id]
    );
    if (rows.length === 0) return res.status(403).json({ error: 'Usuario sin autorización para reportes.' });
    req.usuario = rows[0];
    next();
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

router.get('/opciones', async (req, res) => {
  const [clientes] = await db.query(
    'SELECT id, nombre FROM clientes WHERE activo = 1 ORDER BY nombre'
  );
  const [productos] = await db.query(
    `SELECT id, nombre, COALESCE(NULLIF(categoria,''), 'General') AS categoria
     FROM productos
     ORDER BY nombre`
  );
  const [categorias] = await db.query(
    `SELECT DISTINCT COALESCE(NULLIF(categoria,''), 'General') AS categoria
     FROM productos
     ORDER BY categoria`
  );
  const [vendedores] = await db.query(
    `SELECT id, nombre, rol
     FROM usuarios
     WHERE activo = 1
     ORDER BY nombre`
  );

  res.json({
    clientes,
    productos,
    categorias: categorias.map((c) => c.categoria),
    vendedores,
  });
});

router.post('/ventas', async (req, res) => {
  try {
    const filtros = parseFilters(req.body);
    const resultado = await buildReport(filtros, req.usuario);
    const nombre = req.body.nombre?.trim() || `Reporte ${filtros.fechaInicio} a ${filtros.fechaFin}`;

    const [saved] = await db.query(
      `INSERT INTO reportes_ventas
       (usuario_id, nombre, fecha_inicio, fecha_fin, cliente_id, producto_id, categoria,
        vendedor_id, agrupacion, total_ventas, total_ingresos, filtros_json, resultado_json)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        req.usuario.id,
        nombre,
        filtros.fechaInicio,
        filtros.fechaFin,
        filtros.clienteId,
        filtros.productoId,
        filtros.categoria,
        filtros.vendedorId,
        filtros.agrupacion,
        resultado.resumen.totalVentas,
        resultado.resumen.ingresosTotales,
        JSON.stringify(filtros),
        JSON.stringify(resultado),
      ]
    );

    res.json({ id: saved.insertId, nombre, ...resultado });
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ error: err.message });
  }
});

router.get('/historial', async (req, res) => {
  const params = req.usuario.rol === 'Master' ? [] : [req.usuario.id];
  const where = req.usuario.rol === 'Master' ? '' : 'WHERE r.usuario_id = ?';
  const [rows] = await db.query(
    `SELECT r.id, r.nombre, r.fecha_inicio AS fechaInicio, r.fecha_fin AS fechaFin,
            r.agrupacion, r.total_ventas AS totalVentas, r.total_ingresos AS ingresosTotales,
            DATE_FORMAT(r.creado_en, '%Y-%m-%d %H:%i') AS generadoEn,
            u.nombre AS generadoPor
     FROM reportes_ventas r
     LEFT JOIN usuarios u ON u.id = r.usuario_id
     ${where}
     ORDER BY r.creado_en DESC
     LIMIT 50`,
    params
  );

  res.json(rows.map((row) => ({
    ...row,
    totalVentas: Number(row.totalVentas),
    ingresosTotales: Number(row.ingresosTotales),
  })));
});

router.get('/:id', async (req, res) => {
  try {
    const reporte = await getStoredReport(req.params.id, req.usuario);
    res.json(reporte);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

router.get('/:id/export/pdf', async (req, res) => {
  try {
    const reporte = await getStoredReport(req.params.id, req.usuario);
    const buffer = await createPdf(reporte);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename(reporte.nombre)}.pdf"`);
    res.send(buffer);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

router.get('/:id/imprimir', async (req, res) => {
  try {
    const reporte = await getStoredReport(req.params.id, req.usuario);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(createPrintableHtml(reporte));
  } catch (err) {
    res.status(err.statusCode || 500).send(`<p>${escapeHtml(err.message)}</p>`);
  }
});

// ═══════════════════════════════════════════════════════════════
// Filters & Helpers
// ═══════════════════════════════════════════════════════════════

function parseFilters(input = {}) {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const defaults = {
    fechaInicio: `${yyyy}-${mm}-01`,
    fechaFin: `${yyyy}-${mm}-${dd}`,
  };

  const filtros = {
    fechaInicio: String(input.fechaInicio || defaults.fechaInicio).trim(),
    fechaFin: String(input.fechaFin || defaults.fechaFin).trim(),
    clienteId: numberOrNull(input.clienteId),
    productoId: numberOrNull(input.productoId),
    categoria: input.categoria ? String(input.categoria).trim() : null,
    vendedorId: numberOrNull(input.vendedorId),
    agrupacion: AGRUPACIONES.has(input.agrupacion) ? input.agrupacion : 'dia',
  };

  if (!isDate(filtros.fechaInicio) || !isDate(filtros.fechaFin)) {
    throw badRequest('Usa fechas con formato YYYY-MM-DD.');
  }
  if (filtros.fechaInicio > filtros.fechaFin) {
    throw badRequest('La fecha inicial no puede ser posterior a la fecha final.');
  }

  return filtros;
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function isDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

function notFound(message) {
  const err = new Error(message);
  err.statusCode = 404;
  return err;
}

function buildWhere(filtros) {
  const where = ['o.fecha >= ?', 'o.fecha < DATE_ADD(?, INTERVAL 1 DAY)'];
  const params = [filtros.fechaInicio, filtros.fechaFin];

  if (filtros.clienteId) {
    where.push('o.cliente_id = ?');
    params.push(filtros.clienteId);
  }
  if (filtros.productoId) {
    where.push('oi.producto_id = ?');
    params.push(filtros.productoId);
  }
  if (filtros.categoria) {
    where.push("COALESCE(NULLIF(p.categoria,''), 'General') = ?");
    params.push(filtros.categoria);
  }
  if (filtros.vendedorId) {
    where.push('o.vendedor_id = ?');
    params.push(filtros.vendedorId);
  }

  return { sql: `WHERE ${where.join(' AND ')}`, params };
}

// ═══════════════════════════════════════════════════════════════
// Report Builder
// ═══════════════════════════════════════════════════════════════

async function buildReport(filtros, usuario) {
  await db.query('SET SESSION group_concat_max_len = 1000000');
  const { sql, params } = buildWhere(filtros);
  const joins = `
    FROM ordenes o
    JOIN clientes c ON c.id = o.cliente_id
    JOIN orden_items oi ON oi.orden_id = o.id
    JOIN productos p ON p.id = oi.producto_id
    LEFT JOIN usuarios u ON u.id = o.vendedor_id
  `;

  const [[resumenRow]] = await db.query(
    `SELECT COUNT(DISTINCT o.id) AS totalVentas,
            COALESCE(SUM(oi.cantidad), 0) AS unidadesVendidas,
            COALESCE(SUM(oi.cantidad * oi.precio_unit), 0) AS ingresosTotales
     ${joins}
     ${sql}`,
    params
  );

  const [ventasRows] = await db.query(
    `SELECT o.id AS numeroVenta,
            DATE_FORMAT(o.fecha, '%Y-%m-%d %H:%i') AS fecha,
            c.nombre AS cliente,
            COALESCE(u.nombre, 'Sin vendedor') AS vendedor,
            GROUP_CONCAT(CONCAT(p.nombre, ' x', oi.cantidad)
              ORDER BY p.nombre SEPARATOR ', ') AS productosVendidos,
            SUM(oi.cantidad) AS cantidad,
            SUM(oi.cantidad * oi.precio_unit) AS total
     ${joins}
     ${sql}
     GROUP BY o.id, o.fecha, c.nombre, u.nombre
     ORDER BY o.fecha DESC, o.id DESC`,
    params
  );

  const [productosRows] = await db.query(
    `SELECT p.id, p.nombre, COALESCE(NULLIF(p.categoria,''), 'General') AS categoria,
            SUM(oi.cantidad) AS cantidad,
            SUM(oi.cantidad * oi.precio_unit) AS total
     ${joins}
     ${sql}
     GROUP BY p.id, p.nombre, p.categoria
     ORDER BY cantidad DESC, total DESC
     LIMIT 10`,
    params
  );

  const group = groupExpression(filtros.agrupacion);
  const [estadisticasRows] = await db.query(
    `SELECT ${group.key} AS clave,
            ${group.label} AS etiqueta,
            COUNT(DISTINCT o.id) AS ventas,
            SUM(oi.cantidad * oi.precio_unit) AS ingresos,
            SUM(oi.cantidad) AS unidades
     ${joins}
     ${sql}
     GROUP BY clave, etiqueta
     ORDER BY clave ASC`,
    params
  );

  const [vendedorRows] = await db.query(
    `SELECT COALESCE(u.nombre, 'Sin vendedor') AS vendedor,
            SUM(oi.cantidad * oi.precio_unit) AS ingresos,
            SUM(oi.cantidad) AS unidades,
            COUNT(DISTINCT o.id) AS ventas
     ${joins}
     ${sql}
     GROUP BY COALESCE(u.nombre, 'Sin vendedor')
     ORDER BY ingresos DESC
     LIMIT 8`,
    params
  );

  return {
    filtros,
    generadoPor: { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol },
    generadoEn: new Date().toISOString(),
    resumen: {
      totalVentas: Number(resumenRow.totalVentas),
      unidadesVendidas: Number(resumenRow.unidadesVendidas),
      ingresosTotales: Number(resumenRow.ingresosTotales),
    },
    ventas: ventasRows.map((row) => ({
      ...row,
      cantidad: Number(row.cantidad),
      total: Number(row.total),
    })),
    productosMasVendidos: productosRows.map((row) => ({
      ...row,
      cantidad: Number(row.cantidad),
      total: Number(row.total),
    })),
    estadisticas: estadisticasRows.map((row) => ({
      ...row,
      ventas: Number(row.ventas),
      ingresos: Number(row.ingresos),
      unidades: Number(row.unidades || 0),
    })),
    ventasPorVendedor: vendedorRows.map((row) => ({
      vendedor: row.vendedor,
      ingresos: Number(row.ingresos),
      unidades: Number(row.unidades),
      ventas: Number(row.ventas),
    })),
  };
}

function groupExpression(agrupacion) {
  if (agrupacion === 'semana') {
    return {
      key: "DATE_FORMAT(DATE_SUB(DATE(o.fecha), INTERVAL WEEKDAY(o.fecha) DAY), '%Y-%m-%d')",
      label: "CONCAT('Sem ', LPAD(WEEK(o.fecha, 3), 2, '0'), ' ', YEAR(o.fecha))",
    };
  }
  if (agrupacion === 'mes') {
    return {
      key: "DATE_FORMAT(o.fecha, '%Y-%m')",
      label: "DATE_FORMAT(o.fecha, '%m/%Y')",
    };
  }
  if (agrupacion === 'anio') {
    return {
      key: 'YEAR(o.fecha)',
      label: 'YEAR(o.fecha)',
    };
  }
  return {
    key: "DATE_FORMAT(o.fecha, '%Y-%m-%d')",
    label: "DATE_FORMAT(o.fecha, '%d/%m')",
  };
}

async function getStoredReport(id, usuario) {
  const [rows] = await db.query(
    `SELECT r.*, u.nombre AS generadoPorNombre, u.rol AS generadoPorRol
     FROM reportes_ventas r
     LEFT JOIN usuarios u ON u.id = r.usuario_id
     WHERE r.id = ?`,
    [id]
  );
  if (rows.length === 0) throw notFound('Reporte no encontrado.');

  const row = rows[0];
  if (usuario.rol !== 'Master' && row.usuario_id !== usuario.id) {
    const err = new Error('No tienes permiso para consultar este reporte.');
    err.statusCode = 403;
    throw err;
  }

  const resultado = JSON.parse(row.resultado_json);
  return {
    id: row.id,
    nombre: row.nombre,
    creadoEn: row.creado_en,
    ...resultado,
    generadoPor: {
      id: row.usuario_id,
      nombre: row.generadoPorNombre || resultado.generadoPor?.nombre || 'Usuario',
      rol: row.generadoPorRol || resultado.generadoPor?.rol || 'Promotor',
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// PDF Generation — Annual Sales Report Style
// ═══════════════════════════════════════════════════════════════

const PDF_GREEN       = '#1B7A5E';
const PDF_GREEN_DARK  = '#145C47';
const PDF_GRAY_DARK   = '#3D3D3D';
const PDF_TEXT        = '#333333';
const PDF_TEXT_MUTED  = '#666666';
const PDF_TABLE_ALT   = '#F2F8F5';
const PDF_CHART_COLORS = [
  '#1B7A5E', '#2D2D2D', '#3BA99C', '#F4A261',
  '#E63946', '#457B9D', '#7B61FF', '#6A994E',
];

function createPdf(reporte) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 30, size: 'A4', bufferPages: true });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const M = 30;
    const CW = doc.page.width - M * 2;

    pdfHeader(doc, reporte, M, CW);
    pdfPerformance(doc, reporte, M, CW);
    pdfPeriodTable(doc, reporte, M, CW);
    pdfVendedores(doc, reporte, M, CW);
    pdfTopProducts(doc, reporte, M, CW);
    pdfAllFooters(doc, M, CW);

    doc.end();
  });
}

// ── Header ───────────────────────────────────────────────────

function pdfHeader(doc, reporte, M, CW) {
  // Top green accent bar
  doc.rect(0, 0, doc.page.width, 4).fill(PDF_GREEN);

  // Logo area – left
  doc.fillColor(PDF_GREEN_DARK).font('Helvetica-Bold').fontSize(20)
    .text('YAKULT', M, 18, { lineBreak: false });
  doc.fillColor(PDF_GREEN_DARK).font('Helvetica').fontSize(9)
    .text('Distribución', M, 40, { lineBreak: false });
  doc.fillColor('#999999').font('Helvetica').fontSize(7)
    .text('est. 1935', M, 52, { lineBreak: false });

  // Title – right
  doc.fillColor(PDF_GREEN).font('Helvetica-Bold').fontSize(22)
    .text('Reporte de Ventas', M, 16, { width: CW, align: 'right' });
  doc.fillColor(PDF_TEXT_MUTED).font('Helvetica').fontSize(10)
    .text(`${reporte.filtros.fechaInicio}  a  ${reporte.filtros.fechaFin}`, M, 42,
      { width: CW, align: 'right' });

  // Green separator
  doc.moveTo(M, 68).lineTo(M + CW, 68).lineWidth(2).strokeColor(PDF_GREEN).stroke();
  doc.lineWidth(1);
  doc.y = 80;
}

// ── Overall Performance + Bar Chart ──────────────────────────

function pdfPerformance(doc, reporte, M, CW) {
  const y0 = doc.y;
  const leftW = 195;
  const gap = 18;
  const rightW = CW - leftW - gap;
  const rightX = M + leftW + gap;
  const sectionH = 165;

  // ── Left: metrics card ──
  doc.roundedRect(M, y0, leftW, sectionH, 6).fill('#FAFCFB');
  doc.roundedRect(M, y0, leftW, sectionH, 6).lineWidth(0.5).strokeColor('#D6E0DA').stroke();

  doc.fillColor(PDF_GREEN_DARK).font('Helvetica-Bold').fontSize(11)
    .text('Rendimiento General', M + 10, y0 + 12, { width: leftW - 20, lineBreak: false });

  // separator inside card
  doc.moveTo(M + 10, y0 + 30).lineTo(M + leftW - 10, y0 + 30)
    .lineWidth(0.5).strokeColor('#D0D8D4').stroke();

  const metrics = [
    { label: 'Total Ingresos',     value: `$${money(reporte.resumen.ingresosTotales)}` },
    { label: 'Unidades Vendidas',  value: String(reporte.resumen.unidadesVendidas) },
    { label: 'Total Ventas',       value: String(reporte.resumen.totalVentas) },
  ];

  metrics.forEach((m, i) => {
    const my = y0 + 40 + i * 38;
    doc.fillColor(PDF_TEXT_MUTED).font('Helvetica').fontSize(9)
      .text(m.label, M + 12, my, { lineBreak: false });
    doc.fillColor(PDF_TEXT).font('Helvetica-Bold').fontSize(14)
      .text(m.value, M + 12, my + 14, { lineBreak: false });
  });

  // ── Right: bar chart ──
  pdfBarChart(doc, (reporte.estadisticas || []).slice(0, 8), rightX, y0, rightW, sectionH);

  doc.y = y0 + sectionH + 14;
}

function pdfBarChart(doc, data, x, y, w, h) {
  // Background card
  doc.roundedRect(x, y, w, h, 6).fill('#FFFFFF');
  doc.roundedRect(x, y, w, h, 6).lineWidth(0.5).strokeColor('#D6E0DA').stroke();

  if (data.length === 0) {
    doc.fillColor('#999').font('Helvetica').fontSize(9)
      .text('Sin datos para graficar', x + 10, y + h / 2 - 6,
        { width: w - 20, align: 'center' });
    return;
  }

  const pad = { top: 30, bottom: 28, left: 42, right: 14 };
  const cx = x + pad.left;
  const cy = y + pad.top;
  const cw = w - pad.left - pad.right;
  const ch = h - pad.top - pad.bottom;

  const max = Math.max(1, ...data.map((d) => d.ingresos));

  // Title inside chart card
  doc.fillColor(PDF_TEXT_MUTED).font('Helvetica').fontSize(7)
    .text('Ingresos', x + 8, y + 8, { lineBreak: false });

  // Grid lines + Y-axis labels
  doc.strokeColor('#ECECEC').lineWidth(0.5);
  for (let i = 0; i <= 4; i++) {
    const gy = cy + (ch / 4) * i;
    doc.moveTo(cx, gy).lineTo(cx + cw, gy).stroke();
    const val = max - (max / 4) * i;
    doc.fillColor('#AAAAAA').font('Helvetica').fontSize(6)
      .text(`$${compactMoney(val)}`, x + 2, gy - 4,
        { width: pad.left - 6, align: 'right', lineBreak: false });
  }

  // Bars
  const barGap = 6;
  const barW = Math.min(30, (cw - barGap * (data.length + 1)) / data.length);
  const totalBarsW = barW * data.length + barGap * (data.length - 1);
  const startX = cx + (cw - totalBarsW) / 2;

  data.forEach((d, i) => {
    const barH = Math.max(4, (d.ingresos / max) * ch);
    const bx = startX + i * (barW + barGap);
    const by = cy + ch - barH;
    const color = PDF_CHART_COLORS[i % PDF_CHART_COLORS.length];

    doc.roundedRect(bx, by, barW, barH, 3).fill(color);

    // Value on top
    doc.fillColor(color).font('Helvetica-Bold').fontSize(7)
      .text(`$${compactMoney(d.ingresos)}`, bx - 12, by - 12,
        { width: barW + 24, align: 'center', lineBreak: false });

    // Period label below
    doc.fillColor(PDF_TEXT_MUTED).font('Helvetica').fontSize(6)
      .text(String(d.etiqueta), bx - 12, cy + ch + 6,
        { width: barW + 24, align: 'center', lineBreak: false });
  });

  // Legend
  const ly = y + h - 13;
  doc.circle(x + w / 2 - 28, ly + 3, 3).fill(PDF_GREEN);
  doc.fillColor(PDF_TEXT_MUTED).font('Helvetica').fontSize(7)
    .text('Ingresos', x + w / 2 - 22, ly, { lineBreak: false });
}

// ── Period Breakdown Table ───────────────────────────────────

function pdfPeriodTable(doc, reporte, M, CW) {
  const data = (reporte.estadisticas || []).slice(0, 8);
  const totalIngresos = data.reduce((s, d) => s + d.ingresos, 0) || 1;

  pdfEnsureSpace(doc, 120);

  doc.fillColor(PDF_TEXT).font('Helvetica-Bold').fontSize(12)
    .text('Desglose por Periodo', M, doc.y);
  doc.y += 6;

  if (data.length === 0) {
    doc.fillColor('#999').font('Helvetica').fontSize(9)
      .text('Sin datos para este periodo.', M, doc.y);
    doc.y += 24;
    return;
  }

  const colW = [CW * 0.22, CW * 0.20, CW * 0.16, CW * 0.14, CW * 0.14, CW * 0.14];
  const heads = ['Periodo', 'Ingresos', 'Unidades', 'Ventas', '% del Total', 'Crec. (%)'];
  const aligns = ['left', 'right', 'right', 'right', 'right', 'right'];

  const rows = data.map((d, i) => {
    const pct = ((d.ingresos / totalIngresos) * 100).toFixed(0);
    const prev = i > 0 ? data[i - 1].ingresos : 0;
    const growth = i === 0 || prev === 0
      ? '-'
      : `${(((d.ingresos - prev) / prev) * 100).toFixed(0)}%`;
    return [
      d.etiqueta,
      `$${money(d.ingresos)}`,
      String(d.unidades || d.ventas),
      String(d.ventas),
      `${pct}%`,
      growth,
    ];
  });

  doc.y = pdfGreenTable(doc, M, doc.y, colW, heads, rows, aligns);

  if ((reporte.estadisticas || []).length > data.length) {
    doc.fillColor('#999').font('Helvetica').fontSize(7)
      .text(`Se muestran 8 de ${reporte.estadisticas.length} periodos.`, M, doc.y + 2);
    doc.y += 14;
  }
  doc.y += 12;
}

// ── Ventas por Vendedor + Donut ──────────────────────────────

function pdfVendedores(doc, reporte, M, CW) {
  const data = (reporte.ventasPorVendedor || []).slice(0, 6);
  if (data.length === 0) return;

  pdfEnsureSpace(doc, 180);

  doc.fillColor(PDF_TEXT).font('Helvetica-Bold').fontSize(12)
    .text('Ventas por Vendedor', M, doc.y);
  doc.y += 6;

  const tableW = Math.round(CW * 0.52);
  const donutAreaW = CW - tableW - 15;
  const donutX = M + tableW + 15;
  const sectionY = doc.y;

  // ── Left: table ──
  const colW = [tableW * 0.34, tableW * 0.28, tableW * 0.20, tableW * 0.18];
  const heads = ['Vendedor', 'Ingresos', 'Unidades', 'Crec. (%)'];
  const aligns = ['left', 'right', 'right', 'right'];

  const rows = data.map((d, i) => {
    const prev = i > 0 ? data[i - 1].ingresos : 0;
    const growth = i === 0 || prev === 0
      ? '-'
      : `${(((d.ingresos - prev) / prev) * 100).toFixed(0)}%`;
    return [d.vendedor, `$${money(d.ingresos)}`, String(d.unidades), growth];
  });

  const tableEndY = pdfGreenTable(doc, M, sectionY, colW, heads, rows, aligns);

  // ── Right: donut chart ──
  const donutR = 50;
  const donutCX = donutX + donutAreaW / 2;
  const donutCY = sectionY + 14 + donutR + 8;

  doc.fillColor(PDF_TEXT).font('Helvetica-Bold').fontSize(9)
    .text('Distribución', donutX, sectionY, { width: donutAreaW, align: 'center' });

  const donutData = data.map((d) => ({ label: d.vendedor, value: d.ingresos }));
  pdfDonut(doc, donutData, donutCX, donutCY, donutR, donutR * 0.55);

  // Labels around donut
  const total = donutData.reduce((s, d) => s + d.value, 0) || 1;
  let angle = -Math.PI / 2;
  donutData.forEach((d, i) => {
    const sliceAngle = (d.value / total) * Math.PI * 2;
    const mid = angle + sliceAngle / 2;
    const lr = donutR + 20;
    const lx = donutCX + lr * Math.cos(mid);
    const ly = donutCY + lr * Math.sin(mid);
    const labelVal = d.value >= 1000 ? compactMoney(d.value) : String(Math.round(d.value));
    doc.fillColor(PDF_TEXT).font('Helvetica-Bold').fontSize(7)
      .text(labelVal, lx - 22, ly - 4, { width: 44, align: 'center', lineBreak: false });
    angle += sliceAngle;
  });

  // Legend below donut
  const legendY = donutCY + donutR + 22;
  const cols = Math.min(donutData.length, 3);
  const legendColW = donutAreaW / cols;
  donutData.forEach((d, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const lx = donutX + col * legendColW;
    const ly = legendY + row * 14;
    doc.circle(lx + 4, ly + 4, 3).fill(PDF_CHART_COLORS[i % PDF_CHART_COLORS.length]);
    doc.fillColor(PDF_TEXT_MUTED).font('Helvetica').fontSize(6)
      .text(d.label, lx + 10, ly + 1,
        { width: legendColW - 14, lineBreak: false, ellipsis: true });
  });

  const legendRows = Math.ceil(donutData.length / cols);
  const donutEndY = legendY + legendRows * 14 + 5;
  doc.y = Math.max(tableEndY, donutEndY) + 12;
}

function pdfDonut(doc, data, cx, cy, outerR, innerR) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return;

  let startAngle = -Math.PI / 2;

  data.forEach((d, i) => {
    const sliceAngle = (d.value / total) * Math.PI * 2;
    if (sliceAngle < 0.01) { startAngle += sliceAngle; return; }
    const endAngle = startAngle + sliceAngle;
    const color = PDF_CHART_COLORS[i % PDF_CHART_COLORS.length];
    const steps = Math.max(24, Math.ceil(sliceAngle * 30));
    const step = sliceAngle / steps;

    // Draw pie wedge from center
    doc.moveTo(cx, cy);
    for (let j = 0; j <= steps; j++) {
      const a = startAngle + step * j;
      doc.lineTo(cx + outerR * Math.cos(a), cy + outerR * Math.sin(a));
    }
    doc.lineTo(cx, cy);
    doc.fill(color);

    startAngle = endAngle;
  });

  // White center for donut hole
  doc.circle(cx, cy, innerR).fill('#FFFFFF');
}

// ── Top Products ─────────────────────────────────────────────

function pdfTopProducts(doc, reporte, M, CW) {
  const data = (reporte.productosMasVendidos || []).slice(0, 5);
  if (data.length === 0) return;

  pdfEnsureSpace(doc, 100);

  const totalIngresos = data.reduce((s, d) => s + d.total, 0) || 1;

  doc.fillColor(PDF_TEXT).font('Helvetica-Bold').fontSize(12)
    .text('Productos Más Vendidos', M, doc.y);
  doc.y += 6;

  const colW = [CW * 0.30, CW * 0.20, CW * 0.16, CW * 0.18, CW * 0.16];
  const heads = ['Producto', 'Categoría', 'Unidades', 'Total Ventas', 'Contribución'];
  const aligns = ['left', 'left', 'right', 'right', 'right'];

  const rows = data.map((p, i) => {
    const contrib = ((p.total / totalIngresos) * 100).toFixed(0);
    const name = i === 0 ? `${p.nombre}  ★` : p.nombre;
    return [name, p.categoria, String(p.cantidad), `$${money(p.total)}`, `${contrib}%`];
  });

  doc.y = pdfGreenTable(doc, M, doc.y, colW, heads, rows, aligns);
  doc.y += 10;
}

// ── Detalle de Ventas ────────────────────────────────────────

function pdfSalesDetail(doc, reporte, M, CW) {
  const rows = (reporte.ventas || []).slice(0, 60);
  if (rows.length === 0) return;

  pdfEnsureSpace(doc, 80);

  doc.fillColor(PDF_TEXT).font('Helvetica-Bold').fontSize(12)
    .text('Detalle de Ventas', M, doc.y);
  doc.y += 6;

  const colW = [CW * 0.08, CW * 0.14, CW * 0.18, CW * 0.30, CW * 0.12, CW * 0.18];
  const heads = ['Venta', 'Fecha', 'Cliente', 'Productos', 'Cant.', 'Total'];
  const aligns = ['left', 'left', 'left', 'left', 'right', 'right'];

  const tableRows = rows.map((v) => [
    `#${v.numeroVenta}`,
    v.fecha,
    v.cliente,
    v.productosVendidos,
    String(v.cantidad),
    `$${money(v.total)}`,
  ]);

  doc.y = pdfGreenTable(doc, M, doc.y, colW, heads, tableRows, aligns);

  if ((reporte.ventas || []).length > rows.length) {
    doc.fillColor('#999').font('Helvetica').fontSize(7)
      .text(`Se muestran 60 de ${reporte.ventas.length} ventas.`, M, doc.y + 2);
    doc.y += 14;
  }
}

// ── Reusable Green-Header Table ──────────────────────────────

function pdfGreenTable(doc, x, y, colWidths, headers, rows, aligns) {
  const tableW = colWidths.reduce((a, b) => a + b, 0);
  const headerH = 24;
  const rowH = 22;

  // Header
  doc.rect(x, y, tableW, headerH).fill(PDF_GREEN);
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8);
  let cx = x;
  headers.forEach((h, i) => {
    doc.text(h, cx + 5, y + 7,
      { width: colWidths[i] - 10, align: aligns[i] || 'left', lineBreak: false });
    cx += colWidths[i];
  });

  let ry = y + headerH;

  // Rows
  rows.forEach((row, ri) => {
    pdfEnsureSpace(doc, rowH + 40);
    if (doc.y > ry + 2) {
      // Page break happened — redraw header
      ry = doc.y;
      doc.rect(x, ry, tableW, headerH).fill(PDF_GREEN);
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8);
      cx = x;
      headers.forEach((h, i) => {
        doc.text(h, cx + 5, ry + 7,
          { width: colWidths[i] - 10, align: aligns[i] || 'left', lineBreak: false });
        cx += colWidths[i];
      });
      ry += headerH;
    }

    const bg = ri % 2 !== 0 ? PDF_TABLE_ALT : '#FFFFFF';
    doc.rect(x, ry, tableW, rowH).fill(bg);
    doc.moveTo(x, ry + rowH).lineTo(x + tableW, ry + rowH)
      .lineWidth(0.3).strokeColor('#E0E0E0').stroke();

    doc.fillColor(PDF_TEXT).font('Helvetica').fontSize(8);
    cx = x;
    row.forEach((cell, ci) => {
      doc.text(String(cell), cx + 5, ry + 6,
        { width: colWidths[ci] - 10, align: aligns[ci] || 'left',
          lineBreak: false, ellipsis: true });
      cx += colWidths[ci];
    });

    ry += rowH;
  });

  return ry;
}

// ── Footer on all pages ──────────────────────────────────────

function pdfAllFooters(doc, M, CW) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const fy = doc.page.height - 38;

    // Dark bar
    doc.rect(0, fy, doc.page.width, 38).fill(PDF_GRAY_DARK);

    doc.fillColor('#CCCCCC').font('Helvetica').fontSize(7);
    const col1 = M;
    const col2 = M + CW * 0.35;
    const col3 = M + CW * 0.68;
    const ty = fy + 13;

    doc.text('Tel: Yakult Distribución', col1, ty, { lineBreak: false });
    doc.text('ventas@yakult.com.mx', col2, ty, { lineBreak: false });
    doc.text('Oficinas Yakult, México', col3, ty, { lineBreak: false });

    // Page number
    doc.fillColor('#999999').fontSize(6)
      .text(`Página ${i + 1} de ${range.count}`, M, fy + 26,
        { width: CW, align: 'center', lineBreak: false });
  }
}

// ── Utilities ────────────────────────────────────────────────

function pdfEnsureSpace(doc, needed) {
  const available = doc.page.height - doc.page.margins.bottom - 42 - doc.y;
  if (available < needed) {
    doc.addPage();
    doc.y = doc.page.margins.top;
  }
}

function compactMoney(value) {
  const n = Number(value || 0);
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toFixed(0);
}

function labelAgrupacion(value) {
  const labels = { dia: 'Día', semana: 'Semana', mes: 'Mes', anio: 'Año' };
  return labels[value] || 'Día';
}

// ═══════════════════════════════════════════════════════════════
// Printable HTML (unchanged)
// ═══════════════════════════════════════════════════════════════

function createPrintableHtml(reporte) {
  const ventas = reporte.ventas.map((v) => `
    <tr>
      <td>#${v.numeroVenta}</td>
      <td>${escapeHtml(v.fecha)}</td>
      <td>${escapeHtml(v.cliente)}</td>
      <td>${escapeHtml(v.vendedor)}</td>
      <td>${escapeHtml(v.productosVendidos)}</td>
      <td>${v.cantidad}</td>
      <td>$${money(v.total)}</td>
    </tr>`).join('');

  return `<!doctype html>
  <html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(reporte.nombre)}</title>
    <style>
      body { font-family: Arial, sans-serif; color: #1A1A1A; margin: 28px; }
      h1 { font-size: 22px; margin-bottom: 4px; }
      .muted { color: #666; font-size: 13px; }
      .summary { display: flex; gap: 12px; margin: 18px 0; }
      .summary div { border: 1px solid #ddd; padding: 10px 14px; border-radius: 6px; }
      table { border-collapse: collapse; width: 100%; font-size: 12px; }
      th, td { border: 1px solid #ddd; padding: 7px; vertical-align: top; }
      th { background: #f5f5f5; text-align: left; }
      @media print { button { display: none; } body { margin: 0; } }
    </style>
  </head>
  <body>
    <button onclick="window.print()">Imprimir</button>
    <h1>${escapeHtml(reporte.nombre)}</h1>
    <div class="muted">Periodo: ${reporte.filtros.fechaInicio} a ${reporte.filtros.fechaFin}</div>
    <div class="muted">Generado por: ${escapeHtml(reporte.generadoPor.nombre)}</div>
    <div class="summary">
      <div><strong>${reporte.resumen.totalVentas}</strong><br>Ventas</div>
      <div><strong>${reporte.resumen.unidadesVendidas}</strong><br>Unidades</div>
      <div><strong>$${money(reporte.resumen.ingresosTotales)}</strong><br>Ingresos</div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Venta</th><th>Fecha</th><th>Cliente</th><th>Vendedor</th>
          <th>Productos</th><th>Cantidad</th><th>Total</th>
        </tr>
      </thead>
      <tbody>${ventas}</tbody>
    </table>
    <script>window.addEventListener('load', () => setTimeout(() => window.print(), 250));</script>
  </body>
  </html>`;
}

function money(value) {
  return Number(value || 0).toFixed(2);
}

function filename(value) {
  return String(value || 'reporte-ventas')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'reporte-ventas';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

module.exports = router;
