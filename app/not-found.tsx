import Link from "next/link";

export default function NotFound() {
  return (
    <div
      className="fade-in"
      style={{ textAlign: "center", padding: "96px 24px", maxWidth: 560, margin: "0 auto" }}
    >
      <h1
        className="pixel neon-magenta flicker"
        style={{ fontSize: "clamp(28px, 8vw, 56px)", lineHeight: 1.2, marginBottom: 24 }}
      >
        404
      </h1>
      <div className="pixel" style={{ fontSize: 14, color: "var(--cyan)", marginBottom: 16 }}>
        JUEGO NO ENCONTRADO
      </div>
      <p style={{ color: "var(--ink-faint)", marginBottom: 32 }}>
        Esta página no existe o el juego ya no está en el Vault. Vuelve a la biblioteca para elegir otro.
      </p>
      <Link href="/" className="btn xl">
        VOLVER AL VAULT
      </Link>
    </div>
  );
}
