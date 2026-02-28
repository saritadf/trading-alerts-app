import express from 'express';
import { chat } from '../services/aiService.js';
import { getCurrentInsight, refreshInsight } from '../services/dailyInsights.js';

const router = express.Router();

const MAX_MESSAGE_LENGTH = 1000;

// Chat with AI
router.post('/chat', async (req, res) => {
  try {
    const { message, context } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({
        error: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)`
      });
    }

    const sanitizedMessage = message.trim();
    const response = await chat(sanitizedMessage, context);
    res.json({ success: true, response });
  } catch (error) {
    console.error('Error in chat:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      fallback: 'Lo siento, el servicio de IA no está disponible en este momento. Intenta de nuevo.'
    });
  }
});

// Get daily insight
router.get('/insight', async (req, res) => {
  try {
    const insight = await getCurrentInsight();
    res.json(insight);
  } catch (error) {
    console.error('Error getting insight:', error);
    res.status(500).json({ error: 'Error fetching insight' });
  }
});

// Refresh insight manually
router.post('/insight/refresh', async (req, res) => {
  try {
    const insight = await refreshInsight();
    res.json(insight);
  } catch (error) {
    console.error('Error refreshing insight:', error);
    res.status(500).json({ error: 'Error refreshing insight' });
  }
});

export default router;
