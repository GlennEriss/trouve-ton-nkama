import { AppError } from '@/lib/errors/app-error';

export type AIProviderName = 'none' | 'gemini';

/** Server authority. Missing/invalid configuration is deliberately fail-closed. */
export function getAIProviderName(): AIProviderName {
  return process.env.AI_PROVIDER === 'gemini' ? 'gemini' : 'none';
}

export function requireGemini(): void {
  if (getAIProviderName() !== 'gemini') {
    throw new AppError('L’assistance IA est désactivée. Utilisez la saisie manuelle.', {
      code: 'AI_DISABLED', status: 409,
    });
  }
}

/** Keeps the existing Gemini implementation, without loading its SDK in manual mode. */
export async function withAIProvider<T>(gemini: () => Promise<T>, withoutAI: () => T | Promise<T>): Promise<T> {
  return getAIProviderName() === 'gemini' ? gemini() : withoutAI();
}
