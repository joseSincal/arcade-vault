# SPEC 01 — MVP visual: todas las pantallas de Arcade Vault

> **Estado:** Aprobado
> **Depende de:** ninguna
> **Fecha:** 2026-10-30
> **Objetivo:** Portar a Next.js (App Router, TypeScript) las 5 pantallas de `references/templates/` (biblioteca, detalle, reproductor, salón de la fama y auth) con datos simulados y sin implementar ningún juego.

---

## Por qué existe esta spec

El repo solo tiene el scaffold de Create Next App y el tema (`app/globals.css`, fuentes y fondo en `app/layout.tsx`). El diseño ya existe como prototipo React en `references/templates/` (SPA con estado `route` y scripts `.jsx` globales). Esta spec lo convierte en el MVP visual real, para que las siguientes specs (juegos, puntajes, backend) se enchufen sobre pantallas ya hechas.

El diseño visual se toma tal cual del template. Según `CLAUDE.md`, cualquier decisión de UI que el template no cubra se resuelve con la skill `frontend-design`.

---

## Alcance

**Dentro:**

- Rutas del App Router: `/` (biblioteca), `/juegos/[id]` (detalle), `/juegos/[id]/jugar` (reproductor), `/salon` (salón de la fama), `/auth` (iniciar sesión / crear cuenta).
- `Nav` (con menú móvil), footer y fondo compartidos desde `app/layout.tsx`.
- Datos simulados tipados en `lib/data.ts`: `GAMES`, `CATS`, `PLAYERS` y `seededScores`, portados de `data.jsx`.
- Biblioteca con búsqueda por nombre, filtro por categoría, tarjetas con efecto tilt y estado "sin resultados".
- Detalle de juego con portada, etiquetas, estadísticas, tabla "Mejores puntuaciones" y botones de acción.
- Reproductor con HUD, marco CRT, arena decorativa, puntaje simulado que sube solo, pausa, fin de partida y modal "FIN DEL JUEGO".
- Salón de la fama con pestañas por juego, podio (top 3) y tabla de posiciones.
- Pantalla de auth con pestañas (iniciar sesión / crear cuenta), campos, "Jugar como invitado" y botones sociales.
- Pantalla 404 para ids de juego inexistentes.

**Fuera de alcance (para otras specs):**

- Cualquier juego real: lógica, canvas, entrada de teclado o táctil.
- Autenticación real o simulada: sin sesión, sin `av_user`, sin cookies ni localStorage.
- Persistencia de puntajes: guardar puntuación en el modal solo muestra el aviso, no guarda nada.
- La fila "TU MEJOR MARCA" del salón (depende de tener usuario).
- Backend, base de datos, API routes y OAuth real con Google o GitHub.
- Tests automatizados (el repo no tiene framework de tests).
- Contador de créditos funcional (queda como texto fijo `CRÉDITOS · 03`).

---

## Modelo de datos

Portado de `references/templates/data.jsx` con tipos. Vive en `lib/data.ts`.

```ts
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type CoverId =
  | "cover-bricks" | "cover-tetro" | "cover-snake" | "cover-glot"
  | "cover-invaders" | "cover-rocas" | "cover-rana" | "cover-duelo";

export type Game = {
  id: string;            // slug de la URL, p. ej. "bloque-buster"
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: CoverId;        // clase CSS ya definida en globals.css
  color: "cyan" | "magenta" | "yellow" | "green";
  best: number;
  plays: string;         // ya formateado, p. ej. "12.4K"
};

export type ScoreRow = { rank: number; name: string; score: number; date: string };

export const CATS = ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"] as const;
export const GAMES: Game[];                                  // los 8 juegos del template
export function seededScores(seed: number, count?: number): ScoreRow[];
```

Convenciones:

- `seededScores` es determinista (mismo `seed`, mismas filas), así que server y cliente renderizan igual.
- Los seeds se conservan del template: detalle usa `id.length * 17 + 3` con 10 filas; salón usa `id.length * 23 + 7` con 12 filas.
- Números con `toLocaleString("es-ES")`.

---

## Plan de implementación

Cada paso deja la app compilando y ejecutable.

1. Leer la guía relevante en `node_modules/next/dist/docs/` (App Router, `cacheComponents`, rutas dinámicas, `not-found`). Si no existe, ejecutar `pnpm install`.
2. Crear `lib/data.ts` con los tipos y los datos portados. Verificación: `pnpm lint` sin errores.
3. Crear `components/nav.tsx` (client, usa `usePathname` para el enlace activo y el panel móvil) y `components/footer.tsx`. Montarlos en `app/layout.tsx` dentro de `#root`, con `<main className="av-main">`.
4. Reemplazar `app/page.tsx` por la biblioteca: `components/game-card.tsx` (client, tilt) y `components/library.tsx` (client, búsqueda y chips). Verificación: `/` lista 8 juegos y filtra.
5. Crear `app/juegos/[id]/page.tsx` (detalle) con `generateStaticParams` sobre `GAMES` y `notFound()` si el id no existe. Más `app/not-found.tsx`.
6. Crear `app/juegos/[id]/jugar/page.tsx` y `components/game-player.tsx` (client): HUD, CRT, pausa, fin y modal con "guardar" que solo muestra el aviso.
7. Crear `app/salon/page.tsx` y `components/hall-of-fame.tsx` (client, pestañas por juego, podio y tabla).
8. Crear `app/auth/page.tsx` y `components/auth-form.tsx` (client): pestañas, campos, invitado y sociales. Al enviar el formulario o pulsar "Jugar como invitado", navegar a `/` con `useRouter`.
9. Actualizar `metadata` (títulos por página) y revisar el responsive a 390 px y 1280 px.

---

## Criterios de aceptación

- [ ] `pnpm lint` y `pnpm build` terminan sin errores.
- [ ] `/` muestra el hero "ARCADE VAULT", el buscador, los 5 chips de categoría y 8 tarjetas.
- [ ] Escribir "caída" en el buscador deja solo la tarjeta CAÍDA; escribir "zzz" muestra "NO HAY RESULTADOS".
- [ ] El chip PUZZLE muestra solo 1 juego; el chip SHOOTER muestra 2; TODOS vuelve a mostrar 8.
- [ ] Pulsar una tarjeta o su botón JUGAR navega a `/juegos/<id>`.
- [ ] `/juegos/caida` muestra título, descripción larga, 4 etiquetas, 3 estadísticas y 10 filas de puntuaciones con #01, #02 y #03 en dorado, plata y bronce.
- [ ] `/juegos/no-existe` muestra la pantalla 404.
- [ ] "► JUGAR AHORA" lleva a `/juegos/<id>/jugar`; "VOLVER AL VAULT" lleva a `/`.
- [ ] En el reproductor, la puntuación sube sola; PAUSA la detiene y muestra "EN PAUSA"; REANUDAR la continúa.
- [ ] FIN abre el modal "FIN DEL JUEGO" con la puntuación final; "GUARDAR PUNTUACIÓN" muestra "PUNTUACIÓN GUARDADA_" y no escribe en localStorage.
- [ ] "JUGAR DE NUEVO" reinicia puntuación, vidas y nivel; "VOLVER AL VAULT" lleva a `/`; SALIR lleva a `/juegos/<id>`.
- [ ] `/salon` muestra 8 pestañas (una por juego), podio con 01 al centro y 12 filas; cambiar de pestaña cambia los datos.
- [ ] `/salon` no muestra la fila "TU MEJOR MARCA".
- [ ] `/auth` alterna entre "INICIAR SESIÓN" y "CREAR CUENTA"; la segunda pestaña añade el campo de correo.
- [ ] Enviar el formulario de auth o pulsar "JUGAR COMO INVITADO" navega a `/`.
- [ ] El enlace activo del nav se resalta en `/`, `/juegos/*` (Biblioteca) y `/salon`.
- [ ] A 390 px de ancho el nav muestra el botón ≡, que abre y cierra el panel lateral; no hay scroll horizontal.
- [ ] La consola del navegador no muestra errores de hidratación en ninguna de las 5 rutas.
- [ ] No se escribe nada en localStorage ni en cookies.

---

## Decisiones tomadas y descartadas

- **Sí:** rutas del App Router (`/juegos/[id]`, etc.). Es lo idiomático, da URLs compartibles y evita el estado `route` con hash del template.
- **No:** replicar el hash-routing del template. Va contra el App Router y rompe SSR y el botón atrás.
- **Sí:** reproductor "como el template", con puntaje simulado, pausa y modal. Sirve de contrato visual para enchufar los juegos reales después.
- **No:** reproductor como marco estático. Perdería el HUD y el modal, que son parte del diseño.
- **Sí:** auth solo UI, sin persistir. Coherente con "solo la parte visual"; evita una sesión falsa que luego haya que desmontar.
- **No:** `av_user` y `av_scores` en localStorage como en el template. Se descarta junto con la fila "TU MEJOR MARCA" y el nombre de usuario en el nav, que siempre muestra "Iniciar Sesión".
- **Sí:** datos simulados en `lib/data.ts` tipado. Se reemplaza por un backend sin tocar las pantallas.
- **Sí:** reutilizar las clases CSS ya portadas a `app/globals.css`. No se reescriben los estilos ni se migran a utilidades de Tailwind.
- **Sí:** `generateStaticParams` sobre `GAMES`. Los ids son conocidos y encaja con `cacheComponents`.
- **Sí:** solo los componentes con estado o eventos llevan `"use client"`. Las páginas siguen siendo Server Components.

---

## Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| Next.js 16 con `cacheComponents` cambia el acceso a `params` y a datos dinámicos | Paso 1 lee la guía local antes de escribir código; `generateStaticParams` evita rutas dinámicas sin prerender. |
| Error de hidratación por `Math.random()` en el reproductor | El puntaje simulado se calcula solo dentro de un `useEffect`; el estado inicial es 0 en server y cliente. |
| `toLocaleString("es-ES")` distinto entre Node y navegador | Usar siempre el locale explícito `"es-ES"`, nunca el del entorno. |
| El tilt de las tarjetas usa `style.transform` directo sobre el DOM | Se limita a `game-card.tsx`; se resetea en `onMouseLeave`. |
| `node_modules/next/dist/docs` puede no existir | Ejecutar `pnpm install` y volver a comprobar; si sigue ausente, avisar antes de continuar. |

---

## Lo que **no** está en esta spec

- Ningún juego real (ni lógica, ni canvas, ni controles).
- Sesión de usuario, registro real u OAuth.
- Persistencia de puntajes y rankings reales.
- Backend, base de datos o API.
- Tests automatizados.
- Contador de créditos funcional.

Cada uno de estos puntos, si se aborda, va en su propia spec.
