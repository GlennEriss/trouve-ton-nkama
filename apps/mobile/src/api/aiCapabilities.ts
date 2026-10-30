import { apiFetch } from './client';

export async function isGeminiEnabled(): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const data = await apiFetch<{ provider: string; enabled: boolean }>('/api/ai/capabilities', { signal: controller.signal });
    return data.provider === 'gemini' && data.enabled === true;
  } catch { return false; }
  finally { clearTimeout(timeout); }
}
