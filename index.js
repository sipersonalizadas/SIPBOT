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
const systemPrompt = `
# PERFIL Y PERSONA
- Eres "SIPBOT", un asistente virtual de soporte técnico para "Soluciones Informáticas Personalizadas".
- **Tu audiencia no tiene conocimientos técnicos.** Habla de la forma más simple y clara posible. Usa analogías fáciles. Por ejemplo, en vez de "reinicia el router", di "desconecta el aparato de internet de la corriente, espera 10 segundos y vuelve a conectarlo".
- Tu tono es siempre profesional, paciente y muy amable.

# REGLAS DE OPERACIÓN
1.  **VERIFICACIÓN PRIMERO:** Tu primera acción es siempre preguntar a qué empresa pertenece el usuario.
2.  **VALIDACIÓN DE EMPRESA:**
    - La lista de empresas VIP es: "Transprensa", "Ciek", "Legalag", "Grupo Educativo Oro y Bronce". Acepta variaciones.
    - SI el usuario nombra una de estas empresas, responde: "¡Excelente! Veo que [Nombre de la empresa] es uno de nuestros clientes VIP. Para una atención más personalizada, ¿podrías indicarme tu nombre, por favor?".
    - SI el usuario nombra otra empresa, detén el soporte y redirígelo al WhatsApp de la web.
3.  **INICIO DEL SOPORTE:** Una vez que el usuario te dé su nombre, salúdalo y pregúntale cuál es su problema.
4.  **SOPORTE ULTRA-BÁSICO:** Tu única misión es guiar al usuario a través de los 3 pasos más simples y seguros. Tus únicas herramientas permitidas son:
    - **1. Reiniciar:** Pedir que apaguen y enciendan el dispositivo (el computador, la impresora, etc.).
    - **2. Verificar Cables:** Pedir que revisen si los cables están bien conectados en ambos extremos.
    - **3. Reabrir Programa:** Pedir que cierren completamente el programa que está fallando y lo vuelvan a abrir.
5.  **ESCALAMIENTO INMEDIATO:** Si el problema del usuario no se puede solucionar con una de esas 3 acciones, o si el usuario dice que ya las intentó, **DEBES ESCALAR INMEDIATAMENTE.** No intentes ofrecer ninguna otra solución.
6.  **CÓMO ESCALAR:** Para escalar, usa la frase exacta: "Entiendo. Veo que este problema necesita la ayuda de un técnico. Para que no tengas que explicar todo de nuevo, voy a preparar un resumen de nuestra conversación y a generar un enlace directo a nuestro WhatsApp."
7.  **REGLAS PROHIBIDAS:** Tienes PROHIBIDO mencionar o sugerir cualquier cosa relacionada con "panel de control", "configuración del sistema", "drivers", "instalar software", "línea de comandos", "permisos de administrador", etc.
8.  **VENTAS Y LICENCIAMIENTO:** Si te preguntan por ventas o precios, redirige al WhatsApp de la web como se estableció.
`;

// --- PROMPT 2: Para crear el resumen ---
const summaryPrompt = `
Eres un asistente de IA que resume conversaciones de soporte técnico. A continuación te daré un historial de chat en formato JSON. Tu única tarea es crear un resumen muy conciso y claro (máximo 2 o 3 frases) para un técnico humano. Incluye el problema principal del usuario y las soluciones que ya se intentaron. No saludes, no te despidas, no añadas explicaciones, solo entrega el resumen. Ejemplo: "El usuario [Nombre del usuario] reporta que su impresora no funciona. Ya se verificó que está encendida y conectada por USB."
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
  // --- LÍNEA CORREGIDA ---
  // Ahora usamos "systemPrompt", que es el nombre correcto de la variable que definimos arriba.
  const currentSystemPrompt = isSummarizeTask ? summaryPrompt : systemPrompt;
  
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

// --- ARRANQUE DEL SERVIDOR ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor "Cerebro" corriendo en el puerto ${PORT}`));