export const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash';

const DEPRECATED_GEMINI_MODELS = new Set([
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-2.0-flash',
  'gemini-2.0-pro',
]);

export function resolveGeminiModel(...candidates: Array<string | undefined>): string {
  const model = candidates.map((candidate) => candidate?.trim()).find(Boolean);

  if (!model || DEPRECATED_GEMINI_MODELS.has(model)) {
    return DEFAULT_GEMINI_MODEL;
  }

  return model;
}
