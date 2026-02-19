import express from 'express';
import { getAllUniverses, getUniverseInfo, getUniverseSymbols, updateCustomUniverse, updateUniverse, UNIVERSES } from '../services/universes.js';
import scanner from '../services/scanner.js';

const router = express.Router();

// GET /api/universes - List all universes
router.get('/', (req, res) => {
  try {
    const universes = getAllUniverses();
    res.json(universes);
  } catch (error) {
    console.error('Error getting universes:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/universes/:id - Get universe details
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const universe = UNIVERSES[id];
    
    if (!universe) {
      return res.status(404).json({ error: 'Universe not found' });
    }

    const symbols = getUniverseSymbols(id);
    res.json({
      id: universe.id,
      name: universe.name,
      description: universe.description,
      symbols,
      symbolsCount: symbols.length,
      maxSymbols: universe.maxSymbols
    });
  } catch (error) {
    console.error('Error getting universe:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/universes/custom - Update custom watchlist
router.post('/custom', (req, res) => {
  try {
    const { symbols } = req.body;
    
    if (!Array.isArray(symbols)) {
      return res.status(400).json({ error: 'Symbols must be an array' });
    }

    const maxSymbols = UNIVERSES.CUSTOM.maxSymbols || 50;
    if (symbols.length > maxSymbols) {
      return res.status(400).json({ 
        error: `Maximum ${maxSymbols} symbols allowed in custom universe` 
      });
    }

    const updatedSymbols = updateCustomUniverse(symbols);
    res.json({ 
      success: true, 
      symbols: updatedSymbols,
      count: updatedSymbols.length 
    });
  } catch (error) {
    console.error('Error updating custom universe:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/universes/:id - Update any universe
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { symbols } = req.body;
    
    if (!Array.isArray(symbols)) {
      return res.status(400).json({ error: 'Symbols must be an array' });
    }

    const universe = UNIVERSES[id];
    if (!universe) {
      return res.status(404).json({ error: 'Universe not found' });
    }

    const maxSymbols = universe.maxSymbols || 50;
    if (symbols.length > maxSymbols) {
      return res.status(400).json({ 
        error: `Maximum ${maxSymbols} symbols allowed in ${universe.name}` 
      });
    }

    const updatedSymbols = updateUniverse(id, symbols);
    res.json({ 
      success: true, 
      symbols: updatedSymbols,
      count: updatedSymbols.length 
    });
  } catch (error) {
    console.error('Error updating universe:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/scanner/universe - Change active scanner universe
router.post('/scanner/universe', (req, res) => {
  try {
    const { universeId } = req.body;
    
    if (!universeId) {
      return res.status(400).json({ error: 'universeId is required' });
    }

    const universe = UNIVERSES[universeId];
    if (!universe) {
      return res.status(404).json({ error: 'Universe not found' });
    }

    scanner.setUniverse(universeId);
    res.json({ 
      success: true, 
      universeId,
      message: `Scanner universe changed to ${universe.name}` 
    });
  } catch (error) {
    console.error('Error setting scanner universe:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
