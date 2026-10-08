export interface TTSConfig {
  masterEnabled: boolean;
  kinyarwandaEnabled: boolean;
  englishEnabled: boolean;
  frenchEnabled: boolean;
  learningEnabled: boolean;
  examsEnabled: boolean;
  preferImportedAudio: boolean;
  geminiNeuralEnabled: boolean;
  geminiKinyarwandaEnabled: boolean;
  geminiEnglishEnabled: boolean;
  geminiFrenchEnabled: boolean;
  geminiVoice: "Kore" | "Puck" | "Charon" | "Fenrir" | "Zephyr";
}

export const DEFAULT_TTS_CONFIG: TTSConfig = {
  masterEnabled: true,
  kinyarwandaEnabled: true,
  englishEnabled: true,
  frenchEnabled: true,
  learningEnabled: true,
  examsEnabled: true,
  preferImportedAudio: true,
  geminiNeuralEnabled: true,
  geminiKinyarwandaEnabled: true,
  geminiEnglishEnabled: true,
  geminiFrenchEnabled: true,
  geminiVoice: "Kore",
};

export interface ImportedTTSAudioRecord {
  id: string;
  entityId: string;
  entityTitle: string;
  entityType: "question" | "topic" | "lesson" | "custom";
  language: string; // e.g. "Kinyarwanda" | "English" | "French"
  audioUrl: string;
  durationSeconds?: number;
  fileSize?: number;
  notes?: string;
  importedAt: string;
  importedBy?: string;
}

/**
 * Normalizes language name to standard format
 */
export function normalizeTTSLanguage(lang: string): string {
  if (!lang) return "English";
  const lower = lang.toLowerCase().trim();
  if (lower.includes("kinya") || lower === "rw" || lower === "rwanda") return "Kinyarwanda";
  if (lower.includes("fren") || lower === "fr") return "French";
  return "English";
}

/**
 * Helper to check if TTS is active for a given language based on config
 */
export function isLanguageTTSEnabled(
  config: TTSConfig,
  language: string,
  scope?: "learning" | "exams"
): boolean {
  if (!config.masterEnabled) return false;
  if (scope === "learning" && !config.learningEnabled) return false;
  if (scope === "exams" && !config.examsEnabled) return false;

  const normalized = normalizeTTSLanguage(language);
  if (normalized === "Kinyarwanda") return config.kinyarwandaEnabled;
  if (normalized === "French") return config.frenchEnabled;
  return config.englishEnabled;
}
