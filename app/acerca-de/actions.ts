"use server";

import { Resend } from "resend";

export type ContactInput = {
  name: string; // obligatorio, máx. 80 tras trim
  email: string; // obligatorio, formato válido, máx. 254
  msg: string; // obligatorio, máx. 2000 tras trim
  website: string; // honeypot: debe llegar vacío
};

export type ContactResult =
  | { ok: true; name: string } // name sirve para «GRACIAS, {NOMBRE}.»
  | { ok: false; error: "validation" | "send" }; // "send": Resend falló o falta configuración

const MAX_NAME = 80;
const MAX_EMAIL = 254;
const MAX_MSG = 2000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_FROM = "onboarding@resend.dev";
const SUBJECT = "Arcade Vault · Nuevo mensaje de contacto"; // fijo: evita inyección de cabeceras

export async function sendContactMessage(input: ContactInput): Promise<ContactResult> {
  // La acción es invocable con un POST directo: no se confía en el tipado del cliente.
  const name = typeof input?.name === "string" ? input.name.trim() : "";
  const email = typeof input?.email === "string" ? input.email.trim() : "";
  const msg = typeof input?.msg === "string" ? input.msg.trim() : "";

  if (
    !name ||
    !email ||
    !msg ||
    name.length > MAX_NAME ||
    email.length > MAX_EMAIL ||
    msg.length > MAX_MSG ||
    !EMAIL_RE.test(email)
  ) {
    return { ok: false, error: "validation" };
  }

  // Honeypot: un bot rellenó el campo oculto. Se responde éxito sin enviar, sin dar pistas.
  if (typeof input.website === "string" && input.website.trim() !== "") {
    return { ok: true, name };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  if (!apiKey || !to) {
    console.error("[contact] Falta RESEND_API_KEY o CONTACT_TO_EMAIL en el entorno.");
    return { ok: false, error: "send" };
  }
  const from = process.env.CONTACT_FROM_EMAIL || DEFAULT_FROM;

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to,
      replyTo: email,
      subject: SUBJECT,
      text: `Nombre: ${name}\nCorreo: ${email}\n\nMensaje:\n${msg}`,
    });
    if (error) {
      console.error("[contact] Resend devolvió un error:", error);
      return { ok: false, error: "send" };
    }
  } catch (err) {
    console.error("[contact] Fallo inesperado al enviar con Resend:", err);
    return { ok: false, error: "send" };
  }

  return { ok: true, name };
}
