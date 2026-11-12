"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { FormEvent } from "react";
import type { ContactResult } from "@/lib/contact";

const EMPTY = { name: "", email: "", msg: "", website: "" };

const ERROR_TEXT = {
  validation: "> ERROR: REVISA LOS DATOS (CORREO VÁLIDO, NOMBRE MÁX. 80, MENSAJE MÁX. 2000).",
  send: "> ERROR: NO SE PUDO ENVIAR EL MENSAJE. INTÉNTALO DE NUEVO.",
} as const;

// El envío es real: POST /api/contact valida y manda el correo con Resend
export function ContactForm() {
  const [form, setForm] = useState(EMPTY);
  const [sent, setSent] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [error, setError] = useState<keyof typeof ERROR_TEXT | null>(null);
  const [isPending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.msg.trim()) {
      setShake(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setShake(false), 400);
      return;
    }
    if (isPending) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        // Respuesta no JSON -> res.json() lanza y cae en el catch como error "send"
        const result: ContactResult = await res.json();
        if (result.ok) {
          setSent(result.name);
        } else {
          setError(result.error === "validation" ? "validation" : "send");
        }
      } catch {
        setError("send");
      }
    });
  };

  const reset = () => {
    setSent(null);
    setError(null);
    setForm(EMPTY);
  };

  return (
    <form className={"contact-form" + (shake ? " shake" : "")} onSubmit={onSubmit} noValidate>
      {sent === null ? (
        <>
          <div className="field">
            <label htmlFor="contact-name">NOMBRE</label>
            <input
              id="contact-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="px_kai"
            />
          </div>
          <div className="field">
            <label htmlFor="contact-email">CORREO ELECTRÓNICO</label>
            <input
              id="contact-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="jugador@vault.gg"
            />
          </div>
          <div className="field">
            <label htmlFor="contact-msg">MENSAJE</label>
            <textarea
              id="contact-msg"
              rows={5}
              value={form.msg}
              onChange={(e) => setForm({ ...form, msg: e.target.value })}
              placeholder="Cuéntanos qué tienes en mente…"
            ></textarea>
          </div>
          <div className="hp-field" aria-hidden="true">
            <label htmlFor="contact-website">NO RELLENAR</label>
            <input
              id="contact-website"
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
            />
          </div>
          {error && (
            <div className="contact-error" role="alert">
              {ERROR_TEXT[error]}
            </div>
          )}
          <button
            className="btn xl press"
            type="submit"
            style={{ width: "100%" }}
            disabled={isPending}
          >
            {isPending ? "▶ ENVIANDO…" : "▶ ENVIAR MENSAJE"}
          </button>
        </>
      ) : (
        <div className="terminal-success">
          <div className="term-bar">
            <span className="dot r"></span>
            <span className="dot y"></span>
            <span className="dot g"></span>
            <span className="term-title">VAULT-OS // TERMINAL</span>
          </div>
          <div className="term-body">
            <div className="line">
              <span className="prompt">vault@arcade:~$</span> ./send_message --to=team
            </div>
            <div className="line dim">[OK] Conectando con servidor…</div>
            <div className="line dim">[OK] Validando contenido…</div>
            <div className="line dim">[OK] Transmitiendo paquete…</div>
            <div className="line success">
              &gt; MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS, {sent.toUpperCase()}.
              <span className="caret">_</span>
            </div>
            <div style={{ marginTop: 18 }}>
              <button className="btn ghost" type="button" onClick={reset}>
                ENVIAR OTRO MENSAJE
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
