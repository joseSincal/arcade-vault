import { Resend } from "resend";
import { validateContact, type ContactResult } from "@/lib/contact";

const DEFAULT_FROM = "onboarding@resend.dev";
const SUBJECT = "Arcade Vault · Nuevo mensaje de contacto"; // fijo: evita inyección de cabeceras

function respond(body: ContactResult, status: number): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

// Una API Route no trae la protección contra CSRF de las Server Actions:
// se rechaza cualquier petición cuyo Origin no coincida con el host propio.
function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (origin === null) return true; // sin Origin (p. ej. curl o mismo origen sin cabecera): no se bloquea

  const host = request.headers.get("host") ?? new URL(request.url).host;
  try {
    return new URL(origin).host === host;
  } catch {
    return false; // Origin mal formado o "null"
  }
}

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) {
    return respond({ ok: false, error: "origin" }, 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return respond({ ok: false, error: "validation" }, 400);
  }

  const data = validateContact(body);
  if (!data) {
    return respond({ ok: false, error: "validation" }, 400);
  }

  const { name, email, msg, website } = data;

  // Honeypot: un bot rellenó el campo oculto. Se responde éxito sin enviar, sin dar pistas.
  if (website !== "") {
    return respond({ ok: true, name }, 200);
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  if (!apiKey || !to) {
    console.error("[contact] Falta RESEND_API_KEY o CONTACT_TO_EMAIL en el entorno.");
    return respond({ ok: false, error: "send" }, 500);
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
      return respond({ ok: false, error: "send" }, 500);
    }
  } catch (err) {
    console.error("[contact] Fallo inesperado al enviar con Resend:", err);
    return respond({ ok: false, error: "send" }, 500);
  }

  return respond({ ok: true, name }, 200);
}
