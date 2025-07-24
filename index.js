require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

// --- CONFIGURACIÓN ---
app.use(cors()); 
app.use(express.json()); 

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const WHATSAPP_NUMBER = '573176062888';

if (!GROQ_API_KEY) {
    console.error("ERROR FATAL: La clave GROQ_API_KEY no está configurada.");
    process.exit(1);
}

// --- PROMPT 1: Para la conversación normal ---
const conversationPrompt = `
# PERFIL Y PERSONA
- Eres "SIPBOT", un asistente virtual experto en soporte técnico para "Soluciones Informáticas Personalizadas".
- Tu audiencia no tiene conocimientos técnicos. Habla de la forma más simple y clara posible.

# REGLAS DE OPERACIÓN
1.  **VERIFICACIÓN PRIMERO:** Tu primera acción es siempre preguntar a qué empresa pertenece el usuario.
2.  **VALIDACIÓN DE EMPRESA:**
    - La lista de empresas VIP es: "Transprensa", "Ciek", "Legalag", "Grupo Educativo Oro y Bronce". Acepta variaciones.
    - SI el usuario nombra una de estas empresas, tu siguiente paso es preguntar por su nombre. Responde: "¡Excelente! Veo que [Nombre de la empresa] es uno de nuestros clientes VIP. Para una atención más personalizada, ¿podrías indicarme tu nombre, por favor?".
    - SI el usuario nombra otra empresa, detén el soporte y redirígelo al WhatsApp de la web.
3.  **INICIO DEL SOPORTE:** Una vez que el usuario te dé su nombre, salúdalo y pregúntale cuál es su problema.
4.  **SOPORTE ULTRA-BÁSICO:** Tu única misión es guiar al usuario a través de los 3 pasos más simples: reiniciar el dispositivo, verificar cables o reabrir el programa.
5.  **ESCALAMIENTO INMEDIATO:** Si el problema no se soluciona con uno de esos 3 pasos, DEBES ESCALAR INMEDIATAMENTE.
6.  **CÓMO ESCALAR:** Para escalar, usa la frase exacta: "Entiendo. Veo que este problema necesita la ayuda de un técnico. Para que no tengas que explicar todo de nuevo, voy a preparar un resumen de nuestra conversación y a generar un enlace directo a nuestro WhatsApp."
7.  **REGLAS PROHIBIDAS:** Tienes PROHIBIDO sugerir cualquier cosa que no sean los 3 pasos básicos.
8.  **VENTAS Y LICENCIAMIENTO:** Si te preguntan por ventas o precios, redirige al WhatsApp de la web.
`;

// --- PROMPT 2: Para crear el resumen (NUEVA VERSIÓN MÁS DIRECTA) ---
const summaryPrompt = `
# TAREA ESTRICTA: RESUMEN DE SOPORTE
Tu única función es leer el siguiente historial de chat y generar un resumen de una sola línea para un técnico. El resumen debe incluir el nombre del cliente (si lo encuentras), su empresa, el problema reportado y lo que ya se intentó.
NO saludes. NO te despidas. NO añadas texto introductorio. Solo escribe la frase del resumen.
EJEMPLO DE SALIDA PERFECTA: "Cliente: Juan Pérez de Transprensa. Problema: El mouse no funciona. Pasos intentados: Reiniciar el computador."
Ahora, resume el siguiente historial:
`;

// --- RUTAS DE LA APLICACIÓN ---

app.get('/', (req, res) => {
    res.send('El Cerebro del chatbot está funcionando correctamente.');
});

app.post('/webhook', async (req, res) => {
  const { history, task } = req.body;

  if (!history || history.length === 0) {
    return res.status(400).send('Se requiere historial de conversación.');
  }

  const isSummarizeTask = task === 'get_summary_link';
  const currentSystemPrompt = isSummarizeTask ? summaryPrompt : conversationPrompt;
  
  const messagesForAPI = [
      { role: 'system', content: currentSystemPrompt },
      ...history 
  ];

  try {
    const groqResponse = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      { model: 'llama3-8b-8192', messages: messagesForAPI },
      { headers: { Authorization: `Bearer ${GROQ_API_KEY}` } }
    );
    const botReply = groqResponse.data.choices[0].message.content.trim();

    if (isSummarizeTask) {
      console.log(`INFO: Resumen generado por la IA: "${botReply}"`);
      
      const encodedSummary = encodeURIComponent(botReply);
      const whatsappLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedSummary}`;
      res.status(200).json({ link: whatsappLink });
    } else {
      res.status(200).json({ reply: botReply });
    }
  } catch (error) {
    console.error('ERROR:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Hubo un error al contactar con la IA.' });
  }
});

// --- ARRANQUE DEL SERVIDOR ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor "Cerebro" corriendo en el puerto ${PORT}`));