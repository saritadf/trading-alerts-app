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

export async function chat(message, context = []) {
  try {
    const client = getGroqClient();
    const messages = [
      {
        role: 'system',
        content: `Eres un asistente experto en análisis financiero y mercados de valores. 
        Ayudas a analizar datos de trading y proporcionar recomendaciones basadas en 
        movimientos del mercado. Responde en español de forma clara y concisa.`
      },
      ...context,
      {
        role: 'user',
        content: message
      }
    ];

    const completion = await client.chat.completions.create({
      messages: messages,
      model: 'llama3-8b-8192',
      temperature: 0.7,
      max_tokens: 1024
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('Error in Groq chat:', error);
    throw new Error('Error al comunicarse con el asistente AI');
  }
}