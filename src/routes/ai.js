import express from 'express';
import { chat } from '../services/aiService.js';

const router = express.Router();

// Chat with AI
router.post('/chat', async (req, res) => {
  try {
    const { message, context } = req.body;
    const response = await chat(message, context);
    res.json({ success: true, response });
  } catch (error) {
    console.error('Error in chat:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
