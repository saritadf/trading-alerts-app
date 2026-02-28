import { describe, it, expect } from 'vitest';
import {
  UNIVERSES,
  getUniverseSymbols,
  getAllUniverses,
  getUniverseInfo,
} from '../src/services/universes.js';

describe('universes service', () => {
  it('UNIVERSES contains all expected keys', () => {
    expect(UNIVERSES).toHaveProperty('SP100');
    expect(UNIVERSES).toHaveProperty('TECH_USA');
    expect(UNIVERSES).toHaveProperty('BANKS_USA');
    expect(UNIVERSES).toHaveProperty('ENERGY');
    expect(UNIVERSES).toHaveProperty('CUSTOM');
  });

  it('each universe has required fields', () => {
    for (const [key, universe] of Object.entries(UNIVERSES)) {
      expect(universe.id).toBe(key);
      expect(typeof universe.name).toBe('string');
      expect(typeof universe.description).toBe('string');
      expect(typeof universe.maxSymbols).toBe('number');
    }
  });

  it('all text is in English (no Spanish characters)', () => {
    for (const universe of Object.values(UNIVERSES)) {
      expect(universe.name).not.toMatch(/[áéíóúñ¿¡]/);
      expect(universe.description).not.toMatch(/[áéíóúñ¿¡]/);
    }
  });

  it('getUniverseSymbols returns array for SP100', () => {
    const symbols = getUniverseSymbols('SP100');
    expect(Array.isArray(symbols)).toBe(true);
    expect(symbols.length).toBeGreaterThan(0);
  });

  it('getUniverseSymbols returns array for TECH_USA', () => {
    const symbols = getUniverseSymbols('TECH_USA');
    expect(Array.isArray(symbols)).toBe(true);
    expect(symbols.length).toBe(35);
    expect(symbols).toContain('AAPL');
    expect(symbols).toContain('MSFT');
  });

  it('getUniverseSymbols falls back to SP100 for unknown universe', () => {
    const symbols = getUniverseSymbols('NONEXISTENT');
    const sp100 = getUniverseSymbols('SP100');
    expect(symbols).toEqual(sp100);
  });

  it('getAllUniverses returns info for all universes', () => {
    const all = getAllUniverses();
    expect(all.length).toBe(Object.keys(UNIVERSES).length);
    for (const info of all) {
      expect(info).toHaveProperty('id');
      expect(info).toHaveProperty('name');
      expect(info).toHaveProperty('symbolsCount');
      expect(info).toHaveProperty('maxSymbols');
    }
  });

  it('getUniverseInfo returns null for unknown universe', () => {
    const info = getUniverseInfo('UNKNOWN');
    expect(info).toBeNull();
  });

  it('getUniverseInfo returns correct shape', () => {
    const info = getUniverseInfo('SP100');
    expect(info).not.toBeNull();
    expect(info.id).toBe('SP100');
    expect(info.name).toBe('S&P 100');
    expect(typeof info.symbolsCount).toBe('number');
  });
});
