require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors()); 
app.use(express.json()); 

// --- VERIFICACIÓN DE LA CLAVE DE API ---
const GROQ_API_KEY = process.env.GROQ_API_KEY;
if (!GROQ_API_KEY) {
    console.error("ERROR FATAL: La clave GROQ_API_KEY no está configurada en Render.");
    process.exit(1);
} else {
    console.log("INFO: Clave de API de Groq cargada correctamente.");
}

const systemPrompt = `
# PERFIL Y PERSONA
- Eres "SIPBOT", un asistente virtual experto en soporte técnico...
// (El resto del prompt largo que ya definimos)
`;

// --- RUTAS DE LA APLICACIÓN ---
app.get('/', (req, res) => {
    res.send('El Cerebro del chatbot está funcionando correctamente.');
});

app.post('/webhook', async (req, res) => {
  console.log('INFO: Petición de chat recibida.');
  
  // ALARMA 1: Revisar si el mensaje llegó bien
  if (!req.body || !req.body.message) {
    console.error("ERROR: La petición no tiene el formato esperado. Falta 'message'.");
    return res.status(400).send('Petición inválida.');
  }
  
  const userMessage = req.body.message;
  console.log(`INFO: Mensaje del usuario recibido: "${userMessage}"`);

  try {
    console.log("INFO: Preparando para enviar a Groq...");

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
    console.log(`INFO: Respuesta de Groq recibida: "${botReply}"`);
    
    res.status(200).json({ reply: botReply });

  } catch (error) {
    // ALARMA 2: Si Groq da un error, lo veremos aquí
    console.error('ERROR DETALLADO AL LLAMAR A GROQ:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Hubo un error al contactar con la IA.' });
  }
});

// --- ARRANQUE DEL SERVIDOR ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor "Cerebro" corriendo en el puerto ${PORT}`));