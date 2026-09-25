import { generateContentWithFallback } from "./gemini-client";

export interface GeneratedTopic {
  title: string;
  estimated_minutes: number;
  content: string; // Tiptap JSON string
}

export interface GeneratedLesson {
  title: string;
  short_description?: string;
  topics: GeneratedTopic[];
}

export interface GeneratedQuestion {
  question: string;
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
}

function buildTiptapDoc(heading: string, intro: string, points: string[], takeaway: string) {
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

  if (takeaway) {
    content.push({
      type: "paragraph",
      attrs: { textAlign: "left" },
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Important Rule / Icyitonderwa: ",
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

export async function analyzeGazetteContent(
  gazetteText: string,
  adminInstructions: string,
  language: "English" | "French" | "Kinyarwanda" = "English"
): Promise<GazetteAnalysisResult> {
  const prompt = `You are a legal driving instructor and expert on the Rwanda Traffic and Highway Code (Amategeko y'Umuhanda mu Rwanda / Code de la route rwandais).

GAZETTE TEXT / LAW UPDATE:
"""
${gazetteText.slice(0, 80000)}
"""

ADMIN INSTRUCTIONS:
"""
${adminInstructions || "Extract all essential traffic rules, new regulations, penalties, and signs into structured lessons and exam questions."}
"""

OUTPUT LANGUAGE: ${language}

Generate a structured curriculum breakdown containing:
1. Module title & description.
2. 2 to 4 lessons, each with 2 to 3 topics.
3. For each topic, provide:
   - title
   - estimated_minutes (number between 3 and 10)
   - mainHeading
   - introParagraph
   - bulletPoints (3-5 clear bullet points explaining rules)
   - keyTakeaway
4. 3 to 6 exam questions directly testing the laws in the text.
5. The law articles referenced (e.g. "Article 42", "Article 56").

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
          "keyTakeaway": string
        }
      ]
    }
  ],
  "questions": [
    {
      "question": string,
      "type": "multiple_choice",
      "option_a": string,
      "option_b": string,
      "option_c": string,
      "option_d": string,
      "correct_answer": "A",
      "explanation": string
    }
  ]
}`;

  const response = await generateContentWithFallback({
    contents: prompt,
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

  const formattedLessons: GeneratedLesson[] = (parsed.lessons || []).map((l: any) => ({
    title: l.title || "Lesson",
    short_description: l.short_description || "",
    topics: (l.topics || []).map((tp: any) => ({
      title: tp.title || "Topic",
      estimated_minutes: tp.estimated_minutes || 5,
      content: buildTiptapDoc(
        tp.mainHeading || tp.title || "Traffic Regulations",
        tp.introParagraph || "",
        tp.bulletPoints || [],
        tp.keyTakeaway || ""
      ),
    })),
  }));

  return {
    moduleTitle: parsed.moduleTitle || "Rwanda Traffic Regulations Update",
    moduleDescription: parsed.moduleDescription || "Updated rules from the Official Rwanda Traffic Gazette.",
    lessons: formattedLessons,
    questions: parsed.questions || [],
    keyLawArticlesReferenced: parsed.keyLawArticlesReferenced || [],
  };
}
