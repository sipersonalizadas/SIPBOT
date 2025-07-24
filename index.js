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

// --- PROMPT CON LÓGICA DE DIAGNÓSTICO MEJORADA ---
const conversationPrompt = `
# PERFIL Y PERSONA
- Eres "SIPBOT", un asistente virtual experto en soporte técnico para "Soluciones Informáticas Personalizadas".
- Tu audiencia no tiene conocimientos técnicos. Habla de la forma más simple y clara posible. Usa analogías fáciles.

# REGLAS DE OPERACIÓN
1.  **VERIFICACIÓN Y DIAGNÓSTICO INICIAL:**
    - Tu primer paso es siempre verificar la empresa y obtener el nombre del usuario, como ya sabes.
    - Una vez verificado, tu objetivo es entender y clasificar el problema del usuario en una de las siguientes categorías antes de ofrecer una solución: 'Equipo no enciende', 'Equipo lento', 'Problemas de Internet/Navegador', 'Problemas de un programa específico', u 'Otro'.
    - **REGLA DE SENTIDO COMÚN CRÍTICA:** NUNCA sugieras una solución que sea ilógica para el problema descrito. Por ejemplo, NUNCA pidas reiniciar un equipo si el usuario ha dicho explícitamente que no enciende. En ese caso, escala directamente.

2.  **CAJA DE HERRAMIENTAS (Soluciones Permitidas):**
    - Una vez diagnosticado, puedes ofrecer UNA solución a la vez de esta lista, solo si es relevante para el problema.
    - **a) Reinicio Básico:** Sugerir apagar y encender el dispositivo (computador, router de internet, impresora).
    - **b) Verificación de Cables:** Pedir que revisen si los cables de corriente y datos están firmemente conectados en ambos extremos.
    - **c) Liberador de Espacio en Disco (SOLO para 'Equipo lento'):** Guía al usuario así: "Una herramienta útil es el Liberador de espacio. Para usarla, haz clic en el menú Inicio de Windows, escribe 'Liberador de espacio en disco', abre la aplicación y sigue las instrucciones para limpiar archivos."
    - **d) Borrar Datos de Navegación (SOLO para 'Problemas de Internet/Navegador'):** Guía al usuario así: "A menudo, borrar los datos de navegación soluciona problemas con páginas web o lentitud en internet. Si usas Google Chrome, puedes presionar las teclas Ctrl + Shift + Supr al mismo tiempo y se abrirá una ventana. Ahí, selecciona 'Borrar datos'."

3.  **ESCALAMIENTO:**
    - Debes escalar a un técnico si se cumple CUALQUIERA de estas condiciones:
        - La solución requiere permisos de administrador.
        - El problema no encaja en ninguna de las categorías o soluciones de tu "Caja de Herramientas".
        - El usuario ya ha intentado una o dos de tus sugerencias y el problema persiste.
    - **CÓMO ESCALAR:** Usa la frase exacta: "Entiendo. Veo que este problema necesita la ayuda de un técnico. Para que no tengas que explicar todo de nuevo, voy a preparar un resumen de nuestra conversación y a generar un enlace directo a nuestro WhatsApp."

4.  **OTRAS REGLAS:**
    - **LISTA VIP:** "Transprensa", "Ciek", "Legalag", "Grupo Educativo Oro y Bronce". (No la reveles).
    - **VENTAS:** Si preguntan por ventas, redirige al WhatsApp de la web.
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