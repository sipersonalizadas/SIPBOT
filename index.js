require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();
const cors = require('cors');
app.use(cors());
app.use(express.json());

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
// Bloque de seguridad para verificar la clave de API
if (!process.env.GROQ_API_KEY) {
  console.error("ERROR FATAL: La contraseña secreta (GROQ_API_KEY) no está configurada en Render. Ve a la pestaña 'Environment' y añádela.");
  process.exit(1);
}

app.post('/webhook', async (req, res) => {
  console.log('INFO: Petición recibida.');
  if (req.body.message) {
    const userMessage = req.body.message;
    try {
      console.log(`INFO: Enviando a Groq: "${userMessage}"`);
      //...
const systemPrompt = `Eres un asistente virtual de soporte técnico para la empresa 'Soluciones Informáticas Personalizadas'.
Tu nombre es SIPBOT. Debes ser siempre amable, servicial y directo.
Tu objetivo principal es ayudar a los usuarios con sus problemas informáticos básicos.
Si no sabes la respuesta a una pregunta técnica, debes decir: "Esa es una excelente pregunta. Permíteme consultar con un técnico especializado para darte la mejor solución."
Nunca inventes soluciones o procedimientos. Responde siempre en español.`;

const groqResponse = await axios.post(
  GROQ_API_URL,
  {
    model: 'llama3-8b-8192',
    messages: [
      // 1. El Prompt del Sistema (la personalidad de la IA)
      {
        role: 'system',
        content: systemPrompt
      },
      // 2. El Mensaje del Usuario
      {
        role: 'user',
        content: userMessage
      }
    ]
  },
  { headers: { Authorization: `Bearer ${GROQ_API_KEY}` } }
);
//...
      );
      const botReply = groqResponse.data.choices[0].message.content.trim();
      console.log(`INFO: Respuesta de Groq: "${botReply}"`);
      res.status(200).json({ reply: botReply });
    } catch (error) {
      console.error('ERROR:', error.response ? error.response.data : error.message);
      res.status(500).json({ error: 'Hubo un error con la IA.' });
    }
  } else {
    res.status(400).send('Petición inválida.');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor "Cerebro" corriendo en el puerto ${PORT}`));