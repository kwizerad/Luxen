import type { Metadata } from "next";
import { TrafficAssistantView } from "@/components/traffic-assistant/traffic-assistant-view";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://navo.rw";

export const metadata: Metadata = {
  title: "Rwanda Traffic Rules & Official Gazette AI Assistant | Navo",
  description:
    "Ask any question about Rwanda road traffic regulations (Amategeko y'Umuhanda), right of way, road signs, and speed limits. Get verified direct answers citing the Official Gazette with practice exam questions.",
  keywords: [
    "rwanda traffic rules",
    "amategeko y'umuhanda",
    "code de la route rwandais",
    "official gazette of rwanda traffic",
    "iteka rya perezida no 85/01",
    "roundabout right of way rwanda",
    "provisional driving exam questions",
    "irembo driving test",
    "police traffic exam answers",
  ],
  alternates: {
    canonical: `${baseUrl}/traffic-assistant`,
  },
  openGraph: {
    title: "Rwanda Traffic Rules & Official Gazette AI Assistant | Navo",
    description:
      "Get instant answers to Rwanda traffic rules, right of way, and exam questions backed by the Official Gazette of Rwanda.",
    url: `${baseUrl}/traffic-assistant`,
    siteName: "Navo",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Rwanda Traffic Rules & Official Gazette AI Assistant | Navo",
    description:
      "Instant answers to Rwanda traffic rules, road signs, and driving theory exam questions with official legal citations.",
  },
};

export default async function TrafficAssistantPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: "Navo Rwanda Traffic Rules & Legal Code Assistant",
        applicationCategory: "EducationalApplication",
        operatingSystem: "All",
        url: `${baseUrl}/traffic-assistant`,
        description:
          "AI-powered search engine for Rwandan road traffic regulations, official gazette decrees, and driving license exam preparation.",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "RWF",
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "Who has the right of way at a roundabout in Rwanda?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "According to Article 28 of Presidential Order No 85/01, vehicles already circulating inside a roundabout have priority over vehicles approaching to enter the roundabout.",
            },
          },
          {
            "@type": "Question",
            name: "What is the speed limit in urban areas in Rwanda?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "The standard legal speed limit inside built-up and urban areas in Rwanda is 40 km/h, with school and hospital zones restricted to 25 km/h to 30 km/h unless posted otherwise.",
            },
          },
          {
            "@type": "Question",
            name: "Ni nde ufite uburenganzira bwo gutambuka mbere mu masangano azunguruka mu Rwanda?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Hakurikijwe Ingingo ya 28 y'Iteka rya Perezida No 85/01, ibinyabiziga bimaze kwinjira no kugenda mu masangano azunguruka (rond-point) nibyo bifite uburenganzira bwo gutambuka mbere y'ibigiye kwinjiramo.",
            },
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <TrafficAssistantView initialQuery={q} />
    </>
  );
}
