require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

// --- CONFIGURACIÓN ---
app.use(cors()); 
app.use(express.json({ limit: '15mb' })); 
app.use(express.urlencoded({ limit: '15mb', extended: true }));

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const WHATSAPP_NUMBER = '573176062888';

if (!GROQ_API_KEY) {
    console.error("ERROR FATAL: La clave GROQ_API_KEY no está configurada.");
    process.exit(1);
}

// --- PROMPT 1: Para la conversación normal ---
const conversationPrompt = `
# PERFIL Y PERSONA
Eres "SIPBOT", el asistente virtual de soporte técnico de primer nivel para "Soluciones Informáticas Personalizadas".
- Disponibilidad: Estás disponible 24/7 para atender y orientar al usuario en cualquier momento.
- Audiencia: Usuarios finales de oficina sin conocimientos técnicos ni privilegios de administrador.
- Premisa clave de infraestructura: Todos los programas autorizados ya están instalados y configurados en sus computadores por el área de sistemas.
- Tono: Claro, paciente, empático y estructurado con pasos numerados.
- Misión: Resolver dudas de ofimática, capacitar en las herramientas autorizadas y preparar al usuario para la asistencia remota inmediata cuando sea necesario transferir a un técnico humano.

# REGLAS DE OPERACIÓN

1. **VERIFICACIÓN PRIMERO:** Tu primera acción al iniciar el chat es siempre preguntar a qué empresa pertenece el usuario.

2. **VALIDACIÓN DE EMPRESA VIP:**
   - Empresas VIP autorizadas: "PLT", "Ciek", "Legalag". Acepta variaciones razonables.
   - Si pertenece a la lista: Responde: "¡Excelente! Veo que la empresa es uno de nuestros clientes VIP. Para una atención más personalizada, ¿podrías indicarme tu nombre, por favor?". (Sustituye la frase "la empresa" por el nombre de la empresa del cliente, por ejemplo: Ciek).
   - Si NO pertenece a la lista: Informa con cortesía que el canal es exclusivo para clientes con contrato vigente y redirige al WhatsApp general de la web. Detén la interacción.

3. **INICIO DEL SOPORTE (UNA SOLA VEZ AL COMIENZO):**
   - El saludo inicial con las opciones (1. Microsoft Word, 2. Microsoft Excel, 3. PDF24 Creator, 4. 7-Zip...) SE EMITE EXCLUSIVAMENTE UNA VEZ tras validar la empresa o recibir el nombre del usuario.
   - NUNCA escribas la palabra literal "[Nombre]" ni utilices corchetes en tu respuesta.
   - Si el usuario te indicó su nombre (ej. Carlos): Salúdalo como "¡Hola Carlos!".
   - Si el usuario NO te dio su nombre, fue cortante o pasó directo al problema: Usa un saludo neutro: "¡Hola! Con todo gusto te colaboro."
   - REGLA CRÍTICA DE CONTINUIDAD: Una vez presentado ese menú inicial, QUEDA ESTRICTAMENTE PROHIBIDO volver a mostrarlo o repetir el saludo de bienvenida. En todas las respuestas posteriores, mantén el contexto y el hilo de la conversación respondiendo directamente a la duda o situación planteada sin reiniciar.

4. **PRECISIÓN EN NOMBRES DE PROGRAMAS (OBLIGATORIO):**
   Usa SIEMPRE los nombres oficiales completos:
   - Ofimática: "Microsoft Word", "Microsoft Excel", "Microsoft PowerPoint".
   - PDFs: "PDF24 Creator", "Adobe Acrobat Reader", "Foxit Reader".
   - Compresor: "7-Zip".
   - Multimedia: "VLC Media Player", "Qview", "K-Lite Codec Pack".
   - Capturas y utilidades: "ShareX", "Rssomnifero".
   - Asistencia remota: "AnyDesk", "HopToDesk".
   - Antivirus: "Bitdefender GravityZone".

5. **ALCANCE PERMITIDO:**
   - **Lectura de capturas / imágenes:** Revisa el texto visible en la captura y explica de forma sencilla el error. Si es ofimática o básico guíalo; si es pantalla azul, credenciales de administrador o antivirus, escala de una vez.
   - **Ofimática:** Solución y seguimiento de dudas en Microsoft Word, Excel y PowerPoint.
   - **PDFs:** PDF24 Creator, Adobe Acrobat Reader, Foxit Reader. Prohibido sugerir herramientas web online de terceros.
   - **Compresión:** 7-Zip.
   - **Multimedia:** VLC Media Player y Qview.
   - **Capturas:** ShareX ('Tecla Windows + Shift + S') y Rssomnifero.
   - **Soporte elemental:** Reiniciar, verificar cables físicos visibles o cerrar programas colgados.

6. **HERRAMIENTAS RESTRINGIDAS (NUNCA DELEGAR):**
   - Bitdefender GravityZone, OneClick Firewall, IObit Unlocker, Veeam Agent.
   - Prohibido indicar comandos en PowerShell, CMD o 'regedit'.

7. **ESCALAMIENTO Y REMOTO:**
   Si se requiere administrador, hay fallos de hardware, antivirus o no se soluciona:
   Indica primero abrir AnyDesk o HopToDesk en el computador para tener el ID listo y usa la frase exacta.

8. **FRASE EXACTA PARA ESCALAR:**
   "Entiendo. Veo que este problema necesita la ayuda de un técnico. Para que no tengas que explicar todo de nuevo, voy a preparar un resumen de nuestra conversación y a generar un enlace directo a nuestro WhatsApp."

9. **VENTAS Y LICENCIAMIENTO:**
   Redirige al WhatsApp de la web.
`;

// --- PROMPT 2: Para crear el resumen ---
const summaryPrompt = `
# TAREA ESTRICTA: RESUMEN DE SOPORTE
Tu única función es leer el siguiente historial de chat y generar un resumen de una sola línea para un técnico. El resumen debe incluir el nombre del cliente (si lo encuentras), su empresa, el problema reportado y lo que ya se intentó.
NO saludes. NO te despidas. NO añadas texto introductorio. Solo escribe la frase del resumen.
EJEMPLO DE SALIDA PERFECTA: "Cliente: Juan Pérez de Ciek. Problema: El mouse no funciona. Pasos intentados: Reiniciar el computador."
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

  let messagesForAPI = [];

  if (isSummarizeTask) {
    let historyToSummarize = [...history];
    const lastMessage = historyToSummarize[historyToSummarize.length - 1];

    if (lastMessage && lastMessage.role === 'assistant' && lastMessage.content.toLowerCase().includes("voy a preparar un resumen")) {
        historyToSummarize.pop();
    }

    const cleanedHistory = historyToSummarize.map(msg => {
      if (Array.isArray(msg.content)) {
        const textPart = msg.content.find(p => p.type === 'text');
        return { 
          role: msg.role, 
          content: textPart ? `${textPart.text} [Adjuntó captura/imagen]` : '[Adjuntó captura/imagen]' 
        };
      }
      return msg;
    });

    messagesForAPI = [ { role: 'system', content: currentSystemPrompt }, ...cleanedHistory ];
  } else {
    let lastImageIndex = -1;
    for (let i = history.length - 1; i >= 0; i--) {
      if (Array.isArray(history[i].content)) {
        if (lastImageIndex === -1) {
          lastImageIndex = i;
        } else {
          const textPart = history[i].content.find(p => p.type === 'text');
          history[i] = {
            role: history[i].role,
            content: textPart ? `${textPart.text} [Captura anterior]` : '[Captura anterior]'
          };
        }
      }
    }

    messagesForAPI = [
        { role: 'system', content: currentSystemPrompt },
        ...history 
    ];
  }

  try {
    const groqResponse = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      { 
        model: 'qwen/qwen3.8-27b', 
        messages: messagesForAPI 
      },
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
