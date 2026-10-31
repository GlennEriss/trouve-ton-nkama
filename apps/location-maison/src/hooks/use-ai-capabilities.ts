'use client';
import { useEffect, useState } from 'react';

export async function isGeminiEnabled(): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch('/api/ai/capabilities', { cache: 'no-store', signal: controller.signal });
    if (!response.ok) return false;
    const data = await response.json();
    return data.provider === 'gemini' && data.enabled === true;
  } catch { return false; }
  finally { clearTimeout(timeout); }
}

export function useAICapabilities() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    void isGeminiEnabled().then((value) => {
      if (active) { setEnabled(value); setLoading(false); }
    });
    return () => { active = false; };
  }, []);
  return { enabled, loading };
}
