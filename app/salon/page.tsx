import { HallOfFame } from "@/components/hall-of-fame";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Salón de la Fama" };

export default function SalonPage() {
  return <HallOfFame />;
}
