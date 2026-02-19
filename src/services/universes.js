import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../data');
const SP100_PATH = path.join(DATA_DIR, 'sp100.json');
const CUSTOM_PATH = path.join(DATA_DIR, 'custom.json');

function getUniverseFilePath(universeId) {
  return path.join(DATA_DIR, `${universeId.toLowerCase()}.json`);
}

export const UNIVERSES = {
  SP100: {
    id: 'SP100',
    name: 'S&P 100',
    description: 'Las 100 acciones más grandes de USA',
    source: 'local-json',
    maxSymbols: 100
  },
  TECH_USA: {
    id: 'TECH_USA',
    name: 'Tecnología USA',
    description: 'Grandes tecnológicas US',
    symbols: [
      'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA',
      'META', 'TSLA', 'AVGO', 'ADBE', 'CSCO',
      'CRM', 'AMD', 'INTC', 'ORCL', 'QCOM',
      'TXN', 'AMAT', 'LRCX', 'KLAC', 'NXPI',
      'ANSS', 'CDNS', 'SNPS', 'FTNT', 'ZM',
      'TEAM', 'NET', 'DDOG', 'MDB', 'SNOW',
      'CRWD', 'OKTA', 'DOCN', 'WDAY', 'CDW'
    ],
    maxSymbols: 50
  },
  BANKS_USA: {
    id: 'BANKS_USA',
    name: 'Bancos y financieras',
    description: 'Bancos y servicios financieros USA',
    symbols: [
      'JPM', 'BAC', 'WFC', 'GS', 'MS',
      'C', 'BLK', 'AXP', 'COF', 'SCHW',
      'TFC', 'PNC', 'USB', 'BK', 'STT',
      'CFG', 'MTB', 'ZION', 'HBAN', 'KEY'
    ],
    maxSymbols: 50
  },
  ENERGY: {
    id: 'ENERGY',
    name: 'Energía y materias primas',
    description: 'Sector energético y commodities',
    symbols: [
      'XOM', 'CVX', 'SLB', 'EOG', 'COP',
      'MPC', 'VLO', 'PSX', 'HES', 'FANG',
      'DVN', 'CTRA', 'MRO', 'OVV', 'APA'
    ],
    maxSymbols: 50
  },
  CUSTOM: {
    id: 'CUSTOM',
    name: 'Mis acciones',
    description: 'Watchlist personal configurable',
    source: 'local-json',
    maxSymbols: 50
  }
};

function loadJSON(filePath, defaultValue = null) {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    }
    return defaultValue;
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error);
    return defaultValue;
  }
}

function saveJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`Error saving ${filePath}:`, error);
    return false;
  }
}

export function getUniverseSymbols(universeId) {
  const universe = UNIVERSES[universeId];
  if (!universe) {
    console.warn(`Unknown universe: ${universeId}, defaulting to SP100`);
    return getUniverseSymbols('SP100');
  }

  let symbols = [];

  if (universeId === 'SP100') {
    const sp100Data = loadJSON(SP100_PATH, { symbols: [] });
    symbols = sp100Data.symbols || [];
  } else if (universeId === 'CUSTOM') {
    const customData = loadJSON(CUSTOM_PATH, { symbols: [] });
    symbols = customData.symbols || [];
  } else {
    const filePath = getUniverseFilePath(universeId);
    const savedData = loadJSON(filePath, null);
    if (savedData && savedData.symbols) {
      symbols = savedData.symbols;
    } else {
      symbols = universe.symbols || [];
    }
  }

  const maxSymbols = universe.maxSymbols || 100;
  return symbols.slice(0, maxSymbols);
}

export function updateCustomUniverse(symbols) {
  return updateUniverse('CUSTOM', symbols);
}

export function updateUniverse(universeId, symbols) {
  if (!Array.isArray(symbols)) {
    throw new Error('Symbols must be an array');
  }

  const universe = UNIVERSES[universeId];
  if (!universe) {
    throw new Error(`Universe ${universeId} not found`);
  }

  const maxSymbols = universe.maxSymbols || 50;

  const normalizedSymbols = symbols
    .map(s => s.toUpperCase().trim())
    .filter(s => s.length > 0)
    .slice(0, maxSymbols);

  let filePath;
  if (universeId === 'CUSTOM') {
    filePath = CUSTOM_PATH;
  } else if (universeId === 'SP100') {
    filePath = SP100_PATH;
  } else {
    filePath = getUniverseFilePath(universeId);
  }

  const universeData = { symbols: normalizedSymbols };
  const success = saveJSON(filePath, universeData);

  if (!success) {
    throw new Error(`Failed to save universe ${universeId}`);
  }

  return normalizedSymbols;
}

export function getUniverseInfo(universeId) {
  const universe = UNIVERSES[universeId];
  if (!universe) return null;

  const symbols = getUniverseSymbols(universeId);
  return {
    id: universe.id,
    name: universe.name,
    description: universe.description,
    symbolsCount: symbols.length,
    maxSymbols: universe.maxSymbols
  };
}

export function getAllUniverses() {
  return Object.keys(UNIVERSES).map(id => getUniverseInfo(id));
}
