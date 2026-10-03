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

MANDATORY TRANSLATION DIRECTIVE:
- The source text is in ${sourceLang}.
- You MUST translate each snippet COMPLETELY into ${targetLang}.
- DO NOT leave words, sentences, or phrases in ${sourceLang}.
- Every translated item MUST be in natural, grammatically correct ${targetLang} using official Rwanda Highway Code terms.

OFFICIAL TERMINOLOGY GUIDE:
- For English:
  * "Ibyapa byo ku muhanda" / "Panneaux de signalisation" -> "Road signs" / "Traffic signs"
  * "Ibyapa bibuza" / "Panneaux d'interdiction" -> "Prohibitory signs"
  * "Ibyapa by'integuza" / "Panneaux de danger" -> "Warning signs"
  * "Ibyapa bitegeka" / "Panneaux d'obligation" -> "Mandatory signs"
  * "Amatara yo ku muhanda" / "Feux de signalisation" -> "Traffic lights"
  * "Uburenganzira bwo gutambuka mbere" / "Priorité de passage" -> "Right of way / Priority"
  * "Kunyuranaho" / "Dépassement" -> "Overtaking"
  * "Ihuriro ry'imihanda ririmo uruziga" / "Rond-point" -> "Roundabout"
  * "Uruhushya rw'agateganyo" / "Permis provisoire" -> "Provisional driving license"
  * "Uruhushya rwa burundu" / "Permis définitif" -> "Definitive driving license"
  * "Ahabugenewe abanyamaguru bambukira" / "Passage pour piétons" -> "Pedestrian crossing"
  * "Ikinyabiziga" / "Véhicule" -> "Vehicle"
  * "Umuhanda" / "Chaussée / Route" -> "Road / Carriageway"

- For French (Code de la route rwandais):
  * "Traffic signs" / "Ibyapa" -> "Panneaux de signalisation"
  * "Traffic lights" / "Amatara" -> "Feux de signalisation"
  * "Right of way" / "Gutambuka mbere" -> "Priorité de passage"
  * "Roundabout" / "Uruziga" -> "Carrefour à sens giratoire (Rond-point)"
  * "Pedestrian crossing" / "Ahabugenewe abanyamaguru" -> "Passage pour piétons"
  * "Speed limit" / "Umuvuduko ntarengwa" -> "Limitation de vitesse"
  * "Overtaking" / "Kunyuranaho" -> "Dépassement"
  * "Driver's license" / "Uruhushya" -> "Permis de conduire"
  * "Provisional permit" / "Agateganyo" -> "Permis provisoire"
  * "Continuous white line" / "Umurongo wera udacitse" -> "Ligne blanche continue"

- For Kinyarwanda:
  * "Traffic signs" -> "Ibyapa byo ku muhanda"
  * "Warning signs" -> "Ibyapa by'integuza"
  * "Prohibitory signs" -> "Ibyapa bibuza"
  * "Mandatory signs" -> "Ibyapa bitegeka"
  * "Traffic lights" -> "Amatara yo ku muhanda"
  * "Right of way" -> "Uburenganzira bwo gutambuka mbere"
  * "Overtaking" -> "Kunyuranaho"
  * "Roundabout" -> "Ihuriro ry'imihanda ririmo uruziga"
  * "Pedestrian crossing" -> "Ahabugenewe abanyamaguru"
  * "Vehicle" -> "Ikinyabiziga"

OUTPUT RULES:
1. Return ONLY a valid JSON object matching this schema:
   {
     "translations": [
       { "id": 0, "translatedText": "Translated text in ${targetLang}" }
     ]
   }
2. Preserve all punctuation, formatting, and numbering.
3. Every single input item must have a matching entry with the exact same numeric ID.`;
}

function cleanJsonString(raw: string): string {
  if (!raw) return "{}";
  let cleaned = raw.trim();
  // Strip markdown code fences if present
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "");
    cleaned = cleaned.replace(/\s*```$/i, "");
    cleaned = cleaned.trim();
  }
  return cleaned;
}

/**
 * Translates an array of text snippets using Gemini with fallback.
 */
export async function translateTextSnippets(
  snippets: TextSnippet[],
  sourceLang: TargetLanguage | string,
  targetLang: TargetLanguage | string
): Promise<Map<number, string>> {
  if (snippets.length === 0) {
    return new Map();
  }

  // Batch process in chunks of 40 to avoid token limits
  const BATCH_SIZE = 40;
  const resultMap = new Map<number, string>();

  for (let i = 0; i < snippets.length; i += BATCH_SIZE) {
    const chunk = snippets.slice(i, i + BATCH_SIZE);

    const prompt = `Translate the following text items from ${sourceLang} to ${targetLang}. Ensure every output translatedText is completely written in ${targetLang}:\n` +
      JSON.stringify(chunk, null, 2);

    try {
      const response = await generateContentWithFallback({
        contents: prompt,
        config: {
          systemInstruction: getSystemPrompt(sourceLang, targetLang),
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      });

      const rawText = response?.text || "{}";
      const cleaned = cleanJsonString(rawText);

      let parsed: any = null;
      try {
        parsed = JSON.parse(cleaned);
      } catch (parseErr) {
        // Try extracting JSON object or array via regex
        const arrayMatch = cleaned.match(/\[\s*\{[\s\S]*\}\s*\]/);
        const objMatch = cleaned.match(/\{[\s\S]*\}/);
        if (arrayMatch) {
          try { parsed = JSON.parse(arrayMatch[0]); } catch {}
        } else if (objMatch) {
          try { parsed = JSON.parse(objMatch[0]); } catch {}
        }
      }

      let items: any[] = [];
      if (Array.isArray(parsed)) {
        items = parsed;
      } else if (Array.isArray(parsed?.translations)) {
        items = parsed.translations;
      } else if (Array.isArray(parsed?.data)) {
        items = parsed.data;
      } else if (Array.isArray(parsed?.items)) {
        items = parsed.items;
      } else if (parsed && typeof parsed === "object") {
        // Check if single object returned with { id, translatedText }
        if (parsed.id !== undefined && (parsed.translatedText || parsed.text || parsed.translation)) {
          items = [parsed];
        } else if (parsed.translatedText || parsed.translation || parsed.translated_text) {
          // Single translation without explicit ID, map to first chunk item
          items = [{ id: chunk[0]?.id ?? 0, translatedText: parsed.translatedText || parsed.translation || parsed.translated_text }];
        } else {
          // Check if object keys are IDs: { "0": "Translated Title", "1": "..." }
          for (const key of Object.keys(parsed)) {
            const numKey = Number(key);
            if (!isNaN(numKey) && typeof parsed[key] === "string") {
              items.push({ id: numKey, translatedText: parsed[key] });
            }
          }
        }
      }

      for (const item of items) {
        const idVal = item.id !== undefined ? Number(item.id) : undefined;
        const textVal =
          typeof item.translatedText === "string"
            ? item.translatedText
            : typeof item.translated_text === "string"
            ? item.translated_text
            : typeof item.translation === "string"
            ? item.translation
            : typeof item.text === "string"
            ? item.text
            : null;

        if (idVal !== undefined && !isNaN(idVal) && textVal !== null && textVal.trim().length > 0) {
          resultMap.set(idVal, textVal.trim());
        }
      }

      // Check if any item in the chunk was missed - retry missed items in ONE single fallback batch
      const missed = chunk.filter((item) => !resultMap.has(item.id));
      if (missed.length > 0 && missed.length <= chunk.length) {
        try {
          await new Promise((resolve) => setTimeout(resolve, 500));
          const retryPrompt =
            `Translate the following remaining text snippets from ${sourceLang} to ${targetLang}:\n` +
            JSON.stringify(missed, null, 2);
          const retryRes = await generateContentWithFallback({
            contents: retryPrompt,
            config: {
              systemInstruction: getSystemPrompt(sourceLang, targetLang),
              responseMimeType: "application/json",
              temperature: 0.1,
            },
          });
          const retryCleaned = cleanJsonString(retryRes?.text || "{}");
          let retryParsed: any = null;
          try {
            retryParsed = JSON.parse(retryCleaned);
          } catch {}
          const retryItems = Array.isArray(retryParsed)
            ? retryParsed
            : Array.isArray(retryParsed?.translations)
            ? retryParsed.translations
            : [];
          for (const rItem of retryItems) {
            const rId = rItem.id !== undefined ? Number(rItem.id) : undefined;
            const rText = rItem.translatedText || rItem.text || rItem.translation;
            if (rId !== undefined && typeof rText === "string" && rText.trim()) {
              resultMap.set(rId, rText.trim());
            }
          }
        } catch (retryErr) {
          console.warn("[Translator] Batch retry missed items skipped:", retryErr);
        }
      }

      // Fill any remaining unmapped items with original text to preserve document structure
      for (const item of chunk) {
        if (!resultMap.has(item.id)) {
          resultMap.set(item.id, item.text);
        }
      }

      // Small throttle between batches to avoid RPM quota spikes
      if (i + BATCH_SIZE < snippets.length) {
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
    } catch (err: any) {
      console.error("Translation batch failed:", err);
      throw new Error(`AI translation error: ${err?.message || "Failed to generate translated text. Please retry."}`);
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
