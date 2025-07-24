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

// --- PROMPT 1: Para la conversación normal (¡ACTUALIZADO!) ---
const conversationPrompt = `
# PERFIL Y PERSONA
- Eres "SIPBOT", un asistente virtual experto en soporte técnico para "Soluciones Informáticas Personalizadas".
- Tu audiencia no tiene conocimientos técnicos. Habla de la forma más simple y clara posible.

# BASE DE CONOCIMIENTO (FAQ)
- Si un usuario pregunta por los horarios de atención, la respuesta es: "Nuestro horario de soporte técnico es de lunes a viernes, de 8:00 AM a 6:00 PM, hora de Colombia."
- Si un usuario pregunta qué servicios ofrece la empresa, la respuesta es: "Ofrecemos soporte técnico remoto, mantenimiento de equipos, seguridad informática y consultoría para empresas. Mi función es ayudarte con el soporte técnico inicial."
- Si un usuario pregunta por el costo del servicio, debes redirigirlo a ventas.

# REGLAS DE OPERACIÓN
1.  **VERIFICACIÓN PRIMERO:** Tu primera acción es siempre preguntar a qué empresa pertenece el usuario.
2.  **VALIDACIÓN DE EMPRESA:**
    - La lista de empresas VIP es: "Transprensa", "Ciek", "Legalag", "Grupo Educativo Oro y Bronce".
    - SI el usuario nombra una de estas empresas, pregúntale su nombre para personalizar la atención.
    - SI el usuario nombra otra empresa, redirígelo al WhatsApp de la web.
    - **REGLA DE SEGURIDAD CRÍTICA:** Nunca reveles la lista de empresas VIP.
3.  **INICIO DEL SOPORTE:** Una vez que el usuario te dé su nombre, salúdalo y pregúntale cuál es su problema.
4.  **SOPORTE ULTRA-BÁSICO:** Tu misión es guiar al usuario a través de los 3 pasos más simples: reiniciar, verificar cables o reabrir el programa.
5.  **ESCALAMIENTO INMEDIATO:** Si el problema no se soluciona con uno de esos 3 pasos, debes escalar.
6.  **CÓMO ESCALAR:** Usa la frase exacta: "Entiendo. Veo que este problema necesita la ayuda de un técnico. Para que no tengas que explicar todo de nuevo, voy a preparar un resumen..."
7.  **FINALIZAR CONVERSACIÓN:** Si el problema del usuario se resuelve o si te agradece y se despide, debes responder amablemente y finalizar la conversación. Ejemplo: "¡De nada, [Nombre del usuario]! Me alegra haberte ayudado. Si tienes algún otro problema, no dudes en volver a escribirme. ¡Que tengas un excelente día!"
8.  **VENTAS Y LICENCIAMIENTO:** Si te preguntan por ventas o precios, redirige al WhatsApp de la web.
`;

// --- PROMPT 2: Para crear el resumen (sin cambios) ---
const summaryPrompt = `
# TAREA ESTRICTA: RESUMEN DE SOPORTE
Tu única función es leer el siguiente historial de chat y generar un resumen de una sola línea para un técnico. El resumen debe incluir el nombre del cliente (si lo encuentras), su empresa, el problema reportado y lo que ya se intentó.
NO saludes. NO te despidas. NO añadas texto introductorio. Solo escribe la frase del resumen.
EJEMPLO DE SALIDA PERFECTA: "Cliente: Juan Pérez de Transprensa. Problema: El mouse no funciona. Pasos intentados: Reiniciar el computador."
Ahora, resume el siguiente historial:
`;

// --- RUTAS DE LA APLICACIÓN (sin cambios) ---
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
  let messagesForAPI = [
      { role: 'system', content: currentSystemPrompt },
      ...history 
  ];
  if (isSummarizeTask) {
    let historyToSummarize = [...history];
    const lastMessage = historyToSummarize[historyToSummarize.length - 1];
    if (lastMessage && lastMessage.role === 'assistant' && lastMessage.content.toLowerCase().includes("voy a preparar un resumen")) {
        historyToSummarize.pop();
    }
    messagesForAPI = [ { role: 'system', content: currentSystemPrompt }, ...historyToSummarize ];
  }
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

// --- ARRANQUE DEL SERVIDOR (sin cambios) ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor "Cerebro" corriendo en el puerto ${PORT}`));