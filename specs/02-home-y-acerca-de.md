# SPEC 02 — Home y Acerca de

> **Estado:** Aprobado
> **Depende de:** SPEC 01
> **Fecha:** 2026-11-09
> **Objetivo:** Portar a Next.js el home (landing) y la página «Acerca de» de `references/templates/home-about/`, moviendo la biblioteca de `/` a `/biblioteca`.

---

## Por qué existe esta spec

SPEC 01 dejó la biblioteca en `/`, porque el prototipo usado entonces no tenía landing. El template `home-about` sí la trae (hero, beneficios, juegos, stats, actividad, precios y CTA final) y añade «Acerca de» con formulario de contacto. Para que el home sea la puerta de entrada del sitio, la biblioteca se mueve a `/biblioteca` y se reajustan los enlaces que hoy apuntan a `/`.

El diseño visual se toma tal cual del template. Según `CLAUDE.md`, cualquier decisión de UI que el template no cubra se resuelve con la skill `frontend-design`.

---

## Alcance

**Dentro:**

- Ruta `/` con el home: hero con siluetas flotantes, «¿Por qué Arcade Vault?» (4 tarjetas), «Juegos disponibles ahora» (6 mini-tarjetas), banda de stats (3 bloques), «Actividad en vivo» (últimas puntuaciones y top jugadores de hoy), «Precios» (plan único + 3 preguntas frecuentes) y CTA final.
- Ruta `/acerca-de` con la misión, 3 destacados, divisor animado y formulario de contacto con validación y terminal de éxito.
- Mover la biblioteca de `/` a `/biblioteca`, sin cambiar su contenido ni su comportamiento.
- Actualizar `Nav` (Inicio, Biblioteca, Salón de la Fama, Acerca de), el logo (apunta a `/`) y los enlaces «VOLVER AL VAULT» y de retorno tras auth, que pasan a `/biblioteca`.
- Animación de aparición al hacer scroll (`.reveal`) mediante un componente cliente.
- Datos simulados del home tipados en `lib/data.ts`: `RECENT_SCORES`, `TOP_TODAY` y `HOME_STATS`.
- Portar a `app/globals.css` los estilos del template que aún no existen (`home-*`, `about-*`, `.reveal`, `.mini-*`, `.feature-*`, `.activity-*`, `.pricing-*`, `.contact-*`, `.terminal-*`).

**Fuera de alcance (para otras specs):**

- Envío real del formulario de contacto: no hay API, correo ni persistencia. El estado de éxito es solo visual.
- Datos en vivo: «Actividad en vivo» y «Top jugadores · hoy» son estáticos; no hay polling ni websockets.
- Contadores calculados desde los datos: los stats («12+», «MILES», «GLOBAL») son texto fijo del template.
- Sesión de usuario: el nav sigue mostrando siempre «Iniciar Sesión» y `CRÉDITOS · 03` fijo.
- Páginas de legales, blog u otras secciones del footer.
- Tests automatizados (el repo no tiene framework de tests).

---

## Modelo de datos

Se amplía `lib/data.ts` (definido en SPEC 01). `GAMES`, `CATS` y `seededScores` no cambian.

```ts
export type RecentScore = {
  player: string;        // p. ej. "NEONFOX"
  game: string;          // título para mostrar, p. ej. "Caída"
  score: number;
  ago: string;           // ya formateado, p. ej. "hace 2 min"
  color: "cyan" | "magenta" | "yellow" | "green"; // clase neon-<color>
};

export type TopPlayer = { rank: number; player: string; score: number };

export type HomeStat = { n: string; unit: string; sub: string };

export const RECENT_SCORES: RecentScore[];   // 7 filas, del template
export const TOP_TODAY: TopPlayer[];         // 5 filas, del template
export const HOME_STATS: HomeStat[];         // 3 bloques, del template
```

Convenciones:

- Los textos de beneficios, FAQ y precios son contenido de maquetación y viven en el propio componente, no en `lib/data.ts`.
- «Juegos disponibles ahora» usa `GAMES.slice(0, 6)`.
- Números con `toLocaleString("es-ES")`, locale explícito.
- El formulario de contacto tiene estado local `{ name, email, msg }` y `sent: string | null`. No se exporta ni se guarda.

---

## Plan de implementación

Cada paso deja la app compilando y ejecutable.

1. Leer la guía relevante en `node_modules/next/dist/docs/` (App Router, `cacheComponents`, `Suspense`, `metadata`). Si no existe, ejecutar `pnpm install`.
2. Mover la biblioteca: crear `app/biblioteca/page.tsx` con el contenido y la `metadata` actuales de `app/page.tsx`. Cambiar a `/biblioteca` los enlaces de retorno en `components/hall-of-fame.tsx`, `components/game-player.tsx` y `components/auth-form.tsx`, y el criterio «activo» de la Biblioteca en `components/nav.tsx`. `/` sigue sirviendo la biblioteca hasta el paso 6.
3. Añadir en `lib/data.ts` los tipos y constantes `RecentScore`, `TopPlayer`, `HomeStat`, `RECENT_SCORES`, `TOP_TODAY` y `HOME_STATS`. Verificación: `pnpm lint` sin errores.
4. Portar a `app/globals.css` los bloques de `references/templates/home-about/styles.css` que no existan ya (`home-*`, `about-*`, `.reveal`, `.mini-*`, `.feature-*`, `.activity-*`, `.pricing-*`, `.contact-*`, `.terminal-*`, `.highlight-*`). Reutilizar `.field`, `.fade-in` y `@keyframes` ya presentes. Verificación: la app compila y la biblioteca no cambia de aspecto.
5. Crear `components/reveal.tsx` (client): envuelve un elemento con clase `reveal` y le añade `in` con `IntersectionObserver` (umbral 0.12, una sola vez). Si el usuario tiene `prefers-reduced-motion: reduce`, añade `in` de inmediato.
6. Reemplazar `app/page.tsx` por el home: `components/home/floating-silhouettes.tsx` y `components/home/feature-icon.tsx` (server), `components/home/mini-card.tsx` (`Link` a `/juegos/<id>`) y las 6 secciones, con los CTA como `Link` con clase `btn`. Verificación: `/` muestra el home y `/biblioteca` la biblioteca.
7. Crear `app/acerca-de/page.tsx`, `components/home/highlight-icon.tsx` y `components/contact-form.tsx` (client): campos vacíos → clase `shake` 400 ms sin enviar; campos completos → terminal de éxito con «GRACIAS, {NOMBRE EN MAYÚSCULAS}.» y botón «ENVIAR OTRO MENSAJE» que limpia el formulario.
8. Actualizar `components/nav.tsx` y su panel móvil: enlaces Inicio (`/`), Biblioteca (`/biblioteca`), Salón de la Fama (`/salon`) y Acerca de (`/acerca-de`); logo a `/`. Inicio solo activo en `/`; Biblioteca activa en `/biblioteca` y `/juegos/*`.
9. Definir `metadata` de `/` y `/acerca-de` (títulos propios) y revisar el responsive a 390 px y 1280 px.

---

## Criterios de aceptación

- [ ] `pnpm lint` y `pnpm build` terminan sin errores.
- [ ] `/` muestra, en orden: hero, «¿POR QUÉ ARCADE VAULT?», «JUEGOS DISPONIBLES AHORA», banda de stats, «ACTIVIDAD EN VIVO», «PRECIOS» y «¿LISTO PARA JUGAR?».
- [ ] El hero muestra «EL ARCADE / CLÁSICO ESTÁ / DE VUELTA», 8 siluetas flotantes decorativas ocultas a lectores de pantalla (`aria-hidden`) y el indicador «DESLIZA».
- [ ] «EXPLORAR JUEGOS», «VER TODOS LOS JUEGOS →» e «INSERTAR MONEDA →» llevan a `/biblioteca`.
- [ ] «CREAR CUENTA» y «EMPEZAR GRATIS →» llevan a `/auth`; «VER SALÓN →» lleva a `/salon`.
- [ ] «¿POR QUÉ ARCADE VAULT?» muestra 4 tarjetas con icono: JUEGOS CLÁSICOS, 100% GRATIS, LADDER BOARDS y SIEMPRE CRECIENDO.
- [ ] «JUEGOS DISPONIBLES AHORA» muestra 6 mini-tarjetas; pulsar una navega a `/juegos/<id>` de ese juego.
- [ ] La banda de stats muestra 3 bloques: «12+ JUEGOS», «MILES DE PARTIDAS» y «GLOBAL RANKING».
- [ ] «ÚLTIMAS PUNTUACIONES» muestra 7 filas; la primera es NEONFOX, Caída, `+184.220`, «hace 2 min».
- [ ] «TOP JUGADORES · HOY» muestra 5 filas; `#01`, `#02` y `#03` tienen las clases `top1`, `top2` y `top3`; la primera marca `312.840`.
- [ ] «PRECIOS» muestra la tarjeta «JUGADOR VAULT» con `$0 / SIEMPRE`, 6 ventajas con ✔ y 3 preguntas frecuentes.
- [ ] Las secciones con `.reveal` quedan ocultas al cargar y reciben la clase `in` al entrar en pantalla; con `prefers-reduced-motion: reduce` todas son visibles desde el inicio.
- [ ] `/biblioteca` muestra el mismo contenido y comportamiento que tenía `/` en SPEC 01 (8 tarjetas, búsqueda, chips, «NO HAY RESULTADOS»).
- [ ] «VOLVER AL VAULT» en `/salon` y en el modal del reproductor lleva a `/biblioteca`.
- [ ] Enviar el formulario de `/auth` o pulsar «JUGAR COMO INVITADO» navega a `/biblioteca`.
- [ ] `/acerca-de` muestra «ACERCA DE ARCADE VAULT», la misión, 3 destacados, el divisor de 24 píxeles y el formulario con NOMBRE, CORREO ELECTRÓNICO y MENSAJE.
- [ ] Enviar `/acerca-de` con cualquier campo vacío (o solo espacios) añade la clase `shake` durante 400 ms y no muestra el éxito.
- [ ] Enviar `/acerca-de` con los 3 campos completos muestra «VAULT-OS // TERMINAL» y «MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS, <NOMBRE EN MAYÚSCULAS>.».
- [ ] «ENVIAR OTRO MENSAJE» vuelve al formulario con los 3 campos vacíos.
- [ ] El nav muestra Inicio, Biblioteca, Salón de la Fama y Acerca de; el logo navega a `/`.
- [ ] El enlace activo se resalta así: Inicio en `/`; Biblioteca en `/biblioteca` y `/juegos/*`; Salón en `/salon`; Acerca de en `/acerca-de`.
- [ ] A 390 px de ancho el panel móvil contiene los mismos 4 enlaces más «Iniciar Sesión», y no hay scroll horizontal en `/` ni en `/acerca-de`.
- [ ] La consola del navegador no muestra errores de hidratación en `/`, `/acerca-de` y `/biblioteca`.
- [ ] No se escribe nada en localStorage ni en cookies, y el formulario de contacto no realiza ninguna petición de red.

---

## Decisiones tomadas y descartadas

- **Sí:** incluir «Acerca de» en esta spec. Comparte carpeta de template, estilos, animación `.reveal` y entrada del nav con el home.
- **No:** dividirla en dos specs. El usuario prefirió una sola, a costa de una spec más grande.
- **Sí:** mover la biblioteca a `/biblioteca` y que `/` sea el home. Es lo que hace el template y deja el home como puerta de entrada.
- **No:** dejar la biblioteca en `/` y el home en `/inicio`. Evita tocar rutas, pero el logo y la URL raíz no llevarían a la landing.
- **Sí:** el retorno tras auth y «VOLVER AL VAULT» van a `/biblioteca`. Se corrige así lo que SPEC 01 fijó en `/`; esta spec reemplaza esos criterios de SPEC 01.
- **No:** que auth redirija al home. Quien se registra o entra como invitado ya vio la landing y quiere jugar.
- **Sí:** datos del home tipados en `lib/data.ts`. Mismo criterio que SPEC 01: se sustituyen por un backend sin tocar la pantalla.
- **No:** hardcodear las filas de actividad en el componente. Mezcla contenido con maquetación.
- **Sí:** los stats («12+ JUEGOS») se mantienen como texto del template aunque `GAMES` tenga 8. Son un mensaje de marketing, no un conteo calculado.
- **Sí:** `.reveal` mediante un componente cliente `components/reveal.tsx`. Las páginas siguen siendo Server Components y solo la animación y el formulario llevan `"use client"`.
- **No:** el hook global `useReveal` con `document.querySelectorAll` del template. Va contra el modelo de React y no funciona con SSR.
- **Sí:** el formulario de contacto solo simula el envío. Coherente con «solo la parte visual»; el envío real va en otra spec.
- **Sí:** CTAs como `Link` con clase `btn` en lugar de `<button onClick>`. Habilita prefetch, clic central y accesibilidad nativa.
- **Sí:** reutilizar las clases CSS del template portadas a `app/globals.css`. No se reescriben los estilos ni se migran a utilidades de Tailwind.
- **Sí:** respetar `prefers-reduced-motion` en `.reveal`. El template no lo hacía.

---

## Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| Las secciones `.reveal` quedan invisibles si falla JavaScript o antes de hidratar | Regla CSS que las muestra con `@media (scripting: none)` y con `prefers-reduced-motion: reduce`; el componente añade `in` al montar si el observer no está disponible. |
| Mover `/` a `/biblioteca` deja enlaces rotos o apuntando al home | El paso 2 lista los enlaces afectados (`hall-of-fame`, `game-player`, `auth-form`, `nav`); verificación con búsqueda de `href="/"` y `router.push("/")` antes de cerrar. |
| Colisión entre clases del template y las ya existentes en `globals.css` (`.field`, `.fade-in`, `@keyframes`) | El paso 4 revisa duplicados antes de pegar y reutiliza lo existente en lugar de redefinirlo. |
| Next.js 16 con `cacheComponents` cambia el acceso a datos dinámicos | El paso 1 lee la guía local; el home y «Acerca de» solo usan datos estáticos, sin APIs dinámicas. |
| `toLocaleString("es-ES")` distinto entre Node y navegador | Usar siempre el locale explícito `"es-ES"`, nunca el del entorno. |
| El formulario muestra el nombre en la terminal sin sanear | React escapa el texto por defecto; no se usa `dangerouslySetInnerHTML`. |

---

## Lo que **no** está en esta spec

- Envío real del formulario de contacto (API, correo, base de datos).
- Datos en vivo o reales para actividad, ranking de hoy y stats.
- Sesión de usuario, registro real u OAuth.
- Contador de créditos funcional.
- Páginas legales, blog u otras secciones.
- Tests automatizados.

Cada uno de estos puntos, si se aborda, va en su propia spec.
