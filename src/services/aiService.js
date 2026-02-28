import Groq from 'groq-sdk';

let groq = null;

function getGroqClient() {
  if (!groq) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error(
        'GROQ_API_KEY environment variable is missing. ' +
        'Please check your .env file.'
      );
    }
    groq = new Groq({ apiKey });
  }
  return groq;
}

/**
 * Detect query intent and determine response mode(s)
 */
function detectQueryMode(message) {
  const msg = message.toLowerCase();

  const modes = [];

  // Technical analysis keywords
  if (msg.match(/chart|technical|resistance|support|macd|rsi|moving average|trend|pattern|breakout/i)) {
    modes.push('technical');
  }

  // Strategy/risk keywords
  if (msg.match(/should i|recommend|strategy|risk|buy|sell|hold|portfolio|invest|diversif/i)) {
    modes.push('advisor');
  }

  // Educational keywords
  if (msg.match(/what is|how does|explain|mean|definition|learn|understand|why/i)) {
    modes.push('educator');
  }

  // Default to technical if no match
  if (modes.length === 0) {
    modes.push('technical');
  }

  return modes;
}

/**
 * Build system prompt based on detected modes
 */
function buildSystemPrompt(modes, language) {
  const isSpanish = language !== 'en';
  const languageInstruction = isSpanish
    ? 'Responde SIEMPRE en español.'
    : 'Always respond in English.';
  const disclaimer = isSpanish
    ? '⚠️ Esto no es asesoramiento financiero.'
    : '⚠️ This is not financial advice.';

  let prompt = isSpanish
    ? 'Eres un asistente inteligente de trading multi-modo. Analiza la pregunta y responde desde la(s) perspectiva(s) más relevante(s):\n\n'
    : 'You are an intelligent multi-mode trading assistant. Analyze the question and respond from the most relevant perspective(s):\n\n';

  if (modes.includes('technical')) {
    prompt += isSpanish
      ? '**ANALISTA TÉCNICO**: Patrones de gráficos, indicadores (RSI, MACD, volumen), niveles de soporte/resistencia y análisis de tendencia.\n'
      : '**TECHNICAL ANALYST**: Chart patterns, indicators (RSI, MACD, volume), support/resistance levels, and trend analysis.\n';
  }

  if (modes.includes('advisor')) {
    prompt += isSpanish
      ? '**ASESOR FINANCIERO**: Perspectivas estratégicas, evaluación de riesgo, consideraciones de portafolio y recomendaciones accionables.\n'
      : '**FINANCIAL ADVISOR**: Strategic insights, risk assessment, portfolio considerations, and actionable recommendations.\n';
  }

  if (modes.includes('educator')) {
    prompt += isSpanish
      ? '**EDUCADOR**: Explica conceptos claramente, define términos y ayuda al usuario a entender los fundamentos.\n'
      : '**EDUCATOR**: Explain concepts clearly, define terms, and help the user understand the fundamentals.\n';
  }

  prompt += `\n**RULES**:
- Maximum 250 words - be concise and precise
- ${isSpanish ? 'Estructura: Ideas clave → Análisis → Info accionable' : 'Structure: Key insights → Analysis → Actionable info'}
- ${languageInstruction}
- ALWAYS end with: "${disclaimer}"
- Use bullet points for clarity
- Focus on the most important information`;

  return prompt;
}

/**
 * Detect language from message
 */
function detectLanguage(message) {
  const msg = message.toLowerCase();
  if (msg.match(/\b(what|how|why|should|can|will|does|would|could|tell me|explain)\b/)) {
    return 'en';
  }
  return 'es';
}

/**
 * Chat with AI - Intelligent multi-mode detection
 */
export async function chat(message, context = []) {
  try {
    const client = getGroqClient();

    // Detect language and modes
    const language = detectLanguage(message);
    const modes = detectQueryMode(message);
    const systemPrompt = buildSystemPrompt(modes, language);

    console.log(`🤖 AI Mode(s): ${modes.join(', ')} | Language: ${language}`);

    // Prepare context with alert data if available
    let contextMessage = '';
    if (context && context.length > 0) {
      contextMessage = '\n\nCurrent market alerts context:\n';
      context.slice(0, 5).forEach(alert => {
        contextMessage += `- ${alert.symbol}: ${alert.changePercent > 0 ? '+' : ''}${alert.changePercent.toFixed(2)}% (Volume: ${(alert.volumeRatio || 0).toFixed(1)}x avg)\n`;
      });
    }

    const messages = [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: message + contextMessage
      }
    ];

    const completion = await client.chat.completions.create({
      messages: messages,
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 500,
      top_p: 0.9
    });

    const response = completion.choices[0].message.content;

    // Ensure it ends with disclaimer if not present
    const hasDisclaimer = response.includes('financial advice') || response.includes('asesoramiento financiero');
    const finalResponse = hasDisclaimer ? response : response + '\n\n⚠️ This is not financial advice.';

    return finalResponse;
  } catch (error) {
    console.error('Error in Groq chat:', error);
    throw new Error('Error al comunicarse con el asistente de IA');
  }
}
