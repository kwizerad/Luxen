import { generateContentWithFallback } from "./gemini-client";

export type TargetLanguage = "French" | "Kinyarwanda" | "English";

export interface TextSnippet {
  id: number;
  text: string;
}

/**
 * Extracts all text leaf nodes from a Tiptap document tree,
 * assigning a zero-based sequence ID to each text node.
 */
export function extractTextNodes(doc: any): TextSnippet[] {
  const snippets: TextSnippet[] = [];
  let currentId = 0;

  function walk(node: any) {
    if (!node || typeof node !== "object") return;

    if (node.type === "text" && typeof node.text === "string") {
      const trimmed = node.text.trim();
      if (trimmed.length > 0) {
        snippets.push({ id: currentId, text: node.text });
      }
      currentId++;
      return;
    }

    if (Array.isArray(node.content)) {
      for (const child of node.content) {
        walk(child);
      }
    }
  }

  walk(doc);
  return snippets;
}

/**
 * Clones the source Tiptap AST and replaces the text of each text node
 * with its corresponding translated string from the translation map.
 * All formatting, styles, images, spacing, marks, and attributes are 100% preserved.
 */
export function injectTranslatedTextNodes(sourceDoc: any, translationMap: Map<number, string>): any {
  let currentId = 0;

  function walkAndReplace(node: any): any {
    if (!node || typeof node !== "object") return node;

    // Deep clone the node
    const clone = Array.isArray(node) ? [...node] : { ...node };

    if (clone.type === "text" && typeof clone.text === "string") {
      const thisId = currentId++;
      if (translationMap.has(thisId)) {
        clone.text = translationMap.get(thisId)!;
      }
      return clone;
    }

    if (Array.isArray(clone.content)) {
      clone.content = clone.content.map((child: any) => walkAndReplace(child));
    }

    return clone;
  }

  return walkAndReplace(sourceDoc);
}

/**
 * System prompt tailored specifically for Rwanda Road Traffic & Highway Code.
 */
function getSystemPrompt(sourceLang: string, targetLang: string): string {
  return `You are a certified professional translator specializing in the Rwanda Road Traffic Regulations (Official Gazette of Rwanda, Code de la Route Rwandais, Amategeko n'amabwiriza by'Umuhanda mu Rwanda).

Your task is to translate an array of text snippets from ${sourceLang} to ${targetLang}.

CRITICAL TERMINOLOGY INSTRUCTIONS:
- For French (Code de la route rwandais):
  * "Traffic signs" -> "Panneaux de signalisation"
  * "Traffic lights / robot" -> "Feux de signalisation" / "Feu tricolore"
  * "Right of way / priority" -> "Priorité de passage" / "Priorité à droite"
  * "Roundabout" -> "Carrefour à sens giratoire" / "Rond-point"
  * "Pedestrian crossing" -> "Passage pour piétons" / "Passage clouté"
  * "Speed limit" -> "Limitation de vitesse"
  * "Overtaking" -> "Dépassement"
  * "Driver's license / Provisional permit" -> "Permis de conduire" / "Permis provisoire"
  * "Fine / Penalty" -> "Amende" / "Sanction"
  * "Continuous white line" -> "Ligne blanche continue"

- For Kinyarwanda (Amategeko y'Umuhanda mu Rwanda):
  * "Traffic signs" -> "Ibyapa byo ku muhanda"
  * "Warning signs" -> "Ibyapa by'integuza"
  * "Prohibitory signs" -> "Ibyapa bibuza"
  * "Mandatory signs" -> "Ibyapa bitegeka"
  * "Traffic lights" -> "Amatara yo ku muhanda"
  * "Roundabout" -> "Ihuriro ry'imihanda ririmo uruziga (Rond-point)"
  * "Right of way" -> "Uburenganzira bwo gutambuka mbere"
  * "Overtaking" -> "Kunyuranaho"
  * "Provisional license" -> "Uruhushya rw'agateganyo rwo gutwara ibinyabiziga"
  * "Definitive license" -> "Uruhushya rwa burundu rwo gutwara ibinyabiziga"
  * "Pedestrian crossing" -> "Ahabugenewe abanyamaguru bambukira umuhanda"
  * "Vehicle" -> "Ikinyabiziga"

RULES:
1. Translate each item accurately while preserving all punctuation, capitalization, and tone.
2. Return ONLY a valid JSON object of the schema:
   {
     "translations": [
       { "id": number, "translatedText": string }
     ]
   }
3. Do not omit any IDs. Every item in the input list must have a corresponding translated item with the exact same ID.`;
}

/**
 * Translates an array of text snippets using Gemini 3.8 Flash.
 */
export async function translateTextSnippets(
  snippets: TextSnippet[],
  sourceLang: TargetLanguage | string,
  targetLang: TargetLanguage | string
): Promise<Map<number, string>> {
  if (snippets.length === 0) {
    return new Map();
  }

  // Batch process in chunks of 50 to avoid token limits
  const BATCH_SIZE = 50;
  const resultMap = new Map<number, string>();

  for (let i = 0; i < snippets.length; i += BATCH_SIZE) {
    const chunk = snippets.slice(i, i + BATCH_SIZE);

    const prompt = `Translate the following text items from ${sourceLang} to ${targetLang}:\n` +
      JSON.stringify(chunk, null, 2);

    try {
      const response = await generateContentWithFallback({
        contents: prompt,
        config: {
          systemInstruction: getSystemPrompt(sourceLang, targetLang),
          responseMimeType: "application/json",
          temperature: 0.2, // Low temperature for high accuracy
        },
      });

      const rawText = response?.text || "{}";
      const cleaned = rawText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();
      const parsed = JSON.parse(cleaned);

      if (Array.isArray(parsed.translations)) {
        for (const item of parsed.translations) {
          if (typeof item.id === "number" && typeof item.translatedText === "string") {
            resultMap.set(item.id, item.translatedText);
          }
        }
      }
    } catch (err) {
      console.error("Translation batch failed, falling back to original text:", err);
      // Fallback: keep original text for this batch
      for (const item of chunk) {
        if (!resultMap.has(item.id)) {
          resultMap.set(item.id, item.text);
        }
      }
    }
  }

  return resultMap;
}

/**
 * Translates a complete Tiptap JSON document string from one language to another,
 * guaranteeing 100% preservation of all layouts, images, styles, spacing, and formatting.
 */
export async function translateTiptapDoc(
  tiptapJsonString: string,
  sourceLang: TargetLanguage | string,
  targetLang: TargetLanguage | string
): Promise<string> {
  if (!tiptapJsonString || tiptapJsonString.trim() === "") {
    return tiptapJsonString;
  }

  let doc: any;
  try {
    doc = typeof tiptapJsonString === "string" ? JSON.parse(tiptapJsonString) : tiptapJsonString;
  } catch {
    // If not valid JSON, treat as plain text
    const map = await translateTextSnippets([{ id: 0, text: tiptapJsonString }], sourceLang, targetLang);
    return map.get(0) || tiptapJsonString;
  }

  const snippets = extractTextNodes(doc);
  if (snippets.length === 0) {
    // No text to translate (e.g. only images or empty paragraphs)
    return typeof tiptapJsonString === "string" ? tiptapJsonString : JSON.stringify(tiptapJsonString);
  }

  const translationMap = await translateTextSnippets(snippets, sourceLang, targetLang);
  const translatedDoc = injectTranslatedTextNodes(doc, translationMap);

  return JSON.stringify(translatedDoc);
}

/**
 * Syncs formatting from a master source document to an existing target document.
 * This takes the master's layout, spacing, attributes, and images, and overlays
 * the target's translated text into the corresponding nodes.
 * If new text was added to the master, it gets translated automatically.
 */
export async function syncFormattingAST(
  masterDocJson: string,
  targetDocJson: string,
  sourceLang: TargetLanguage | string,
  targetLang: TargetLanguage | string
): Promise<string> {
  let masterDoc: any;
  let targetDoc: any;

  try {
    masterDoc = typeof masterDocJson === "string" ? JSON.parse(masterDocJson) : masterDocJson;
  } catch {
    return masterDocJson;
  }

  try {
    targetDoc = typeof targetDocJson === "string" ? JSON.parse(targetDocJson) : targetDocJson;
  } catch {
    targetDoc = null;
  }

  const masterSnippets = extractTextNodes(masterDoc);
  const targetSnippets = targetDoc ? extractTextNodes(targetDoc) : [];

  // Match target snippets to master snippets by index
  const translationMap = new Map<number, string>();
  const missingSnippets: TextSnippet[] = [];

  for (let i = 0; i < masterSnippets.length; i++) {
    const masterSnippet = masterSnippets[i];
    if (i < targetSnippets.length && targetSnippets[i]?.text) {
      // Use existing target translation
      translationMap.set(masterSnippet.id, targetSnippets[i].text);
    } else {
      // New text added in master that needs translation into targetLang
      missingSnippets.push(masterSnippet);
    }
  }

  if (missingSnippets.length > 0) {
    const translatedMissing = await translateTextSnippets(missingSnippets, sourceLang, targetLang);
    for (const [id, text] of translatedMissing.entries()) {
      translationMap.set(id, text);
    }
  }

  const syncedDoc = injectTranslatedTextNodes(masterDoc, translationMap);
  return JSON.stringify(syncedDoc);
}
