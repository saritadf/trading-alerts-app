import express from 'express';
import { chat } from '../services/aiService.js';

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
      fallback: 'Lo siento, el servicio de AI está temporalmente no disponible. Por favor intenta de nuevo.'
    });
  }
});

export default router;
