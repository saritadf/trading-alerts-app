import Groq from 'groq-sdk';

let client = null;
let currentInsight = null;
let lastUpdateTime = null;

function getGroqClient() {
  if (!client) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error(
        'GROQ_API_KEY environment variable is missing. ' +
        'Please check your Railway environment variables.'
      );
    }
    client = new Groq({ apiKey });
  }
  return client;
}

async function generateInsight() {
  try {
    const groq = getGroqClient();
    const fecha = new Date().toLocaleDateString('es', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const prompt = `Genera para traders del mercado de EE.UU.:\n1. LA noticia más importante del día que afecta los mercados (máximo 2 líneas, sé específico con datos)\n2. UNA frase famosa de un trader o inversor legendario (Warren Buffett, Jesse Livermore, Paul Tudor Jones, George Soros, Ray Dalio, Peter Lynch, Benjamin Graham, Charlie Munger) que TENGA RELACIÓN con la noticia del día. La frase debe ser relevante al contexto actual.\n\nFecha: ${fecha}\nFormato: NEWS: [texto en español]\nQUOTE: "[frase en español]" - [Autor]`;
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'system', content: 'Analista de mercado que proporciona análisis concisos en español. Enfócate en la noticia más impactante del día.' }, { role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 300
    });
    const response = completion.choices[0]?.message?.content || '';
    const newsMatch = response.match(/NEWS:\s*(.+?)(?=\nQUOTE:|$)/s);
    const quoteMatch = response.match(/QUOTE:\s*(.+)/);
    return {
      news: newsMatch ? newsMatch[1].trim() : 'Análisis de mercado en progreso...',
      quote: quoteMatch ? quoteMatch[1].trim() : '"La tendencia es tu amiga." - Sabiduría del trading',
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Error generating insight:', error);
    return {
      news: 'Mantente atento al mercado y gestiona tu riesgo.',
      quote: '"El riesgo viene de no saber lo que estás haciendo." - Warren Buffett',
      timestamp: new Date()
    };
  }
}

export async function getCurrentInsight() {
  const now = new Date();
  if (!currentInsight || !lastUpdateTime || (now - lastUpdateTime) > 1800000) {
    currentInsight = await generateInsight();
    lastUpdateTime = now;
    console.log('\u2728 Daily insight updated');
  }
  return currentInsight;
}

export async function refreshInsight() {
  currentInsight = await generateInsight();
  lastUpdateTime = new Date();
  console.log('\u2728 Daily insight refreshed manually');
  return currentInsight;
}

setInterval(async () => {
  const now = new Date();
  if (!lastUpdateTime || (now - lastUpdateTime) >= 1800000) {
    currentInsight = await generateInsight();
    lastUpdateTime = now;
    console.log('\u2728 Daily insight auto-updated (every 30 min)');
  }
}, 30 * 60 * 1000);
