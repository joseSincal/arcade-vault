# SPEC 03 — Envío de correo del formulario de contacto

> **Estado:** Implementado
> **Depende de:** SPEC 02
> **Fecha:** 2026-11-12
> **Objetivo:** Hacer que el formulario de contacto de `/acerca-de` envíe un correo real mediante Resend desde una Server Action, con estados de carga y error, honeypot y validación en servidor.

---

## Por qué existe esta spec

SPEC 02 dejó el formulario de contacto como una simulación: el estado de éxito era solo visual y no había API, correo ni persistencia. Esta spec reemplaza ese comportamiento por un envío real. Dos criterios de SPEC 02 dejan de valer: «el formulario de contacto no realiza ninguna petición de red» y «el éxito se muestra al completar los 3 campos». Ahora el éxito solo aparece si Resend confirma el envío.

---

## Alcance

**Dentro:**

- Server Action `sendContactMessage` en `app/acerca-de/actions.ts` que valida los datos y envía el correo con el SDK `resend`.
- Dependencia `resend` en `package.json` (instalada con `pnpm add resend`).
- Variables de entorno `RESEND_API_KEY`, `CONTACT_TO_EMAIL` y `CONTACT_FROM_EMAIL`, documentadas en `.env.example`. Los valores reales viven en `.env.local`, que no se versiona.
- Remitente por defecto `onboarding@resend.dev` cuando `CONTACT_FROM_EMAIL` no está definida.
- Correo en texto plano con el nombre, el correo y el mensaje del visitante. `replyTo` es el correo del visitante.
- Cambios en `components/contact-form.tsx`:
  - llamada a la Server Action;
  - estado de carga (botón deshabilitado con «▶ ENVIANDO…»);
  - mensaje de error en estilo terminal si el envío falla;
  - campo honeypot oculto.
- Validación en servidor: campos obligatorios, formato de correo y longitudes máximas (nombre 80, correo 254, mensaje 2000).
- Honeypot anti-spam: si el campo oculto llega con valor, la acción responde éxito sin enviar nada.

**Fuera de alcance (para otras specs):**

- Rate limiting por IP (requiere almacenamiento externo, p. ej. Upstash).
- Captcha o verificación de bots más allá del honeypot.
- Dominio propio verificado en Resend. Con `onboarding@resend.dev` Resend solo entrega al correo de la cuenta; migrar a un dominio propio es solo cambiar `CONTACT_FROM_EMAIL` y `CONTACT_TO_EMAIL`.
- Guardar los mensajes en una base de datos o panel de administración.
- Correo de confirmación al visitante.
- Plantillas HTML o React Email: el correo es texto plano.
- Tests automatizados (el repo no tiene framework de tests).

---

## Modelo de datos

No se persiste nada. Solo se tipan la entrada y la respuesta de la Server Action, en `app/acerca-de/actions.ts`.

```ts
export type ContactInput = {
  name: string;     // obligatorio, máx. 80 tras trim
  email: string;    // obligatorio, formato válido, máx. 254
  msg: string;      // obligatorio, máx. 2000 tras trim
  website: string;  // honeypot: debe llegar vacío
};

export type ContactResult =
  | { ok: true; name: string }                       // name sirve para «GRACIAS, {NOMBRE}.»
  | { ok: false; error: "validation" | "send" };     // "send": Resend falló o falta configuración
```

Variables de entorno (solo servidor, sin prefijo `NEXT_PUBLIC_`):

```
RESEND_API_KEY=        # obligatoria
CONTACT_TO_EMAIL=      # obligatoria: destino de los mensajes
CONTACT_FROM_EMAIL=    # opcional, por defecto onboarding@resend.dev
```

Convenciones:

- El asunto es fijo: `Arcade Vault · Nuevo mensaje de contacto`. El nombre del visitante no entra en el asunto, así se evita la inyección de cabeceras.
- El correo usa `text`, nunca `html`, para no interpretar contenido del visitante.
- La acción no devuelve detalles internos de Resend al cliente. El detalle se registra con `console.error` en el servidor.

---

## Plan de implementación

Cada paso deja la app compilando y ejecutable.

1. Leer la guía de Server Actions y `cacheComponents` en `node_modules/next/dist/docs/`. Si no existe, ejecutar `pnpm install`. Confirmar que `.gitignore` ignora `.env.local` y no ignora `.env.example`; si lo ignora, añadir `!.env.example`.
2. Instalar el SDK con `pnpm add resend` y crear `.env.example` con las tres variables y comentarios. Verificación: `pnpm build` termina sin errores.
3. Crear `app/acerca-de/actions.ts` con `"use server"`, los tipos `ContactInput` y `ContactResult` y una acción que por ahora solo valida (campos obligatorios, formato de correo, longitudes) y responde `{ ok: true, name }`. Verificación: `pnpm exec eslint app components lib` sin errores.
4. Añadir a la acción el honeypot (si `website` trae valor, responde `{ ok: true, name }` sin enviar) y el envío con Resend: lee las variables de entorno, llama a `resend.emails.send` con `from`, `to`, `replyTo`, asunto fijo y `text`. Si falta `RESEND_API_KEY` o `CONTACT_TO_EMAIL`, o Resend devuelve `error`, responde `{ ok: false, error: "send" }` y registra el detalle. Verificación: con `.env.local` configurado, llamar la acción desde el formulario entrega un correo.
5. Actualizar `components/contact-form.tsx`:
   - Añadir el campo `website` (honeypot) con `tabIndex={-1}`, `autoComplete="off"` y un contenedor oculto con `aria-hidden`.
   - Invocar la acción dentro de `useTransition`. Mientras `isPending`, el botón queda deshabilitado con «▶ ENVIANDO…».
   - Conservar la validación del cliente (`shake` 400 ms con campos vacíos) como primera barrera.
   - Mostrar el terminal de éxito solo con `ok: true`.
   - Con `ok: false`, conservar los datos escritos y mostrar encima del botón una línea de error en estilo terminal.
6. Añadir a `app/globals.css` el estilo mínimo para la línea de error (`.contact-error`, reutilizando los tokens de color existentes) y el ocultamiento visual del honeypot (`.hp-field`). Verificación en el navegador a 390 px y 1280 px.

---

## Criterios de aceptación

- [ ] `pnpm build` termina sin errores y `pnpm exec eslint app components lib` no reporta errores.
- [ ] `package.json` incluye `resend` y existe `.env.example` con `RESEND_API_KEY`, `CONTACT_TO_EMAIL` y `CONTACT_FROM_EMAIL` sin valores reales.
- [ ] `.env.local` no aparece en `git status` y ninguna clave ni correo real está en el repo.
- [ ] Enviar `/acerca-de` con los 3 campos válidos y credenciales correctas entrega un correo a `CONTACT_TO_EMAIL` con el nombre, el correo y el mensaje del visitante en texto plano.
- [ ] Al responder ese correo, el destinatario por defecto es el correo escrito por el visitante (`replyTo`).
- [ ] Tras el envío real se muestra «VAULT-OS // TERMINAL» y «MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS, <NOMBRE EN MAYÚSCULAS>.».
- [ ] Durante el envío el botón está deshabilitado y muestra «▶ ENVIANDO…».
- [ ] Con `RESEND_API_KEY` inválida o ausente se muestra una línea de error en el formulario, no el terminal de éxito, y los datos escritos se conservan.
- [ ] Con algún campo vacío o solo espacios se aplica la clase `shake` durante 400 ms y no se llama a la acción.
- [ ] Llamar la acción con un correo sin formato válido, un nombre de más de 80 caracteres o un mensaje de más de 2000 devuelve `{ ok: false, error: "validation" }` y no envía correo.
- [ ] Con el honeypot `website` relleno la acción responde `{ ok: true, name }` y no se envía ningún correo.
- [ ] El campo honeypot no es visible, no recibe foco con Tab y no es anunciado por lectores de pantalla.
- [ ] «ENVIAR OTRO MENSAJE» vuelve al formulario con los 3 campos vacíos.
- [ ] `RESEND_API_KEY` no aparece en el JavaScript enviado al navegador ni en las respuestas de red.
- [ ] La consola del navegador no muestra errores de hidratación en `/acerca-de`.

---

## Decisiones tomadas y descartadas

- **Sí:** Server Action. No hay ruta API extra y la clave de Resend nunca llega al cliente.
- **No:** Route Handler `POST /api/contact`. Solo aportaría valor si otro cliente consumiera el endpoint.
- **Sí:** destinatario en `CONTACT_TO_EMAIL`. No deja ningún correo en el repo y se cambia sin tocar código.
- **No:** correo fijo en el código. Expone el correo en el repositorio y exige un commit para cambiarlo.
- **Sí:** remitente `onboarding@resend.dev` por defecto, configurable con `CONTACT_FROM_EMAIL`. No requiere dominio para empezar; la limitación de entrega queda documentada en el alcance.
- **No:** exigir dominio propio verificado ahora. Bloquearía el desarrollo por una tarea de DNS.
- **Sí:** correo en texto plano y asunto fijo. Evita interpretar HTML del visitante y la inyección de cabeceras por el nombre.
- **Sí:** `replyTo` con el correo del visitante, para responder desde el cliente de correo sin copiar y pegar.
- **Sí:** el éxito solo se muestra si el envío fue real. Un éxito simulado sobre un fallo real haría perder mensajes sin que nadie lo sepa.
- **Sí:** honeypot. Frena bots simples sin dependencias ni fricción para el usuario; ante un bot responde éxito para no darle pistas.
- **Sí:** validación en servidor además de la del cliente. La del cliente es comodidad; la del servidor es la que protege.
- **No:** rate limiting en esta spec. Requiere almacenamiento externo y es una decisión de infraestructura aparte.
- **No:** mensaje de error con detalles de Resend. Se registra en el servidor y el cliente recibe un error genérico.
- **Sí:** mantener la validación de cliente con `shake` de SPEC 02, para no cambiar la UX de los campos vacíos.

---

## Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| Con `onboarding@resend.dev` Resend rechaza destinatarios distintos al correo de la cuenta | Documentado en `.env.example`; en desarrollo `CONTACT_TO_EMAIL` debe ser el correo de la cuenta de Resend. Para producción se cambia a un dominio verificado. |
| Falta `RESEND_API_KEY` o `CONTACT_TO_EMAIL` en el despliegue | La acción responde `{ ok: false, error: "send" }` con un error genérico y registra la causa en el servidor; nunca muestra éxito. |
| Spam o abuso de la acción (sin rate limiting) | El honeypot y los límites de longitud reducen el ruido; el rate limiting queda para otra spec y el riesgo se acepta de forma explícita. |
| Fuga de la API key al cliente | La variable no lleva prefijo `NEXT_PUBLIC_` y solo se lee dentro de la Server Action; hay un criterio de aceptación que lo verifica. |
| Next.js 16 con `cacheComponents` cambia el modelo de las acciones y del acceso a datos dinámicos | El paso 1 lee la guía local antes de escribir código. |
| Contenido del visitante con saltos de línea o HTML | Se envía como `text`, el asunto es fijo y React escapa el nombre en el terminal de éxito. |

---

## Lo que **no** está en esta spec

- Rate limiting por IP.
- Captcha o verificación avanzada de bots.
- Dominio propio verificado en Resend.
- Persistencia de mensajes o panel de administración.
- Correo de confirmación al visitante y plantillas HTML.
- Tests automatizados.

Cada uno de estos puntos, si se aborda, va en su propia spec.
