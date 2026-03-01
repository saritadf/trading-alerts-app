import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('finnhub service', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.FINNHUB_KEY = 'test_key';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('isMarketOpen returns boolean', async () => {
    const { isMarketOpen } = await import('../src/services/finnhub.js');
    const result = isMarketOpen();
    expect(typeof result).toBe('boolean');
  });

  it('getMarketStatus returns correct shape', async () => {
    const { getMarketStatus } = await import('../src/services/finnhub.js');
    const status = getMarketStatus();

    expect(status).toHaveProperty('isOpen');
    expect(status).toHaveProperty('currentTime');
    expect(status).toHaveProperty('timezone', 'America/New_York');
    expect(typeof status.isOpen).toBe('boolean');
    expect(typeof status.currentTime).toBe('string');
  });

  it('getMarketStatus detects weekends as closed', async () => {
    const { getMarketStatus } = await import('../src/services/finnhub.js');
    const now = new Date();
    const day = new Date(
      now.toLocaleString('en-US', { timeZone: 'America/New_York' })
    ).getDay();

    const status = getMarketStatus();

    if (day === 0 || day === 6) {
      expect(status.isOpen).toBe(false);
    }
  });
});
