import type { Metadata } from "next";
import { TrafficAssistantView } from "@/components/traffic-assistant/traffic-assistant-view";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://navo.rw";

export const metadata: Metadata = {
  title: "Ishakiro ry'Amategeko y'Umuhanda mu Rwanda | Navo",
  description:
    "Shakisha ibisubizo by'amategeko y'umuhanda mu Rwanda, ibyapa, n'amasomo ya Navo mu rurimi urwo ari rwo rwose wifashishije isesengura rishingiye ku masomo n'ibibazo biri mu bubiko bwacu.",
  keywords: [
    "amategeko y'umuhanda mu rwanda",
    "ibizamini by'agateganyo",
    "rwanda traffic rules",
    "code de la route rwandais",
    "official gazette of rwanda traffic",
    "iteka rya perezida no 85/01",
    "amasangano azunguruka",
    "ibyapa by'umuhanda",
    "navo",
  ],
  alternates: {
    canonical: `${baseUrl}/traffic-assistant`,
  },
  openGraph: {
    title: "Ishakiro ry'Amategeko y'Umuhanda mu Rwanda | Navo",
    description:
      "Baza ikibazo cy'amategeko y'umuhanda mu rurimi urwo ari rwo rwose ubone igisubizo gishingiye ku masomo ya Navo n'Igazeti ya Leta y'u Rwanda.",
    url: `${baseUrl}/traffic-assistant`,
    siteName: "Navo",
    type: "website",
    locale: "rw_RW",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ishakiro ry'Amategeko y'Umuhanda mu Rwanda | Navo",
    description:
      "Shakisha ibisubizo by'amategeko y'umuhanda mu rurimi urwo ari rwo rwose bishingiye ku masomo n'ububiko bwa Navo.",
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
        name: "Ishakiro ry'Amategeko y'Umuhanda mu Rwanda - Navo",
        applicationCategory: "EducationalApplication",
        operatingSystem: "All",
        url: `${baseUrl}/traffic-assistant`,
        description:
          "Sisitemu rusange yo gushakisha ibisubizo ku mategeko y'umuhanda mu Rwanda mu rurimi urwo ari rwo rwose hashingiwe ku masomo n'ububiko bw'amakuru bwa Navo.",
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
            name: "Ni nde ufite uburenganzira bwo gutambuka mbere mu masangano azunguruka mu Rwanda?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Hakurikijwe Ingingo ya 28 y'Iteka rya Perezida No 85/01, ibinyabiziga bimaze kwinjira no kugenda mu masangano azunguruka (rond-point) nibyo bifite uburenganzira bwo gutambuka mbere y'ibigiye kwinjiramo.",
            },
          },
          {
            "@type": "Question",
            name: "Umuvuduko ntarengwa mu nsisiro mu Rwanda ni uwuhe?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Umuvuduko ntarengwa rusange mu nsisiro cyangwa mu mijyi mu Rwanda ni 40 km/h keretse hari icyapa cyerekana ibindi bipimo.",
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
