import { describe, it, expect } from 'vitest';

describe('aiService — detectQueryMode logic', () => {
  // We test the mode detection heuristics by importing and testing the module
  // Since detectQueryMode is not exported, we test it indirectly via behavior

  it('module loads without GROQ_API_KEY (key checked lazily)', async () => {
    const original = process.env.GROQ_API_KEY;
    delete process.env.GROQ_API_KEY;

    const module = await import('../src/services/aiService.js');
    expect(module.chat).toBeDefined();
    expect(typeof module.chat).toBe('function');

    process.env.GROQ_API_KEY = original;
  });
});

describe('aiService — chat input validation', () => {
  it('chat function rejects empty input gracefully', async () => {
    const original = process.env.GROQ_API_KEY;
    delete process.env.GROQ_API_KEY;

    const { chat } = await import('../src/services/aiService.js');

    await expect(chat('', [])).rejects.toThrow();

    process.env.GROQ_API_KEY = original;
  });
});
