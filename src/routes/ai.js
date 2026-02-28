import express from 'express';
import { chat } from '../services/aiService.js';
import { getCurrentInsight, refreshInsight } from '../services/dailyInsights.js';

const router = express.Router();

// Chat with AI
router.post('/chat', async (req, res) => {
  try {
    const { message, context } = req.body;
    
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    const response = await chat(message, context);
    res.json({ success: true, response });
  } catch (error) {
    console.error('Error in chat:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      fallback: 'Sorry, the AI service is temporarily unavailable. Please try again.'
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