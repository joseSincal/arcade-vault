# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

Arcade Vault: plataforma para jugar online y competir por la mayor cantidad de puntos. El repositorio está en una etapa inicial (solo el scaffold de Create Next App); aún no hay lógica de juegos, puntajes ni backend.

El README indica que se trabaja con **Spec Driven Design** (comandos `/spec` y `/spec-impl`), siguiendo las prácticas de https://github.com/Klerith/fernando-skills (instaladas con `npx skills@latest add Klerith/fernando-skills`). Todavía no existe un directorio `spec/` en el repo.

## Comandos

El gestor de paquetes es **pnpm** (`pnpm@12.15.0`).

- `pnpm dev`: servidor de desarrollo (`next dev`)
- `pnpm build`: build de producción
- `pnpm start`: sirve el build de producción
- `pnpm lint`: ESLint (`eslint`, config flat con `eslint-config-next` core-web-vitals + typescript)

No hay framework de tests configurado.

## Next.js no es el que conoces

Este proyecto usa Next.js 16.4.3 con React 19.3, con cambios incompatibles respecto a versiones anteriores. `AGENTS.md` exige leer la guía relevante en `node_modules/next/dist/docs/` antes de escribir código y respetar los avisos de deprecación. (Nota: en el momento de escribir esto, `node_modules/next/dist/docs` no existía; si falta, verifica la instalación de dependencias con `pnpm install`.) El bloque de `AGENTS.md` lo regenera `next dev`, así que no tiene sentido eliminarlo.

## Arquitectura

- App Router en `app/` (`layout.tsx`, `page.tsx`, `globals.css`). Alias de imports `@/*` apunta a la raíz del repo.
- `next.config.ts` activa opciones experimentales/nuevas relevantes: `cacheComponents: true`, `partialPrefetching: true` y `experimental.agentFeedback`. `cacheComponents` cambia el modelo de render/caché (acceso a datos dinámicos y `use cache`), así que consulta la documentación antes de escribir componentes que lean datos.
- Tailwind CSS v4 se procesa vía Turbopack con la regla `*.css` → `@tailwindcss/turbopack` (definida en `next.config.ts`, no con PostCSS). Los tokens de tema están en `app/globals.css` (`@theme inline`, modo oscuro por `prefers-color-scheme`).
- `app/layout.tsx` usa el helper global de tipos `LayoutProps<"/">` (tipado de rutas generado por Next) y las fuentes Geist vía `next/font/google`.
- `app/page.tsx`, `metadata` y `lang="en"` son aún los valores por defecto de Create Next App.
