import { getAIProviderName, requireGemini, withAIProvider } from '@/lib/ai/provider';
import { POST as propertyDraft } from '@/app/api/ai/property-draft/route';
import { POST as categoryDraft } from '@/app/api/ai/category-listing-draft/route';
import { GET as capabilities } from '@/app/api/ai/capabilities/route';
import { auth } from '@/next-auth/auth';

jest.mock('@/next-auth/auth', () => ({ auth: jest.fn() }));
jest.mock('@/lib/server/authenticated-uid', () => ({ resolveAuthenticatedUid: jest.fn() }));
jest.mock('next/server', () => ({ NextResponse: { json: (body: unknown, init?: { status?: number; headers?: object }) => ({ status: init?.status ?? 200, headers: init?.headers, json: async () => body }) } }));
jest.mock('@/lib/logger', () => ({ createLogger: () => ({ error: jest.fn(), warn: jest.fn() }) }));
jest.mock('@google/generative-ai', () => { throw new Error('Gemini SDK must not load in none mode'); });

describe('AI provider switch', () => {
  const original = process.env.AI_PROVIDER;
  afterEach(() => { if (original === undefined) delete process.env.AI_PROVIDER; else process.env.AI_PROVIDER = original; });

  it.each([undefined, 'none', 'invalid', 'GEMINI'])('fails closed for %s', async (value) => {
    if (value === undefined) delete process.env.AI_PROVIDER; else process.env.AI_PROVIDER = value;
    expect(getAIProviderName()).toBe('none');
    expect(requireGemini).toThrow();
    const gemini = jest.fn();
    await expect(withAIProvider(gemini, () => 'manual')).resolves.toBe('manual');
    expect(gemini).not.toHaveBeenCalled();
    expect(await capabilities().json()).toEqual({ provider: 'none', enabled: false });
  });

  it('reactivates Gemini explicitly without changing code', async () => {
    process.env.AI_PROVIDER = 'gemini';
    expect(requireGemini).not.toThrow();
    const manual = jest.fn();
    await expect(withAIProvider(async () => 'generated', manual)).resolves.toBe('generated');
    expect(manual).not.toHaveBeenCalled();
    expect(await capabilities().json()).toEqual({ provider: 'gemini', enabled: true });
  });

  it.each([propertyDraft, categoryDraft])('blocks draft endpoints before provider/DB/credits', async (post) => {
    process.env.AI_PROVIDER = 'none';
    const json = jest.fn();
    const response = await post({ json } as never);
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: { code: 'AI_DISABLED' } });
    expect(json).not.toHaveBeenCalled();
    expect(auth).not.toHaveBeenCalled();
  });
});
