import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('server integration tests', () => {
  let baseUrl;
  let serverProcess;

  beforeAll(async () => {
    const port = 3099;
    process.env.PORT = String(port);
    baseUrl = `http://localhost:${port}`;

    // Import and start server module dynamically
    // We test against the running dev server on port 3000 instead
    baseUrl = 'http://localhost:3000';
  });

  afterAll(() => {
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
    }
  });

  it('GET /health returns ok', async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('uptime');
  });

  it('GET /api/alerts returns valid shape', async () => {
    const res = await fetch(`${baseUrl}/api/alerts`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data).toHaveProperty('alerts');
    expect(Array.isArray(data.alerts)).toBe(true);
    expect(data).toHaveProperty('marketStatus');
    expect(data).toHaveProperty('universeId');
  });

  it('GET /api/alerts/status returns market status', async () => {
    const res = await fetch(`${baseUrl}/api/alerts/status`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data).toHaveProperty('isOpen');
    expect(data).toHaveProperty('currentTime');
    expect(data).toHaveProperty('timezone', 'America/New_York');
  });

  it('GET /api/universes returns all universes', async () => {
    const res = await fetch(`${baseUrl}/api/universes`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(6);

    const ids = data.map(u => u.id);
    expect(ids).toContain('SP100');
    expect(ids).toContain('TECH_USA');
    expect(ids).toContain('CUSTOM');
  });

  it('GET /api/universes/SP100 returns symbols', async () => {
    const res = await fetch(`${baseUrl}/api/universes/SP100`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.id).toBe('SP100');
    expect(Array.isArray(data.symbols)).toBe(true);
    expect(data.symbols.length).toBeGreaterThan(0);
  });

  it('GET /api/universes/NONEXISTENT returns 404', async () => {
    const res = await fetch(`${baseUrl}/api/universes/NONEXISTENT`);
    expect(res.status).toBe(404);
  });

  it('POST /api/ai/chat validates empty message', async () => {
    const res = await fetch(`${baseUrl}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '', context: [] })
    });
    expect(res.status).toBe(400);
  });

  it('POST /api/ai/chat validates message length', async () => {
    const longMessage = 'x'.repeat(1001);
    const res = await fetch(`${baseUrl}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: longMessage, context: [] })
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('too long');
  });

  it('POST /api/ai/chat returns AI response for valid message', async () => {
    const res = await fetch(`${baseUrl}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'What is RSI?', context: [] })
    });
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(typeof data.response).toBe('string');
    expect(data.response.length).toBeGreaterThan(0);
  });

  it('serves static frontend at /', async () => {
    const res = await fetch(`${baseUrl}/`);
    expect(res.ok).toBe(true);
    const html = await res.text();
    expect(html).toContain('Alertas de Trading');
    expect(html).toContain('<!DOCTYPE html>');
  });

  it('security headers are present (helmet)', async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-frame-options')).toBeTruthy();
  });
});
