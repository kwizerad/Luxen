import { generateContentWithFallback } from "./gemini-client";
import signCatalogData from "./sign-catalog.json";

export interface SignCatalogEntry {
  path: string;
  publicUrl: string;
  title_en: string;
  title_rw: string;
  title_fr: string;
  category: string;
  shape: string;
  visual_description: string;
  relevant_topics: string[];
}

export interface EmbeddedSignInfo {
  path: string;
  publicUrl: string;
  title: string;
  caption: string;
  category?: string;
}

export interface GeneratedTopic {
  title: string;
  estimated_minutes: number;
  content: string; // Tiptap JSON string
  matchedSigns?: EmbeddedSignInfo[];
}

export interface GeneratedLesson {
  title: string;
  short_description?: string;
  topics: GeneratedTopic[];
}

export interface GeneratedQuestion {
  question: string;
  question_image?: string;
  type: "multiple_choice" | "true_false";
  option_a: string;
  option_b: string;
  option_c?: string;
  option_d?: string;
  correct_answer: "A" | "B" | "C" | "D";
  explanation: string;
}

export interface GazetteAnalysisResult {
  moduleTitle: string;
  moduleDescription: string;
  lessons: GeneratedLesson[];
  questions: GeneratedQuestion[];
  keyLawArticlesReferenced: string[];
  matchedSignsCount?: number;
  matchedSigns?: EmbeddedSignInfo[];
}

export const OFFICIAL_RWANDA_GAZETTE_2026_DIGEST = `
OFFICIAL GAZETTE OF THE REPUBLIC OF RWANDA — 2026 TRAFFIC & ROAD SAFETY CODE
(Igazeti ya Leta ya Repubulika y'u Rwanda — Amategeko y'Umuhanda n'Imigenzereze yo mu Muhanda 2026 / Journal Officiel du Code de la Route Rwandais 2026)

CHAPTER I: PEDESTRIAN RULES, RIGHTS & OBLIGATIONS (ABANYAMAGURU / PIÉTONS)
- Article 14 (Pedestrian Footpaths & Sidewalks / Inzira z'abanyamaguru / Trottoirs et accotements):
  Pedestrians must always walk on designated paved sidewalks, footpaths, or raised shoulders (trottoirs/inzira z'abanyamaguru). Where a mandatory pedestrian path sign (Blue Circle with White Pedestrian figure: IR_road_sign_2-46.png, SADC_road_sign_R109.png, Thailand_road_sign_บ-46.png) or shared pedestrian & cycle track sign (IE_road_sign_RUS-049.png, Gemini_Generated_Image_jbiyzojbiyzojbiy.png) is posted, pedestrians are legally required to use that path.
- Article 15 (Walking Where No Sidewalk Exists / Kugenda ahatari inzira y'abanyamaguru):
  If there is no sidewalk or usable shoulder, pedestrians must walk in single file along the extreme edge of the roadway facing oncoming traffic (on the left side when traffic drives on the right) so they can see approaching vehicles clearly, except when pushing a handcart or marching in an organized group.
- Article 16 (Pedestrian Crossing Rules / Kwambuka umuhanda mu mirongo y'abanyamaguru):
  Pedestrians must cross the road only at marked Zebra Crossings (Passages pour piétons / Ahanyurwa n'abanyamaguru — signaled by triangular danger sign Gemini_Generated_Image_lixof8lixof8lixo.png or school/children crossing signs Gemini_Generated_Image_ttxggrttxggrttxg.png and Thailand_road_sign_บ-47.png), pedestrian bridges, or intersections with traffic lights. Before stepping onto a crosswalk without traffic lights, pedestrians must verify the distance and speed of approaching vehicles and never cross diagonally.
- Article 17 (Areas Prohibited to Pedestrians / Ahantu habujijwe ku banyamaguru):
  Pedestrians are strictly prohibited from entering motorways, expressways, or any road section marked with the "No Entry for Pedestrians" prohibitory sign (Red-bordered white circle with black pedestrian figure: France_road_sign_B9a.png, SADC_road_sign_R216.png, Gemini_Generated_Image_pl0usxpl0usxpl0u.png).
- Article 18 (Driver Obligations Toward Pedestrians & Vulnerable Users / Inshingano z'abashoferi ku banyamaguru n'abana):
  Drivers approaching a pedestrian crossing, school zone, hospital zone (Gemini_Generated_Image_x623ofx623ofx623.png), or children crossing (Gemini_Generated_Image_ttxggrttxggrttxg.png) must reduce speed to 30 km/h or 10 km/h as posted (Italian_traffic_signs_-_limite_di_velocità_30.png, Italian_traffic_signs_-_limite_di_velocità_10.png), refrain from overtaking (CZ_road_sign_B-21a.png, Regulatory signs/Gemini_Generated_Image_og15teog15teog15.png), and come to a complete halt when a pedestrian steps onto or shows clear intent to use a zebra crossing.

CHAPTER II: ROAD SIGNS CLASSIFICATION & VISUAL MEANING (IBYAPA BY'UMUHANDA / SIGNAUX ROUTIERS)
- Article 28 (Danger Warning Signs — Ibyapa by'Imbuzi / Signaux de Danger):
  Triangular signs with a white background and red border pointing upwards warn road users of hazards 150m ahead in rural areas and 50m ahead in built-up urban areas:
  • Pedestrian Crossing Ahead (Gemini_Generated_Image_lixof8lixof8lixo.png)
  • Children / School Crossing Ahead (Gemini_Generated_Image_ttxggrttxggrttxg.png)
  • General / Other Danger Ahead (! exclamation mark: France_road_sign_A14.png, Regulatory signs/Gemini_Generated_Image_912ycb912ycb912y.png)
  • Slippery Road Surface (France_road_sign_A4.png, Regulatory signs/330px-Slippery_road_surfaceAL.png)
  • Dangerous Curves & Double Bends (Regulatory signs/BG_road_sign_А4.png, Regulatory signs/330px-BG_road_sign_А6.svg.webp, Regulatory signs/France_road_sign_A1d.png, Regulatory signs/Gemini_Generated_Image_36pnli36pnli36pn.png)
  • Steep Downward (10%) & Upward Gradients (Regulatory signs/Gemini_Generated_Image_6jufn6jufn6jufn6.png, Regulatory signs/Indian_Road_Sign_II-2.png)
  • Road Narrows on Both Sides or Right Side (Regulatory signs/Gemini_Generated_Image_9w0knt9w0knt9w0k.png, Regulatory signs/Gemini_Generated_Image_l5puexl5puexl5pu.png)
  • Uneven Road / Speed Bump Ahead (Regulatory signs/Gemini_Generated_Image_id5enrid5enrid5e.png)
  • Loose Gravel / Falling Stones (Regulatory signs/Gemini_Generated_Image_9lkiho9lkiho9lki.png)
  • Strong Crosswinds (Regulatory signs/Gemini_Generated_Image_f2kyagf2kyagf2ky.png, Regulatory signs/c155ea3ab9944458a38d1a82e91d7360.png)
  • Unprotected Quay or River Bank (Regulatory signs/Gemini_Generated_Image_6e1kwk6e1kwk6e1k.png)
  • Domestic Animals Crossing (Regulatory signs/France_road_sign_A15a1.png)
  • Level Crossing with Barrier Ahead (Regulatory signs/France_road_sign_A7.png, Regulatory signs/Gemini_Generated_Image_ydh9xvydh9xvydh9.png)
  • Two-Way Traffic Ahead (Regulatory signs/Gemini_Generated_Image_5gi7zm5gi7zm5gi7.png)

- Article 32 (Priority & Intersection Signs — Ibyapa byo gutanga inzira / Signaux de Priorité):
  • STOP Sign (Red Octagon: Regulatory signs/France_road_sign_AB4.png): Mandatory complete halt before the stop line or pedestrian crosswalk.
  • Roundabout Ahead & Compulsory Roundabout (Regulatory signs/France_road_sign_AB25.png, Zeichen_215_-_Kreisverkehr,_StVO_2000.png, Gemini_Generated_Image_p5k1iop5k1iop5k1.png): Vehicles already circulating inside the roundabout have priority.
  • Priority Over Oncoming Traffic (Blue Square with White Up Arrow & Red Down Arrow: Gemini_Generated_Image_7q33ks7q33ks7q33.png).

- Article 36 (Prohibitory & Speed Limit Signs — Ibyapa bibuza / Signaux d'Interdiction):
  Circular signs with a red border prohibit specific actions from the point the sign is placed until the next intersection or an End-of-Prohibition sign (Belgian_traffic_sign_C46.png, MK_road_sign_243.png, Gemini_Generated_Image_rw0ejtrw0ejtrw0e.png):
  • No Entry for All Vehicles / One-Way Exit (Solid red circle with white horizontal bar: Regulatory signs/Italian_traffic_signs_-_senso_vietato.png)
  • No Pedestrians Allowed (France_road_sign_B9a.png, SADC_road_sign_R216.png, Gemini_Generated_Image_pl0usxpl0usxpl0u.png)
  • No Motor Vehicles / Cars & Motorcycles Prohibited — Pedestrianized Zone (UK_traffic_sign_619.png, Regulatory signs/Jamaica_road_sign_R35-8.png)
  • No Bicycles Allowed (Regulatory signs/CA-ON_road_sign_Rb-016.png)
  • No Motorcycles / Mopeds (MK_road_sign_217.png, Regulatory signs/Gemini_Generated_Image_kvjgookvjgookvjg.png)
  • No Goods Vehicles / Trucks or Buses (France_road_sign_B10a.png, France_road_sign_B8.png, Belgian_traffic_sign_C22.png, France_road_sign_B11.png)
  • No Left Turn, No Right Turn, No U-Turn (Regulatory signs/Jamaica_road_sign_R35-1.png, Regulatory signs/Jamaica_road_sign_R35-4.png, Regulatory signs/Jamaica_road_sign_R35-5.png, MK_road_sign_232.png)
  • No Overtaking (Regulatory signs/CZ_road_sign_B-21a.png, Regulatory signs/Jamaica_road_sign_R35-7.png, Regulatory signs/Gemini_Generated_Image_og15teog15teog15.png)
  • No Sounding Horn — Hospital & Quiet Zones (Regulatory signs/Jamaica_road_sign_R37.png)
  • No Parking & No Stopping (Regulatory signs/France_road_sign_B6a1.png, Regulatory signs/France_road_sign_B6d.png, Gemini_Generated_Image_6aipv36aipv36aip.png, Gemini_Generated_Image_aro9kearo9kearo9 (1).png)
  • Maximum Speed Limits: 10 km/h, 30 km/h, 40 km/h, 50 km/h (Urban Default), 60 km/h, 70 km/h, 80 km/h (Highway Default) (Regulatory signs/Italian_traffic_signs_-_limite_di_velocità_10.png through 80.png).

- Article 40 (Mandatory Signs — Ibyapa bitegeka / Signaux d'Obligation):
  Blue circular signs with white symbols indicate compulsory paths or directions:
  • Mandatory Pedestrian Footpath (IR_road_sign_2-46.png, SADC_road_sign_R109.png, Thailand_road_sign_บ-46.png)
  • Mandatory Shared Path for Pedestrians & Cyclists (IE_road_sign_RUS-049.png, Gemini_Generated_Image_jbiyzojbiyzojbiy.png)
  • Mandatory Minimum Speed 30 km/h (Gemini_Generated_Image_1qeyvt1qeyvt1qey.png)
  • Mandatory Turn Directions & Keep Left/Right (HK_traffic_sign_106.png, Thailand_road_sign_บ-39.png, IE_road_sign_RUS-004.png, UA_road_sign_4.2.png, UK_traffic_sign_606_(right).png, Zeichen_209_-_Vorgeschriebene_Fahrtrichtung,_rechts,_StVO_2017.png, Italian_traffic_signs_-_direzioni_consentite_a_dritto_ed_a_destra.png).
`;

export function getSignCatalog(): SignCatalogEntry[] {
  return (signCatalogData as SignCatalogEntry[]) || [];
}

function getSignTitleByLanguage(sign: SignCatalogEntry, language: "English" | "French" | "Kinyarwanda"): string {
  if (language === "Kinyarwanda") return sign.title_rw || sign.title_en;
  if (language === "French") return sign.title_fr || sign.title_en;
  return sign.title_en;
}

function buildTiptapDoc(
  heading: string,
  intro: string,
  points: string[],
  takeaway: string,
  matchedSigns: EmbeddedSignInfo[],
  language: "English" | "French" | "Kinyarwanda"
) {
  const takeawayLabel =
    language === "Kinyarwanda"
      ? "Icyitonderwa cy'Itegeko: "
      : language === "French"
      ? "Règle Importante à Retenir : "
      : "Important Traffic Rule: ";

  const signsSectionHeading =
    language === "Kinyarwanda"
      ? "Ibyapa by'Umuhanda Birebana n'iyi Ngingo"
      : language === "French"
      ? "Panneaux de Signalisation Associés"
      : "Official Road Signs to Know";

  const content: any[] = [
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: heading }],
    },
    {
      type: "paragraph",
      content: [{ type: "text", text: intro }],
    },
  ];

  if (points.length > 0) {
    content.push({
      type: "bulletList",
      content: points.map((p) => ({
        type: "listItem",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: p }],
          },
        ],
      })),
    });
  }

  // Embed matched repository road signs with their visual explanation!
  if (matchedSigns && matchedSigns.length > 0) {
    content.push({
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: signsSectionHeading }],
    });

    for (const sign of matchedSigns) {
      content.push({
        type: "image",
        attrs: {
          src: sign.publicUrl,
          alt: sign.title,
          title: sign.title,
        },
      });
      content.push({
        type: "paragraph",
        content: [
          {
            type: "text",
            marks: [{ type: "bold" }],
            text: `${sign.title}: `,
          },
          {
            type: "text",
            text: sign.caption,
          },
        ],
      });
    }
  }

  if (takeaway) {
    content.push({
      type: "paragraph",
      attrs: { textAlign: "left" },
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: takeawayLabel,
        },
        {
          type: "text",
          text: takeaway,
        },
      ],
    });
  }

  return JSON.stringify({ type: "doc", content });
}

export interface GazetteFileData {
  base64: string;
  mimeType: string;
  name?: string;
}

export async function analyzeGazetteContent(
  gazetteText: string,
  adminInstructions: string,
  language: "English" | "French" | "Kinyarwanda" = "English",
  fileData?: GazetteFileData,
  useRepoSignCatalog: boolean = true
): Promise<GazetteAnalysisResult> {
  const catalog = getSignCatalog();
  const catalogByPath = new Map<string, SignCatalogEntry>();
  for (const s of catalog) {
    catalogByPath.set(s.path, s);
  }

  // Build compact visual catalog reference for Gemini so it can pick exact images by visual meaning
  const catalogDigest = useRepoSignCatalog
    ? catalog
        .map(
          (s) =>
            `- path: "${s.path}" | category: ${s.category} | EN: "${s.title_en}" | RW: "${s.title_rw}" | FR: "${s.title_fr}" | visual: ${s.visual_description}`
        )
        .join("\n")
    : "";

  const effectiveGazetteText =
    gazetteText && gazetteText.trim().length > 20
      ? gazetteText.slice(0, 80000)
      : OFFICIAL_RWANDA_GAZETTE_2026_DIGEST;

  const prompt = `You are a senior legal driving instructor and curriculum architect for the Rwanda Traffic and Highway Code (Amategeko y'Umuhanda mu Rwanda / Code de la route rwandais — Official Gazette 2026).

${fileData ? `An official Rwanda Traffic Gazette document "${fileData.name || "GAZZETE 2026.pdf"}" has been attached.` : ""}

OFFICIAL RWANDA TRAFFIC GAZETTE CONTENT & LEGAL ARTICLES:
"""
${effectiveGazetteText}
"""

ADMIN COMMAND / TOPIC FOCUS:
"""
${
  adminInstructions ||
  "Generate a complete module from the Gazette with clear notes and match the relevant road signs from the repository images folder."
}
"""

${
  useRepoSignCatalog
    ? `REPOSITORY ROAD SIGN VISUAL CATALOG (100 signs inspected via AI Vision — match by visual meaning, NEVER by filename alone):
"""
${catalogDigest}
"""`
    : ""
}

TARGET OUTPUT LANGUAGE: ${language}
(IMPORTANT: Write ALL titles, headings, paragraphs, bullet points, sign captions, takeaways, questions, options, and explanations 100% in fluent, natural ${language}!)

Generate a rich, comprehensive curriculum breakdown containing:
1. "moduleTitle" & "moduleDescription" in ${language}.
2. 3 to 4 lessons, each with 2 to 3 topics covering the Admin Command thoroughly.
3. For each topic, provide:
   - "title": Topic title in ${language}
   - "estimated_minutes": number between 4 and 10
   - "mainHeading": Clear section heading in ${language}
   - "introParagraph": Detailed educational explanation of the Gazette law articles in ${language}
   - "bulletPoints": 4 to 6 detailed bullet points explaining exact legal rules, obligations, distances, priorities, and safety practices in ${language}
   - "matchedSigns": Array of 1 to 4 road signs from the REPOSITORY ROAD SIGN VISUAL CATALOG above that visually illustrate this topic. For each matched sign provide:
     * "path": exact "path" string from the catalog above (e.g. "Regulatory signs/Gemini_Generated_Image_lixof8lixof8lixo.png" or "France_road_sign_B9a.png")
     * "title": Official name of the sign in ${language}
     * "caption": 1-2 sentence explanation in ${language} of how to recognize this sign visually (shape, color, symbol) and what rule it enforces for this topic
   - "keyTakeaway": Key legal rule or exam tip in ${language}
4. 6 to 8 exam questions directly testing the laws and road signs covered in the module (at least half of the questions should include a "question_image_path" referencing an exact "path" from the catalog above so students see the actual road sign picture in the quiz!).
5. "keyLawArticlesReferenced": List of Gazette articles referenced (e.g. "Article 14", "Article 16", "Article 36").

Return ONLY valid JSON matching this schema:
{
  "moduleTitle": string,
  "moduleDescription": string,
  "keyLawArticlesReferenced": string[],
  "lessons": [
    {
      "title": string,
      "short_description": string,
      "topics": [
        {
          "title": string,
          "estimated_minutes": number,
          "mainHeading": string,
          "introParagraph": string,
          "bulletPoints": string[],
          "matchedSigns": [
            {
              "path": string,
              "title": string,
              "caption": string
            }
          ],
          "keyTakeaway": string
        }
      ]
    }
  ],
  "questions": [
    {
      "question": string,
      "question_image_path": string,
      "type": "multiple_choice",
      "option_a": string,
      "option_b": string,
      "option_c": string,
      "option_d": string,
      "correct_answer": "A" | "B" | "C" | "D",
      "explanation": string
    }
  ]
}`;

  const contents: any = fileData?.base64
    ? [
        {
          inlineData: {
            mimeType: fileData.mimeType || "application/pdf",
            data: fileData.base64.replace(/^data:.*?;base64,/, ""),
          },
        },
        prompt,
      ]
    : prompt;

  const response = await generateContentWithFallback({
    contents,
    config: {
      responseMimeType: "application/json",
      temperature: 0.2,
    },
  });

  const rawText = response?.text || "{}";
  const cleaned = rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  const parsed = JSON.parse(cleaned);

  let totalMatchedSigns = 0;
  const allMatchedSigns: EmbeddedSignInfo[] = [];
  const globalSeenPaths = new Set<string>();

  const formattedLessons: GeneratedLesson[] = (parsed.lessons || []).map((l: any) => ({
    title: l.title || "Lesson",
    short_description: l.short_description || "",
    topics: (l.topics || []).map((tp: any) => {
      const resolvedSigns: EmbeddedSignInfo[] = [];
      const seenPaths = new Set<string>();

      for (const ms of tp.matchedSigns || []) {
        const entry = catalogByPath.get(ms.path);
        if (entry && !seenPaths.has(entry.path)) {
          seenPaths.add(entry.path);
          totalMatchedSigns++;
          const signInfo: EmbeddedSignInfo = {
            path: entry.path,
            publicUrl: entry.publicUrl,
            title: ms.title || getSignTitleByLanguage(entry, language),
            caption: ms.caption || entry.visual_description,
            category: entry.category,
          };
          resolvedSigns.push(signInfo);
          if (!globalSeenPaths.has(entry.path)) {
            globalSeenPaths.add(entry.path);
            allMatchedSigns.push(signInfo);
          }
        }
      }

      return {
        title: tp.title || "Topic",
        estimated_minutes: tp.estimated_minutes || 5,
        matchedSigns: resolvedSigns,
        content: buildTiptapDoc(
          tp.mainHeading || tp.title || "Traffic Regulations",
          tp.introParagraph || "",
          tp.bulletPoints || [],
          tp.keyTakeaway || "",
          resolvedSigns,
          language
        ),
      };
    }),
  }));

  const formattedQuestions: GeneratedQuestion[] = (parsed.questions || []).map((q: any) => {
    const signEntry = q.question_image_path ? catalogByPath.get(q.question_image_path) : undefined;
    return {
      question: q.question || "",
      question_image: signEntry ? signEntry.publicUrl : undefined,
      type: q.type === "true_false" ? "true_false" : "multiple_choice",
      option_a: q.option_a || "",
      option_b: q.option_b || "",
      option_c: q.option_c || "",
      option_d: q.option_d || "",
      correct_answer: (["A", "B", "C", "D"].includes(q.correct_answer) ? q.correct_answer : "A") as
        | "A"
        | "B"
        | "C"
        | "D",
      explanation: q.explanation || "",
    };
  });

  return {
    moduleTitle: parsed.moduleTitle || "Rwanda Traffic Regulations Update",
    moduleDescription:
      parsed.moduleDescription || "Updated rules and road signs from the Official Rwanda Traffic Gazette.",
    lessons: formattedLessons,
    questions: formattedQuestions,
    keyLawArticlesReferenced: parsed.keyLawArticlesReferenced || [],
    matchedSignsCount: totalMatchedSigns,
    matchedSigns: allMatchedSigns,
  };
}
