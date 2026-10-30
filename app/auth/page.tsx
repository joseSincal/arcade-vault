import { AuthForm } from "@/components/auth-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Acceso" };

export default function AuthPage() {
  return <AuthForm />;
}
