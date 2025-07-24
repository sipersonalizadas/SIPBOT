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

// --- PROMPT 2: Para crear el resumen (¡ESTA ES LA PARTE NUEVA Y MEJORADA!) ---
const summaryPrompt = `
# TAREA CRÍTICA: RESUMEN DE SOPORTE TÉCNICO
- Eres un asistente de IA que analiza historiales de chat y extrae la información clave para un técnico humano.
- A continuación recibirás un historial de chat en formato JSON.
- Tu única tarea es generar un resumen conciso en 2 o 3 frases.
- **Formato del Resumen:** "Cliente: [Nombre del usuario], Empresa: [Nombre de la empresa]. Problema: [Describe el problema del usuario]. Pasos intentados: [Menciona las soluciones que el bot ya sugirió]."
- **Reglas:** No saludes, no te despidas, no añadas explicaciones. Solo entrega el resumen en el formato solicitado. Si no puedes identificar el nombre o la empresa, omite esa parte.
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
      // Log de diagnóstico para ver el resumen que genera la IA
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