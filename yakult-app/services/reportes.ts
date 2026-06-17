import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Reporte = {
  id: string;
  ordenId: number;
  clienteNombre: string;
  total: number;
  fechaOrden: string;
  fechaGeneracion: string; // ISO
  fileName: string;
  fileUri: string;         // en web guardamos el HTML como data-uri / cadena vacía
  html?: string;           // en web guardamos el HTML para re-abrirlo/descargarlo
  usuarioId: number;
  usuarioNombre: string;
};

const STORAGE_KEY = (uid: number) => `yakult_reportes_${uid}`;
const CARPETA = `${FileSystem.documentDirectory}reportes/`;

const fmtMoney = (n: number) => `$${Number(n).toFixed(2)}`;

// ── Plantilla HTML del PDF (estética Yakult) ──
const construirHTML = (orden: any, usuario: { nombre: string; rol: string }) => {
  const fechaGen = new Date().toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' });
  const estadoClass = (orden.estado ?? '').replace(' ', '').toLowerCase();
  const filas = (orden.items ?? []).map((it: any) => `
    <tr>
      <td>${it.nombre}</td>
      <td style="text-align:center">${it.cantidad}</td>
      <td style="text-align:right">${fmtMoney(it.precio)}</td>
      <td style="text-align:right">${fmtMoney(it.cantidad * it.precio)}</td>
    </tr>`).join('');

  return `
<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Reporte Orden #${orden.id}</title>
<style>
  @page { margin: 24px; }
  *{box-sizing:border-box}
  body{font-family:-apple-system,Helvetica,Arial,sans-serif;color:#1A1A1A;padding:32px;margin:0}
  .header{background:#E63946;color:#FFF;padding:22px 28px;border-radius:8px;margin-bottom:24px}
  .header h1{margin:0;font-size:26px;letter-spacing:1px}
  .header p{margin:4px 0 0;font-size:13px;opacity:.9}
  .meta{display:flex;justify-content:space-between;margin-bottom:14px;font-size:13px}
  .meta .col{width:48%}
  .meta strong{display:block;color:#9E9E9E;font-size:11px;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}
  h2{font-size:14px;color:#E63946;border-bottom:2px solid #E63946;padding-bottom:6px;margin:22px 0 10px}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th{background:#FAFAFA;padding:10px 8px;text-align:left;font-weight:700;border-bottom:1px solid #EBEBEB}
  td{padding:9px 8px;border-bottom:1px solid #F2F2F2}
  .total-box{margin-top:18px;padding:14px 18px;background:#FFF3F3;border-radius:8px;display:flex;justify-content:space-between;align-items:center}
  .total-box .label{font-size:13px;color:#9E9E9E;text-transform:uppercase;letter-spacing:.5px}
  .total-box .valor{font-size:22px;font-weight:700;color:#E63946}
  .estado{display:inline-block;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700}
  .estado-pendiente{background:#FFE0B2;color:#E65100}
  .estado-encamino{background:#BBDEFB;color:#0D47A1}
  .estado-entregado{background:#C8E6C9;color:#1B5E20}
  .footer{margin-top:36px;padding-top:14px;border-top:1px solid #EBEBEB;font-size:10px;color:#9E9E9E;text-align:center}
</style></head><body>
  <div class="header">
    <h1>YAKULT AGUASCALIENTES</h1>
    <p>Reporte de Orden #${orden.id}</p>
  </div>
  <div class="meta">
    <div class="col"><strong>Cliente</strong>${orden.clienteNombre}</div>
    <div class="col"><strong>Fecha de orden</strong>${orden.fecha ?? '—'}</div>
  </div>
  <div class="meta">
    <div class="col"><strong>Estado</strong><span class="estado estado-${estadoClass}">${orden.estado}</span></div>
    <div class="col"><strong>Generado por</strong>${usuario.nombre} (${usuario.rol})</div>
  </div>
  <h2>Detalle de productos</h2>
  <table>
    <thead><tr><th>Producto</th><th style="text-align:center">Cant.</th><th style="text-align:right">P. Unitario</th><th style="text-align:right">Subtotal</th></tr></thead>
    <tbody>${filas}</tbody>
  </table>
  <div class="total-box">
    <span class="label">Total de la orden</span>
    <span class="valor">${fmtMoney(orden.total)}</span>
  </div>
  <div class="footer">Documento generado el ${fechaGen} · Yakult Aguascalientes · Sistema de gestión de órdenes</div>
</body></html>`;
};

// ── WEB: abre el HTML del reporte en una ventana nueva y lanza el diálogo de impresión ──
//    (NO imprime la app; imprime solo este documento → "Guardar como PDF" produce el reporte correcto)
const imprimirWeb = (html: string) => {
  const win = window.open('', '_blank');
  if (!win) throw new Error('El navegador bloqueó la ventana. Permite las ventanas emergentes e inténtalo de nuevo.');
  win.document.open();
  win.document.write(html);
  win.document.close();
  // Espera a que el contenido cargue antes de imprimir
  win.onload = () => {
    win.focus();
    win.print();
  };
  // Fallback por si onload no dispara (HTML ya cargado)
  setTimeout(() => { try { win.focus(); win.print(); } catch {} }, 600);
};

// ── Generar y guardar reporte ──
export const generarReporteOrden = async (
  orden: any,
  usuario: { id: number; nombre: string; correo: string; rol: string },
): Promise<Reporte> => {
  const html = construirHTML(orden, usuario);

  let fileUri = '';
  let htmlGuardado: string | undefined;
  const fileName = `orden-${orden.id}-${Date.now()}.pdf`;

  if (Platform.OS === 'web') {
    // En web no se puede escribir un PDF al sistema de archivos:
    // guardamos el HTML para poder re-abrir/imprimir desde el Perfil.
    htmlGuardado = html;
  } else {
    // Nativo: genera el PDF real y lo persiste en documentDirectory/reportes/
    const { uri: tmpUri } = await Print.printToFileAsync({ html, base64: false });
    await FileSystem.makeDirectoryAsync(CARPETA, { intermediates: true });
    const destino = `${CARPETA}${fileName}`;
    await FileSystem.moveAsync({ from: tmpUri, to: destino });
    fileUri = destino;
  }

  const reporte: Reporte = {
    id: `${orden.id}-${Date.now()}`,
    ordenId: orden.id,
    clienteNombre: orden.clienteNombre,
    total: Number(orden.total),
    fechaOrden: orden.fecha ?? '',
    fechaGeneracion: new Date().toISOString(),
    fileName,
    fileUri,
    html: htmlGuardado,
    usuarioId: usuario.id,
    usuarioNombre: usuario.nombre,
  };

  const lista = await listarReportes(usuario.id);
  await AsyncStorage.setItem(STORAGE_KEY(usuario.id), JSON.stringify([reporte, ...lista]));

  // Tras guardarlo, lánzalo para que el usuario lo vea/descargue de inmediato
  if (Platform.OS === 'web') {
    imprimirWeb(html);
  }

  return reporte;
};

export const listarReportes = async (usuarioId: number): Promise<Reporte[]> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY(usuarioId));
  return raw ? JSON.parse(raw) : [];
};

// ── Abrir / descargar un reporte ya guardado ──
export const abrirReporte = async (reporte: Reporte) => {
  if (Platform.OS === 'web') {
    if (!reporte.html) throw new Error('Este reporte no tiene contenido para mostrar.');
    imprimirWeb(reporte.html);
    return;
  }
  const info = await FileSystem.getInfoAsync(reporte.fileUri);
  if (!info.exists) throw new Error('El archivo ya no existe en este dispositivo.');
  if (!(await Sharing.isAvailableAsync())) throw new Error('Compartir no está disponible.');
  await Sharing.shareAsync(reporte.fileUri, {
    mimeType: 'application/pdf',
    dialogTitle: `Reporte orden #${reporte.ordenId}`,
    UTI: 'com.adobe.pdf',
  });
};

export const eliminarReporte = async (usuarioId: number, reporteId: string) => {
  const lista = await listarReportes(usuarioId);
  const r = lista.find(x => x.id === reporteId);
  if (r && r.fileUri && Platform.OS !== 'web') {
    try { await FileSystem.deleteAsync(r.fileUri, { idempotent: true }); } catch {}
  }
  await AsyncStorage.setItem(STORAGE_KEY(usuarioId), JSON.stringify(lista.filter(x => x.id !== reporteId)));
};