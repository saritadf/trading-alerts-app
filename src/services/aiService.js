import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// AI Modes configuration
const MODES = {
  technical: {
    systemPrompt: `You are a technical analysis expert. Focus on price action, volume, chart patterns, 
    indicators, and short-term trading opportunities. Be concise and actionable.`,
    temperature: 0.7
  },
  fundamental: {
    systemPrompt: `You are a fundamental analysis expert. Focus on company financials, earnings, 
    business models, competitive advantages, and long-term investment value. Be thorough but clear.`,
    temperature: 0.8
  },
  sentiment: {
    systemPrompt: `You are a market sentiment analyst. Focus on market psychology, news impact, 
    social trends, and crowd behavior. Explain the 'why' behind movements.`,
    temperature: 0.9
  }
};

/**
 * Generate AI chat response
 * @param {string} message - User message
 * @param {string} mode - Analysis mode (technical/fundamental/sentiment)
 * @param {Array} context - Market alerts context
 * @returns {Promise<string>} AI response
 */
export async function generateChatResponse(message, mode = 'technical', context = []) {
  try {
    const modeConfig = MODES[mode] || MODES.technical;
    
    // Build context string from alerts
    let contextString = '';
    if (context && context.length > 0) {
      contextString = '\n\nCurrent market alerts:\n' + context.map(alert => 
        `${alert.symbol}: ${alert.changePercent > 0 ? '+' : ''}${alert.changePercent.toFixed(2)}% at $${alert.price.toFixed(2)}`
      ).join('\n');
    }
    
    const messages = [
      {
        role: 'system',
        content: modeConfig.systemPrompt + contextString
      },
      {
        role: 'user',
        content: message
      }
    ];
    
    console.log(`🤖 Generating ${mode} response for: "${message.substring(0, 50)}..."`);
    
    const completion = await groq.chat.completions.create({
      messages,
      model: 'llama-3.1-8b-instant', // Fast and free tier friendly
      temperature: modeConfig.temperature,
      max_tokens: 500,
      top_p: 1,
      stream: false
    });
    
    const response = completion.choices[0]?.message?.content || 'I apologize, but I could not generate a response.';
    
    console.log(`✅ AI response generated (${response.length} chars)`);
    return response;
    
  } catch (error) {
    console.error('Error generating AI response:', error);
    
    // Fallback responses based on mode
    if (error.message?.includes('rate_limit')) {
      return 'I apologize, but I\'ve reached my rate limit. Please try again in a moment.';
    }
    
    return 'I apologize, but I encountered an error. Please try rephrasing your question.';
  }
}

/**
 * Detect question language and respond accordingly
 * @param {string} message - User message
 * @returns {string} Detected language code
 */
export function detectLanguage(message) {
  const spanishPatterns = /\b(qué|cómo|por qué|cuándo|dónde|quién|cuál|dame|dime|explica|análisis)\b/i;
  return spanishPatterns.test(message) ? 'es' : 'en';
}
