require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

// --- CONFIGURACIÓN ---
app.use(cors()); // Permite peticiones de cualquier origen (importante para que el chat funcione)
app.use(express.json()); // Permite al servidor entender el formato JSON

const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Alarma de seguridad para verificar que la clave de API está configurada en Render
if (!GROQ_API_KEY) {
    console.error("ERROR FATAL: La clave GROQ_API_KEY no está configurada. Ve a la pestaña 'Environment' en Render y añádela.");
    process.exit(1); // Detiene la aplicación si no hay clave
}

// --- RUTAS DE LA APLICACIÓN ---

// Ruta de bienvenida para saber si el servidor está vivo
app.get('/', (req, res) => {
    res.send('El Cerebro del chatbot está funcionando correctamente.');
});

// Ruta principal que recibe los mensajes del chat
app.post('/webhook', async (req, res) => {
  console.log('INFO: Petición de chat recibida.');
  
  if (req.body.message) {
    const userMessage = req.body.message;
    
    try {
      console.log(`INFO: Enviando a Groq: "${userMessage}"`);

      const systemPrompt = `Eres un asistente virtual de soporte técnico para la empresa 'Soluciones Informáticas Personalizadas'.
      Tu nombre es SIPBOT. Debes ser siempre amable, servicial y directo.
      Tu objetivo principal es ayudar a los usuarios con sus problemas informáticos básicos.
      Si no sabes la respuesta a una pregunta técnica, debes decir: "Esa es una excelente pregunta. Permíteme consultar con un técnico especializado para darte la mejor solución."
      Nunca inventes soluciones o procedimientos. Responde siempre en español.`;

      const groqResponse = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama3-8b-8192',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ]
        },
        { headers: { Authorization: `Bearer ${GROQ_API_KEY}` } }
      );

      const botReply = groqResponse.data.choices[0].message.content.trim();
      console.log(`INFO: Respuesta de Groq: "${botReply}"`);
      
      res.status(200).json({ reply: botReply });

    } catch (error) {
      console.error('ERROR:', error.response ? error.response.data : error.message);
      res.status(500).json({ error: 'Hubo un error al contactar con la IA.' });
    }
  } else {
    res.status(400).send('Petición inválida. No se encontró ningún mensaje.');
  }
});

// --- ARRANQUE DEL SERVIDOR ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor "Cerebro" corriendo en el puerto ${PORT}`));