import { NextResponse } from 'next/server';
import { getAIProviderName } from '@/lib/ai/provider';

export const dynamic = 'force-dynamic';

export function GET() {
  const provider = getAIProviderName();
  return NextResponse.json({ provider, enabled: provider === 'gemini' }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
