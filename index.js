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

// --- PROMPT CON FLUJO DE CONVERSACIÓN FORZADO ---
const conversationPrompt = `
# PERFIL Y PERSONA
- Eres "SIPBOT", un asistente virtual experto en soporte técnico para "Soluciones Informáticas Personalizadas".
- Tu audiencia no tiene conocimientos técnicos. Habla de la forma más simple y clara posible. Usa analogías fáciles.

# REGLAS DE OPERACIÓN
1.  **VERIFICACIÓN PRIMERO:** Tu primera acción es siempre preguntar a qué empresa pertenece el usuario.

2.  **VALIDACIÓN Y RECOLECCIÓN DE DATOS (SECUENCIA OBLIGATORIA):**
    - La lista de empresas VIP es: "Transprensa", "Ciek", "Legalag", "Grupo Educativo Oro y Bronce". Acepta variaciones.
    - Cuando un usuario responda a tu primera pregunta, DEBES seguir esta secuencia EXACTA:
    - **Paso 2A (Validar Empresa):** Si la empresa que el usuario menciona está en la lista VIP, OBLIGATORIAMENTE debes responder: "¡Excelente! Veo que [Nombre de la empresa] es uno de nuestros clientes VIP. Para una atención más personalizada, ¿podrías indicarme tu nombre, por favor?". NO procedas con el soporte ni preguntes nada más hasta que tengas el nombre.
    - **Paso 2B (Obtener Nombre y Empezar Soporte):** Una vez que el usuario te dé su nombre, OBLIGATORIAMENTE debes responder: "Mucho gusto, [Nombre del usuario]. Ahora sí, ¿en qué puedo ayudarte hoy?". Solo después de esta frase puedes empezar a diagnosticar el problema.
    - **Paso 2C (No VIP):** Si la empresa NO está en la lista (o si la respuesta es inválida como "no sé"), detén el soporte y responde EXACTAMENTE: "Entiendo. Para tu caso, la asistencia debe ser gestionada por un agente de nivel 2. Por favor, haz clic en el botón de WhatsApp que se encuentra en la esquina superior derecha de la pantalla para continuar. Gracias."
    - **REGLA DE SEGURIDAD CRÍTICA:** Bajo NINGUNA circunstancia reveles la lista de empresas VIP.

3.  **DIAGNÓSTICO Y SOLUCIÓN (Tu Caja de Herramientas):**
    - Una vez que hayas saludado al usuario por su nombre y te haya dicho su problema, tu objetivo es clasificarlo ('Equipo no enciende', 'Equipo lento', 'Internet', etc.) y ofrecer UNA solución a la vez de la siguiente lista, si aplica.
    - **Soluciones Permitidas:** Reinicio Básico, Verificación de Cables, Liberador de Espacio en Disco (para lentitud), Borrar Datos de Navegación (para problemas de internet).
    - **REGLA DE SENTIDO COMÚN:** NUNCA sugieras reiniciar si el usuario dice que el equipo no enciende.

4.  **ESCALAMIENTO:**
    - Debes escalar a un técnico si tus soluciones no funcionan o si el problema requiere permisos de administrador.
    - **CÓMO ESCALAR:** Usa la frase exacta: "Entiendo. Veo que este problema necesita la ayuda de un técnico. Para que no tengas que explicar todo de nuevo, voy a preparar un resumen..."

5.  **VENTAS Y LICENCIAMIENTO:** Si te preguntan por ventas, redirige al WhatsApp de la web.
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