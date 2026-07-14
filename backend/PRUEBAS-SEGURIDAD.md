# Sprint 9 · PoC Seguridad — Plan de pruebas

Cómo probar los 3 puntos de seguridad implementados y qué resultado debe dar cada uno.
Todos los comandos se ejecutan en **PowerShell**, desde la carpeta `backend/`.

> ⚠️ **Orden recomendado:** haz las pruebas en el orden de este documento.
> La prueba 3 (rate limiting) bloquea el login por 1 minuto, así que va al final.
> Tip: reiniciar el servidor (`Ctrl+C` y `npm run dev`) reinicia los contadores
> del rate limit si te bloqueas.

---

## 0. Preparación

### Si acabas de clonar el repo (setup desde cero)

`node_modules` ya no viene en el git — se instala con npm (las versiones exactas
están fijadas en `package-lock.json`). El archivo `backend/.env` con las
credenciales sí viene incluido, no hay que configurar nada:

```powershell
cd backend
npm install
cd ../yakult-app
npm install
```

También necesitas **XAMPP con MySQL**. Crea la base de datos vacía una sola vez
(en phpMyAdmin → Nueva → nombre `yakult_db`, o con este comando):

```powershell
C:\xampp\mysql\bin\mysql.exe -u root -e "CREATE DATABASE IF NOT EXISTS yakult_db"
```

Las tablas no hay que crearlas: el backend las crea solo al arrancar
(`ensureSchema`).

### Para cada sesión de pruebas

1. Arranca **MySQL en XAMPP** (panel de control → Start en MySQL).
2. Arranca el backend (desde `backend/`):
   ```powershell
   npm run dev
   ```
   Debe decir: `Servidor corriendo en http://localhost:3000`

---

## 1. Autenticación y Autorización (JWT)

### 1a. Sin token → rechazado

```powershell
curl.exe -s -o - -w "`nHTTP %{http_code}`n" http://localhost:3000/api/productos
```

**Resultado esperado:**
```
{"error":"Token de autenticación requerido."}
HTTP 401
```

### 1b. Con token válido → aceptado

Haz login con tu cuenta real (cambia correo y contraseña):

```powershell
$r = Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/auth/login -ContentType "application/json" -Body '{"correo":"TU-CORREO","contrasena":"TU-CONTRASENA"}'
$token = $r.token
curl.exe -s -o - -w "`nHTTP %{http_code}`n" http://localhost:3000/api/productos -H "Authorization: Bearer $token"
```

**Resultado esperado:** la lista de productos en JSON y `HTTP 200`.

### 1c. Autorización por rol (solo Master administra usuarios)

```powershell
curl.exe -s -o - -w "`nHTTP %{http_code}`n" http://localhost:3000/api/auth/usuarios -H "Authorization: Bearer $token"
```

**Resultado esperado según tu rol:**

| Rol de tu cuenta | Respuesta |
|---|---|
| Promotor / Repartidor | `{"error":"Se requiere rol Master."}` + `HTTP 403` |
| Master (correo `@upa.edu.mx`) | Lista de usuarios + `HTTP 200` |

### 1d. La app sigue funcionando normal

Abre la app Yakult, inicia sesión y navega (productos, órdenes, clientes…).
Todo debe cargar igual que antes: la app ya manda el token en cada petición.

> Nota de diseño: `POST /api/pagos/webhook` y `GET /api/pagos/retorno/...`
> quedan **públicos a propósito** — Mercado Pago los llama desde sus servidores
> sin nuestro token (el webhook se protege con su propia firma `x-signature`).

---

## 2. Validación estricta de montos (Mercado Pago)

Simula dos pagos "approved" directamente contra la lógica de confirmación,
sin necesidad de pagar de verdad:

```powershell
node pruebas/test-montos.js
```

**Resultado esperado:**
```
Caso 1 (monto exacto 150==150):   orden = Aprobado | pago = Aprobado ✅
Caso 2 (monto alterado 1!=150):   orden = Rechazado | pago = Rechazado ✅
Datos de prueba eliminados.
```

En esa misma terminal también aparece la alerta de seguridad:
```
[pagos] ⚠️ Monto no coincide en orden #X: MP cobró $1 pero la orden vale $150.00. Pago 999000222 marcado como Rechazado.
```

**Qué demuestra:** un pago aprobado por MP solo marca la orden como pagada si
`transaction_amount` coincide **exactamente** (al centavo) con `ordenes.total`.
Un monto manipulado queda registrado como `Rechazado` y la orden nunca se paga.

*(Opcional, prueba real: crea una orden en la app, genera el link de pago y paga
con la tarjeta de prueba de sandbox — como el monto sí coincide, la orden debe
quedar `Aprobado` igual que siempre.)*

---

## 3. Rate Limiting

### 3a. Límite global (100 peticiones / 15 min por IP)

Cualquier respuesta del servidor debe incluir los headers del limitador:

```powershell
curl.exe -s -I http://localhost:3000/ | Select-String "RateLimit"
```

**Resultado esperado (Remaining va bajando con cada petición):**
```
RateLimit-Policy: 100;w=900
RateLimit-Limit: 100
RateLimit-Remaining: 97
RateLimit-Reset: 900
```

### 3b. Límite estricto en login (5 / minuto) — simula fuerza bruta

```powershell
1..6 | ForEach-Object {
  $code = curl.exe -s -o "$env:TEMP\resp.json" -w "%{http_code}" -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{\"correo\":\"noexiste@test.com\",\"contrasena\":\"mala\"}'
  "intento ${_}: HTTP $code"
}
```

**Resultado esperado:** los primeros 5 intentos devuelven `401` (credenciales
malas) y el **6º devuelve `429`** con el mensaje
`{"error":"Demasiados intentos. Espera un minuto y vuelve a intentar."}`:

```
intento 1: HTTP 401
intento 2: HTTP 401
intento 3: HTTP 401
intento 4: HTTP 401
intento 5: HTTP 401
intento 6: HTTP 429
```

El mismo límite (5/min, con contador independiente por ruta) aplica en
`POST /api/auth/registro` y `POST /api/pagos/preferencia`.

Después de 1 minuto el bloqueo se libera solo.

---

## Resumen de resultados esperados

| # | Prueba | Esperado |
|---|---|---|
| 1a | GET protegido sin token | `401` |
| 1b | GET protegido con JWT | `200` |
| 1c | Ruta de Master con rol Promotor | `403` |
| 1d | App con sesión iniciada | Funciona igual que antes |
| 2 | `node pruebas/test-montos.js` | Caso 1 ✅ y Caso 2 ✅ |
| 3a | Headers `RateLimit-*` presentes | Sí, en toda respuesta |
| 3b | 6º login fallido en 1 min | `429` |

Si el límite global de 100/15 min estorba en la demo (mucha navegación),
sube `limit` en `server.js` (sección "Rate limiting").
