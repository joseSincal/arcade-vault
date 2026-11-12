// Tipos, límites y validación del formulario de contacto.
// Módulo compartido entre cliente y servidor: no debe importar nada de servidor.

export type ContactInput = {
  name: string; // obligatorio, máx. 80 tras trim
  email: string; // obligatorio, formato válido, máx. 254
  msg: string; // obligatorio, máx. 2000 tras trim
  website: string; // honeypot: debe llegar vacío
};

export type ContactResult =
  | { ok: true; name: string } // name sirve para «GRACIAS, {NOMBRE}.»
  | { ok: false; error: "validation" | "send" | "origin" }; // "send": Resend falló o falta configuración

export const MAX_NAME = 80;
export const MAX_EMAIL = 254;
export const MAX_MSG = 2000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Valida y limpia (trim) los datos del formulario.
 * Acepta `unknown` porque el cuerpo llega de una petición HTTP no confiable.
 * Devuelve los datos limpios o `null` si no son válidos.
 */
export function validateContact(input: unknown): ContactInput | null {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return null;
  }
  const raw = input as Record<string, unknown>;

  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const email = typeof raw.email === "string" ? raw.email.trim() : "";
  const msg = typeof raw.msg === "string" ? raw.msg.trim() : "";
  const website = typeof raw.website === "string" ? raw.website.trim() : "";

  if (
    !name ||
    !email ||
    !msg ||
    name.length > MAX_NAME ||
    email.length > MAX_EMAIL ||
    msg.length > MAX_MSG ||
    !EMAIL_RE.test(email)
  ) {
    return null;
  }

  return { name, email, msg, website };
}
