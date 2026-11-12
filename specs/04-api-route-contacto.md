# SPEC 04 — Envío del formulario de contacto mediante API Route

> **Estado:** Implementado
> **Depende de:** SPEC 03
> **Fecha:** 2026-11-12
> **Objetivo:** Migrar el envío del formulario de contacto de la Server Action `sendContactMessage` a un Route Handler `POST /api/contact`, que el formulario consume con `fetch`, sin cambiar lo que ve el visitante ni el correo que recibe el equipo.

---

## Por qué existe esta spec

SPEC 03 resolvió el envío con una Server Action y descartó de forma explícita el Route Handler porque «solo aportaría valor si otro cliente consumiera el endpoint». Esa decisión se revierte: se quiere procesar el envío desde una ruta de servidor (API Route) con una URL estable y un contrato HTTP propio. Esta spec reemplaza el mecanismo de transporte de SPEC 03 y deja intacto todo lo demás: validación, honeypot, correo en texto plano, variables de entorno y experiencia de usuario.

La SPEC 03 se conserva sin cambios como historial. Los criterios de SPEC 03 que mencionan la Server Action (`sendContactMessage`, `{ ok, error }` devueltos por la acción) dejan de valer y los sustituyen los de esta spec.

---

## Alcance

**Dentro:**

- Route Handler `POST` en `app/api/contact/route.ts` que:
  - lee el cuerpo JSON;
  - valida los datos (misma lógica que SPEC 03);
  - aplica el honeypot;
  - envía el correo con Resend (mismo contenido que SPEC 03);
  - responde con un código HTTP y un JSON.
- Módulo compartido `lib/contact.ts` con los tipos `ContactInput` y `ContactResult`, los límites de longitud y la función de validación, para que no se dupliquen entre cliente y servidor.
- Verificación de origen: la ruta rechaza con 403 las peticiones cuyo `Origin` no coincida con el host de la propia petición. Compensa que una API Route no tiene la protección contra CSRF que las Server Actions traen incorporada.
- Cambios en `components/contact-form.tsx`:
  - sustituir la llamada a `sendContactMessage` por `fetch("/api/contact", { method: "POST", … })`;
  - conservar `useTransition`, el estado de carga, el `shake`, el honeypot, el terminal de éxito y la línea de error exactamente como en SPEC 03.
- Eliminar `app/acerca-de/actions.ts` para no dejar dos caminos de envío.
- Las variables de entorno y `.env.example` no cambian.

**Fuera de alcance (para otras specs):**

- Rate limiting por IP.
- Captcha o verificación de bots más allá del honeypot.
- Dominio propio verificado en Resend.
- Guardar los mensajes en una base de datos.
- Correo de confirmación al visitante y plantillas HTML.
- Consumir el endpoint desde clientes externos (CORS abierto, autenticación por token, documentación pública de la API).
- Tests automatizados (el repo no tiene framework de tests).

---

## Modelo de datos

No se persiste nada. Los tipos pasan de `app/acerca-de/actions.ts` a `lib/contact.ts`, sin cambios de forma:

```ts
export type ContactInput = {
  name: string;     // obligatorio, máx. 80 tras trim
  email: string;    // obligatorio, formato válido, máx. 254
  msg: string;      // obligatorio, máx. 2000 tras trim
  website: string;  // honeypot: debe llegar vacío
};

export type ContactResult =
  | { ok: true; name: string }
  | { ok: false; error: "validation" | "send" | "origin" };
```

Contrato HTTP de `POST /api/contact`:

| Situación | Código | Cuerpo |
| --- | --- | --- |
| Envío correcto | 200 | `{ "ok": true, "name": "<nombre>" }` |
| Honeypot relleno | 200 | `{ "ok": true, "name": "<nombre>" }`, sin enviar correo |
| Cuerpo no es JSON, no es un objeto o falla la validación | 400 | `{ "ok": false, "error": "validation" }` |
| `Origin` presente y distinto del host de la petición | 403 | `{ "ok": false, "error": "origin" }` |
| Falta `RESEND_API_KEY` o `CONTACT_TO_EMAIL`, o Resend falla | 500 | `{ "ok": false, "error": "send" }` |
| Método distinto de `POST` | 405 | Lo resuelve Next.js al exportar solo `POST` |

Convenciones (se mantienen de SPEC 03):

- Asunto fijo `Arcade Vault · Nuevo mensaje de contacto`; el correo usa `text`, nunca `html`; `replyTo` es el correo del visitante.
- La respuesta nunca incluye detalles internos de Resend; el detalle se registra con `console.error` en el servidor.
- La respuesta lleva `Cache-Control: no-store`.

Variables de entorno: sin cambios (`RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL`), solo servidor y sin prefijo `NEXT_PUBLIC_`.

---

## Plan de implementación

Cada paso deja la app compilando y ejecutable.

1. Leer en `node_modules/next/dist/docs/` la guía de Route Handlers y cómo les afecta `cacheComponents`. Confirmar que un `POST` no se cachea y cómo se lee el `Origin` desde `Request`.
2. Crear `lib/contact.ts` con los tipos, las constantes de longitud y una función pura `validateContact(input: unknown)` que devuelva los datos limpios (con `trim`) o `null`. Mover ahí la lógica de validación de `actions.ts`, sin cambiar el comportamiento. Verificación: `pnpm exec eslint app components lib` sin errores.
3. Crear `app/api/contact/route.ts` con `export async function POST(request: Request)`:
   - comprobar el `Origin` (403 si no coincide);
   - leer el JSON dentro de `try/catch` (400 si falla);
   - validar con `validateContact` (400);
   - aplicar el honeypot (200 sin enviar);
   - enviar con Resend con la misma lógica de `actions.ts` (500 si falta configuración o falla);
   - devolver siempre `Response.json(...)` con `Cache-Control: no-store`.

   Verificación: con el servidor de desarrollo, una petición `POST` con datos inválidos responde 400 y una con el honeypot relleno responde 200, sin enviar correo.
4. Cambiar `components/contact-form.tsx` para llamar a `fetch("/api/contact")` dentro de la misma `useTransition`. Tratar como error `send` cualquier fallo de red, respuesta no JSON o `ok: false`. Importar los tipos desde `lib/contact.ts`. Conservar el resto del componente. Verificación: `pnpm exec eslint app components lib` sin errores.
5. Eliminar `app/acerca-de/actions.ts` y comprobar con una búsqueda que no queda ninguna referencia a `sendContactMessage` ni a `acerca-de/actions`. Verificación: `pnpm build` termina sin errores y la ruta `/api/contact` aparece en la salida.
6. Verificación en el navegador a 390 px y 1280 px: éxito, estado de carga, error (bloqueando la petición) y reset. Contar como máximo un correo real durante las pruebas.

---

## Criterios de aceptación

- [ ] `pnpm build` termina sin errores, `pnpm exec eslint app components lib` no reporta errores y `/api/contact` aparece en la salida del build.
- [ ] Existen `app/api/contact/route.ts` y `lib/contact.ts`, y no existe `app/acerca-de/actions.ts`. No queda ninguna referencia a `sendContactMessage`.
- [ ] `.env.local`/`.env` no aparecen en `git status` y ninguna clave ni correo real está en el repo.
- [ ] Enviar `/acerca-de` con los 3 campos válidos y credenciales correctas entrega un correo a `CONTACT_TO_EMAIL` con el nombre, el correo y el mensaje del visitante en texto plano, `replyTo` igual al correo del visitante y el asunto fijo.
- [ ] Tras el envío real se muestra «VAULT-OS // TERMINAL» y «MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS, <NOMBRE EN MAYÚSCULAS>.».
- [ ] Durante el envío el botón está deshabilitado y muestra «▶ ENVIANDO…».
- [ ] Con `RESEND_API_KEY` ausente o inválida la ruta responde 500 con `{ ok: false, error: "send" }`, el formulario muestra la línea de error, no el terminal de éxito, y los datos escritos se conservan.
- [ ] Un fallo de red o una respuesta que no es JSON también muestra la línea de error y conserva los datos.
- [ ] Con algún campo vacío o solo espacios se aplica la clase `shake` durante 400 ms y no se hace ninguna petición a `/api/contact`.
- [ ] `POST /api/contact` con un correo sin formato válido, un nombre de más de 80 caracteres o un mensaje de más de 2000 responde 400 con `{ ok: false, error: "validation" }` y no envía correo.
- [ ] `POST /api/contact` con un cuerpo que no es JSON, o JSON que no es un objeto, responde 400 y no lanza una excepción en el servidor.
- [ ] `POST /api/contact` con el honeypot `website` relleno responde 200 con `{ ok: true, name }` y no envía ningún correo.
- [ ] `POST /api/contact` con un `Origin` ajeno al host responde 403 y no envía correo; una petición sin `Origin` o con el mismo origen no se bloquea.
- [ ] `GET /api/contact` responde 405.
- [ ] La respuesta de `/api/contact` lleva `Cache-Control: no-store`.
- [ ] El campo honeypot no es visible, no recibe foco con Tab y no es anunciado por lectores de pantalla.
- [ ] «ENVIAR OTRO MENSAJE» vuelve al formulario con los campos vacíos.
- [ ] `RESEND_API_KEY` no aparece en el JavaScript enviado al navegador ni en las respuestas de red.
- [ ] La consola del navegador no muestra errores de hidratación en `/acerca-de`.

---

## Decisiones tomadas y descartadas

- **Sí:** Route Handler `POST /api/contact`. Da una URL estable y un contrato HTTP explícito (códigos 200, 400, 403, 500), y es la decisión que se pidió. Revierte la decisión de SPEC 03.
- **No:** mantener la Server Action junto a la ruta. Dos caminos de envío duplican la lógica y la superficie de ataque.
- **Sí:** eliminar `actions.ts`. Se llega a lo mismo con una sola implementación y sin código muerto.
- **Sí:** mover tipos, límites y validación a `lib/contact.ts`. Un solo lugar para las reglas y tipos compartidos entre la ruta y el formulario, sin importar nada de servidor desde el cliente.
- **Sí:** verificar el `Origin` en la ruta. Las Server Actions comparan `Origin` y `Host` por sí solas; una API Route no, y sin esta comprobación cualquier página externa podría hacer que el navegador de un visitante envíe correos por la ruta. No sustituye al rate limiting, que sigue fuera de alcance.
- **No:** CORS abierto ni autenticación por token. No hay otro cliente que consuma la ruta; si aparece, será otra spec.
- **Sí:** códigos HTTP semánticos (400, 403, 500) con el mismo JSON de error que en SPEC 03. El cliente sigue distinguiendo `validation` y `send`.
- **Sí:** el honeypot responde 200 con éxito, igual que en SPEC 03, para no darle pistas al bot.
- **Sí:** respuesta con `Cache-Control: no-store`. Es una mutación y no debe cachearse en ningún nivel.
- **Sí:** el resto de decisiones de SPEC 03 (texto plano, asunto fijo, `replyTo`, éxito solo si el envío fue real, validación en servidor, validación de cliente con `shake`, sin rate limiting) se mantienen sin cambios.

---

## Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| La API Route no tiene la protección contra CSRF de las Server Actions | Comprobación de `Origin` contra el host de la petición (403) y criterio de aceptación que la verifica. |
| La ruta es pública y se puede llamar sin pasar por la UI | El honeypot, la validación y los límites de longitud reducen el ruido; el rate limiting sigue fuera de alcance y el riesgo se acepta de forma explícita, igual que en SPEC 03. |
| Cuerpo mal formado hace que la ruta lance una excepción y responda 500 sin control | `request.json()` dentro de `try/catch`; la validación acepta `unknown` y devuelve 400. |
| `cacheComponents` o el caché de rutas afectan a la respuesta del `POST` | El paso 1 lee la guía local; la respuesta lleva `no-store` y un criterio de aceptación lo verifica. |
| Fuga de la API key al cliente | La variable solo se lee en `route.ts`; el cliente no importa nada de servidor y un criterio de aceptación revisa el bundle y las respuestas. |
| Duplicar o perder la lógica de validación al moverla | Se mueve a `lib/contact.ts` sin cambiar el comportamiento, y los criterios repiten los casos de validación de SPEC 03 contra la nueva ruta. |
| Probar el envío real consume correos y satura la bandeja | Las pruebas de error se hacen bloqueando la petición en el navegador; el paso 6 limita a un correo real. |

---

## Lo que **no** está en esta spec

- Rate limiting por IP.
- Captcha o verificación avanzada de bots.
- Dominio propio verificado en Resend.
- Persistencia de mensajes o panel de administración.
- Correo de confirmación al visitante y plantillas HTML.
- CORS, autenticación por token o documentación pública de la API.
- Tests automatizados.

Cada uno de estos puntos, si se aborda, va en su propia spec.
