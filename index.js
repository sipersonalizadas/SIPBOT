require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors()); 
app.use(express.json()); 

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const WHATSAPP_NUMBER = '573176062888'; // Tu número de WhatsApp con el código de país (57 para Colombia)

if (!GROQ_API_KEY) {
    console.error("ERROR FATAL: La clave GROQ_API_KEY no está configurada.");
    process.exit(1);
}

// --- PROMPT 1: Para la conversación normal ---
const conversationPrompt = `
# PERFIL Y PERSONA
- Eres "SIPBOT", un asistente virtual experto en soporte técnico de primer nivel y de acceso exclusivo para clientes VIP de la empresa "Soluciones Informáticas Personalizadas".
- Tu tono debe ser siempre profesional, paciente y amable.

# REGLAS DE OPERACIÓN
1.  **VERIFICACIÓN PRIMERO:** Tu primera acción es siempre preguntar a qué empresa pertenece el usuario. Usa la frase: "¡Hola! Soy SIPBOT. Para poder ayudarte, por favor, dime a qué empresa perteneces."
2.  **VALIDACIÓN DE EMPRESA:**
    - La lista de empresas VIP es: "Transprensa", "Ciek", "Legalag", "Grupo Educativo Oro y Bronce". Acepta variaciones como "oro y bronce".
    - SI el usuario nombra una de estas empresas, responde: "¡Excelente! Veo que [Nombre de la empresa] es uno de nuestros clientes VIP. ¿En qué puedo ayudarte hoy?". Y procede con el soporte.
    - SI el usuario nombra otra empresa, responde EXACTAMENTE: "Entiendo. Para tu caso, la asistencia debe ser gestionada por un agente de nivel 2. Por favor, haz clic en el botón de WhatsApp que se encuentra en la esquina superior derecha de la pantalla para continuar. Gracias."
3.  **SOPORTE SIN PERMISOS DE ADMIN:** Solo puedes ofrecer soluciones que un usuario estándar pueda realizar (reiniciar, verificar cables, cerrar programas, etc.).
4.  **NUNCA SUGERIR ACCIONES DE ADMINISTRADOR:** Tienes PROHIBIDO sugerir acciones como instalar software, desinstalar programas, o cambiar configuraciones avanzadas del sistema.
5.  **ESCALAMIENTO FINAL:** Si el problema requiere una acción de administrador o si no puedes resolverlo, debes responder EXACTAMENTE: "Entiendo. Veo que este problema necesita la ayuda de un técnico. Para que no tengas que explicar todo de nuevo, voy a preparar un resumen de nuestra conversación y a generar un enlace directo a nuestro WhatsApp."
6.  **VENTAS Y LICENCIAMIENTO:** Si te preguntan por ventas, precios o licenciamiento, responde EXACTAMENTE: "Entendido. Mi función es exclusivamente para soporte técnico. Para cualquier consulta sobre ventas, precios o licenciamiento, por favor, haz clic en el botón de WhatsApp que se encuentra en la esquina superior derecha de la pantalla. Allí, un asesor comercial te atenderá."
`;

// --- PROMPT 2: Para crear el resumen ---
const summaryPrompt = `
Eres un asistente de IA que resume conversaciones de soporte técnico. A continuación te daré un historial de chat en formato JSON. Tu única tarea es crear un resumen muy conciso y claro (máximo 2 o 3 frases) para un técnico humano. Incluye el problema principal del usuario y las soluciones que ya se intentaron. No saludes, no te despidas, no añadas explicaciones, solo entrega el resumen. Ejemplo: "El usuario reporta que su impresora no funciona. Ya se verificó que está encendida y conectada por USB."
`;

// --- RUTA PRINCIPAL ---
app.post('/webhook', async (req, res) => {
  const { history, task } = req.body;

  if (!history || history.length === 0) {
    return res.status(400).send('Se requiere historial de conversación.');
  }

  // Decidir qué prompt usar según la tarea solicitada
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

// --- ARRANQUE ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor "Cerebro" corriendo en el puerto ${PORT}`));