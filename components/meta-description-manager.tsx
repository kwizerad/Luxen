"use client";

import { useEffect } from "react";
import { useLanguage } from "@/lib/language-context";

interface SEOTranslation {
  title: string;
  description: string;
  keywords: string;
  ogTitle: string;
  ogDescription: string;
  locale: string;
}

const SEO_DATA: Record<string, SEOTranslation> = {
  rw: {
    title: "Navo – Urubuga Rwa Mbere Rwo Kwiga Amategeko y'Umuhanda n'Ibizamini bya Polisi mu Rwanda",
    description:
      "Witegure kandi utsindire uruhushya rw'agateganyo rw'ubutwari mu Rwanda kuri Navo. Yiga amategeko y'umuhanda, ibimenyetso byo ku muhanda, ugere ku bizamini nyabyo bya Polisi n'Irembo hamwe n'amabwiriza mu Kinyarwanda, Igifaransa, n'Icyongereza.",
    keywords:
      "amategeko y'umuhanda, ibizamini bya polisi, uruhushya rw'agateganyo, irembo driving exam, amategeko y'umuhanda 2026, ibimenyetso byo ku muhanda, kwiga amategeko y'umuhanda internet, navo rwanda, permis de conduire rwanda, ibibazo n'ibisubizo amategeko y'umuhanda",
    ogTitle: "Navo – Kwiga Amategeko y'Umuhanda Intambwe ku Ntambwe mu Rwanda",
    ogDescription:
      "Urubuga rwizewe rwo kwitegura neza igizamini cy'uruhushya rw'agateganyo rw'ibinyabiziga mu Rwanda. Iga amategeko, ubibazo n'ibisubizo, n'ibimenyetso byo ku muhanda.",
    locale: "rw_RW",
  },
  en: {
    title: "Navo – Rwanda Online Traffic Rules & Police Driving Exam Preparation Platform",
    description:
      "Prepare and pass the Rwanda police provisional driving license theory exam online with Navo. Access official traffic regulations, road signs practice tests, AI audio explanations, and full mock exams in Kinyarwanda, English, and French.",
    keywords:
      "rwanda traffic rules, rwanda driving theory test, rwanda police driving exam, irembo driving license, provisional license rwanda, amategeko yumuhanda, navo.rw, rwanda road signs, online driving school rwanda, rwanda traffic exam preparation",
    ogTitle: "Navo – Pass Your Rwanda Provisional Driving Theory Exam Online",
    ogDescription:
      "Comprehensive interactive learning platform for Rwanda driving theory tests, official road signs, and police provisional exam questions.",
    locale: "en_US",
  },
  fr: {
    title: "Navo – Plateforme d'Apprentissage du Code de la Route et Examens du Permis au Rwanda",
    description:
      "Préparez et réussissez votre examen théorique du permis de conduire provisoire au Rwanda avec Navo. Étudiez le code de la route officiel, les panneaux de signalisation, et passez des examens blancs en Kinyarwanda, Français et Anglais.",
    keywords:
      "code de la route rwanda, examen permis provisoire rwanda, amategeko yumuhanda, police du rwanda permis, irembo permis de conduire, auto ecole rwanda, tests de signalisation routiere rwanda, navo.rw",
    ogTitle: "Navo – Préparation à l'Examen du Permis de Conduire Provisoire au Rwanda",
    ogDescription:
      "Accédez aux règlements officiels de la circulation au Rwanda, aux tests pratiques de signalisation et aux explications interactives.",
    locale: "fr_FR",
  },
};

/**
 * MetaDescriptionManager
 * 
 * Automatically injects dynamic SEO-optimized multi-lingual descriptions,
 * keywords, OpenGraph/Twitter social cards, and Schema.org JSON-LD
 * structured data directly into the document head.
 * 
 * Visually completely hidden from the user interface (returns null / hidden DOM node),
 * while remaining fully indexable and discoverable by web crawling algorithms.
 */
export function MetaDescriptionManager() {
  const { language } = useLanguage();

  // Normalize current language code
  const langKey =
    language === "Kinyarwanda" || language === "rw"
      ? "rw"
      : language === "French" || language === "fr"
      ? "fr"
      : "en";

  const currentSEO = SEO_DATA[langKey] || SEO_DATA.rw;

  useEffect(() => {
    if (typeof document === "undefined") return;

    // 1. Update Document Title
    document.title = currentSEO.title;

    // Helper function to safely update or append meta tag
    const setMetaTag = (attrName: "name" | "property", attrValue: string, contentValue: string) => {
      let element = document.head.querySelector(`meta[${attrName}="${attrValue}"]`) as HTMLMetaElement | null;
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attrName, attrValue);
        document.head.appendChild(element);
      }
      element.setAttribute("content", contentValue);
    };

    // 2. Standard SEO Meta Tags
    setMetaTag("name", "description", currentSEO.description);
    setMetaTag("name", "keywords", currentSEO.keywords);
    setMetaTag("name", "robots", "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");
    setMetaTag("name", "author", "Navo Rwanda");

    // 3. OpenGraph Social Cards
    setMetaTag("property", "og:title", currentSEO.ogTitle);
    setMetaTag("property", "og:description", currentSEO.ogDescription);
    setMetaTag("property", "og:type", "website");
    setMetaTag("property", "og:site_name", "Navo Rwanda");
    setMetaTag("property", "og:locale", currentSEO.locale);
    setMetaTag("property", "og:url", typeof window !== "undefined" ? window.location.href : "https://navo.rw");

    // 4. Twitter Social Cards
    setMetaTag("name", "twitter:card", "summary_large_image");
    setMetaTag("name", "twitter:title", currentSEO.ogTitle);
    setMetaTag("name", "twitter:description", currentSEO.ogDescription);

    // 5. Multi-lingual Alternate hreflang Links
    const setHrefLang = (lang: string, href: string) => {
      let element = document.head.querySelector(`link[rel="alternate"][hreflang="${lang}"]`) as HTMLLinkElement | null;
      if (!element) {
        element = document.createElement("link");
        element.setAttribute("rel", "alternate");
        element.setAttribute("hreflang", lang);
        document.head.appendChild(element);
      }
      element.setAttribute("href", href);
    };

    const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://navo.rw";
    setHrefLang("rw", `${baseUrl}/?lang=rw`);
    setHrefLang("en", `${baseUrl}/?lang=en`);
    setHrefLang("fr", `${baseUrl}/?lang=fr`);
    setHrefLang("x-default", baseUrl);

    // 6. Inject / Update Dynamic Schema.org JSON-LD Structured Data
    let schemaScript = document.getElementById("navo-dynamic-seo-schema") as HTMLScriptElement | null;
    if (!schemaScript) {
      schemaScript = document.createElement("script");
      schemaScript.id = "navo-dynamic-seo-schema";
      schemaScript.type = "application/ld+json";
      document.head.appendChild(schemaScript);
    }

    const jsonLdData = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "EducationalApplication",
          "@id": `${baseUrl}/#app`,
          name: "Navo",
          alternateName: [
            "Navo Rwanda",
            "Amategeko y'Umuhanda Online",
            "Rwanda Traffic Rules Platform",
            "Permis Provisoire Rwanda",
          ],
          url: baseUrl,
          applicationCategory: "EducationalApplication",
          operatingSystem: "Web, Android, iOS, Windows, macOS",
          description: currentSEO.description,
          inLanguage: ["rw", "en", "fr"],
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "RWF",
            availability: "https://schema.org/InStock",
          },
          provider: {
            "@type": "Organization",
            name: "Navo Rwanda",
            url: baseUrl,
            logo: `${baseUrl}/icons/icon-512x512.png`,
          },
        },
        {
          "@type": "WebSite",
          "@id": `${baseUrl}/#website`,
          url: baseUrl,
          name: "Navo",
          description: currentSEO.description,
          inLanguage: ["rw", "en", "fr"],
          publisher: {
            "@type": "Organization",
            name: "Navo Rwanda",
          },
        },
        {
          "@type": "FAQPage",
          "@id": `${baseUrl}/#faq`,
          mainEntity: [
            {
              "@type": "Question",
              name: "Nka kwiga ute amategeko y'umuhanda mu Rwanda kuri internet?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Kuri Navo urashobora kwiga amategeko y'umuhanda, kwikoresha ibizamini bya Polisi no kureba amabwiriza arambuye mu Kinyarwanda, Igifaransa n'Icyongereza.",
              },
            },
            {
              "@type": "Question",
              name: "How can I prepare for the Rwanda police provisional driving license exam online?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Navo offers interactive mock driving theory tests, real Rwanda traffic rule questions, and road sign study guides accessible online 24/7.",
              },
            },
          ],
        },
      ],
    };

    schemaScript.textContent = JSON.stringify(jsonLdData);
  }, [currentSEO, language]);

  // Return hidden node for search engines / accessibility while maintaining 100% hidden UI footprint
  return (
    <div
      aria-hidden="true"
      tabIndex={-1}
      className="sr-only hidden pointer-events-none opacity-0 h-0 w-0 overflow-hidden select-none"
      style={{ display: "none", visibility: "hidden", position: "absolute", width: 0, height: 0, overflow: "hidden" }}
    >
      <h2>{currentSEO.title}</h2>
      <p>{currentSEO.description}</p>
      <span>{currentSEO.keywords}</span>
    </div>
  );
}

export default MetaDescriptionManager;
