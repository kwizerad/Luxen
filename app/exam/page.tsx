import type { Metadata } from "next";
import { GuestExamClient } from "@/components/guest-exam/guest-exam-client";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://navo.rw";

export const metadata: Metadata = {
  title: "Kora Ikizamini cy'Amategeko y'Umuhanda | Navo",
  description:
    "Kora ikizamini cy'imyitozo cy'uruhushya rw'agateganyo ku buntu mu Kinyarwanda, Icyongereza n'Igifaransa kuri Navo.",
  alternates: {
    canonical: `${baseUrl}/exam`,
  },
  openGraph: {
    title: "Kora Ikizamini cy'Amategeko y'Umuhanda | Navo",
    description:
      "Imenyereze gukora ikizamini cy'amategeko y'umuhanda mu Rwanda ako kanya kuri Navo.",
    url: `${baseUrl}/exam`,
    siteName: "Navo",
    type: "website",
    locale: "rw_RW",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kora Ikizamini cy'Amategeko y'Umuhanda | Navo",
    description:
      "Imenyereze gukora ikizamini cy'amategeko y'umuhanda mu Rwanda ako kanya kuri Navo.",
  },
};

export default function GuestExamPage() {
  return <GuestExamClient />;
}
