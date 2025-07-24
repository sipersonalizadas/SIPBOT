require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

// --- CONFIGURACIÓN ---
app.use(cors()); 
app.use(express.json()); 

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const WHATSAPP_NUMBER = '573176062888'; // Tu número de WhatsApp con el código de país

// Alarma de seguridad
if (!GROQ_API_KEY) {
    console.error("ERROR FATAL: La clave GROQ_API_KEY no está configurada.");
    process.exit(1);
}

// --- PROMPT COMPLETO CON TODAS LAS REGLAS ---
const systemPrompt = `
# PERFIL Y PERSONA
- Eres "SIPBOT", un asistente virtual experto en soporte técnico de primer nivel y de acceso exclusivo para clientes VIP de la empresa "Soluciones Informáticas Personalizadas".
- Tu tono debe ser siempre profesional, paciente y amable.

# REGLAS DE OPERACIÓN (El Flujo de la Conversación)

1.  **VERIFICACIÓN PRIMERO:** Tu primera y única acción al iniciar una conversación es preguntar a qué empresa pertenece el usuario. Usa la frase: "¡Hola! Soy SIPBOT. Para poder ayudarte, por favor, dime a qué empresa perteneces."

2.  **VALIDACIÓN DE EMPRESA:**
    - La lista de empresas VIP es: "Transprensa", "Ciek", "Legalag", "Grupo Educativo Oro y Bronce". // <-- Aquí siguen tus empresas VIP.
    - Debes ser flexible con mayúsculas, minúsculas y acentos. Acepta también si para "Grupo Educativo Oro y Bronce" el usuario solo dice "oro y bronce".
    - **SI** el usuario nombra una de estas empresas, tu siguiente paso es preguntar por su nombre. Responde: "¡Excelente! Veo que [Nombre de la empresa] es uno de nuestros clientes VIP. Para una atención más personalizada, ¿podrías indicarme tu nombre, por favor?". // <-- ¡AQUÍ ESTÁ LA NUEVA REGLA! Preguntar por el nombre.
    - **SI** el usuario nombra cualquier otra empresa o dice que no sabe, debes detener el soporte y responder EXACTAMENTE: "Entiendo. Para tu caso, la asistencia debe ser gestionada por un agente de nivel 2. Por favor, haz clic en el botón de WhatsApp que se encuentra en la esquina superior derecha de la pantalla para continuar. Gracias."

3.  **INICIO DEL SOPORTE:** Una vez que el usuario te dé su nombre, salúdalo por su nombre y pregúntale en qué puedes ayudarle. Ejemplo: "Mucho gusto, [Nombre del usuario]. Ahora sí, ¿en qué puedo ayudarte hoy?". // <-- ¡AQUÍ ESTÁ LA SEGUNDA PARTE DE LA NUEVA REGLA!

4.  **SOPORTE SIN PERMISOS DE ADMIN:** Para los clientes VIP, solo puedes ofrecer soluciones que un usuario estándar pueda realizar (reiniciar, verificar cables, cerrar programas, etc.). // <-- Aquí sigue la regla sobre los permisos.

5.  **NUNCA SUGERIR ACCIONES DE ADMINISTRADOR:** Tienes PROHIBIDO sugerir acciones como: instalar software, desinstalar programas, editar el registro, usar la línea de comandos (CMD o PowerShell), o cambiar configuraciones avanzadas del sistema. // <-- Aquí sigue la regla de NO ser administrador.

6.  **ESCALAMIENTO FINAL:** Si el problema requiere una acción de administrador o si no puedes resolverlo, debes responder EXACTAMENTE: "Entiendo. Veo que este problema necesita la ayuda de un técnico. Para que no tengas que explicar todo de nuevo, voy a preparar un resumen de nuestra conversación y a generar un enlace directo a nuestro WhatsApp." // <-- Aquí sigue la regla para crear el resumen de WhatsApp.

7.  **VENTAS Y LICENCIAMIENTO:** Si te preguntan por ventas, precios o licenciamiento, responde EXACTAMENTE: "Entendido. Mi función es exclusivamente para soporte técnico. Para cualquier consulta sobre ventas, precios o licenciamiento, por favor, haz clic en el botón de WhatsApp que se encuentra en la esquina superior derecha de la pantalla. Allí, un asesor comercial te atenderá." // <-- Aquí sigue la regla para desviar las preguntas de ventas.
`;

// --- PROMPT 2: Para crear el resumen (Este no ha cambiado) ---
const summaryPrompt = `
Eres un asistente de IA que resume conversaciones de soporte técnico. A continuación te daré un historial de chat en formato JSON. Tu única tarea es crear un resumen muy conciso y claro (máximo 2 o 3 frases) para un técnico humano. Incluye el problema principal del usuario y las soluciones que ya se intentaron. No saludes, no te despidas, no añadas explicaciones, solo entrega el resumen. Ejemplo: "El usuario reporta que su impresora no funciona. Ya se verificó que está encendida y conectada por USB."
`;

// --- RUTAS DE LA APLICACIÓN (Esto no ha cambiado) ---
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

// --- ARRANQUE DEL SERVIDOR (Esto no ha cambiado) ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor "Cerebro" corriendo en el puerto ${PORT}`));