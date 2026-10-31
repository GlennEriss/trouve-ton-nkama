import { isGeminiEnabled } from '@/hooks/use-ai-capabilities';

describe('AI capabilities fail closed', () => {
  afterEach(() => jest.restoreAllMocks());
  it.each([
    [{ provider: 'gemini', enabled: true }, true],
    [{ provider: 'none', enabled: false }, false],
    [{ provider: 'gemini', enabled: false }, false],
    [{ enabled: true }, false],
  ])('accepts only explicit enabled Gemini: %j', async (payload, expected) => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => payload });
    expect(await isGeminiEnabled()).toBe(expected);
    expect(fetch).toHaveBeenCalledWith('/api/ai/capabilities', expect.objectContaining({ cache: 'no-store', signal: expect.any(AbortSignal) }));
  });
  it('does not enable AI on HTTP, network or malformed JSON errors', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: false })
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ ok: true, json: async () => { throw new Error('invalid JSON'); } });
    expect(await isGeminiEnabled()).toBe(false);
    expect(await isGeminiEnabled()).toBe(false);
    expect(await isGeminiEnabled()).toBe(false);
  });
});
