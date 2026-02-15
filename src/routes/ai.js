import express from 'express';
import { generateChatResponse } from '../services/aiService.js';

const router = express.Router();

// POST /api/ai/chat - Chat with AI assistant
router.post('/chat', async (req, res) => {
  try {
    const { message, mode, context } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }
    
    const response = await generateChatResponse(message, mode, context);
    
    res.json({
      success: true,
      response,
      mode,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error generating AI response:', error);
    res.status(500).json
