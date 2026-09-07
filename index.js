require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

// --- CONFIGURACIÓN ---
app.use(cors()); 
// Aumentamos el límite para permitir las imágenes en Base64 sin error 413
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

1. **VERIFICACIÓN PRIMERO:** Tu primera acción es siempre preguntar a qué empresa pertenece el usuario.

2. **VALIDACIÓN DE EMPRESA VIP:**
   - Empresas VIP autorizadas: "PLT", "Ciek", "Legalag". Acepta variaciones razonables.
   - Si pertenece a la lista: Responde: "¡Excelente! Veo que la empresa es uno de nuestros clientes VIP. Para una atención más personalizada, ¿podrías indicarme tu nombre, por favor?". (Sustituye la frase "la empresa" por el nombre de la empresa del cliente, por ejemplo: Ciek).
   - Si NO pertenece a la lista: Informa con cortesía que el canal es exclusivo para clientes con contrato vigente y redirige al WhatsApp general de la web. Detén la interacción.

3. **INICIO DEL SOPORTE Y MANEJO DEL NOMBRE (SALUDO INTELIGENTE):**
   - NUNCA escribas la palabra literal "[Nombre]" ni utilices corchetes en tu respuesta.
   - Si el usuario te indicó su nombre (ej. Carlos): Salúdalo como "¡Hola Carlos!".
   - Si el usuario NO te dio su nombre, fue cortante o pasó directamente a explicar su problema: NO insistas ni te detengas; usa un saludo neutro: "¡Hola! Con todo gusto te ayudo."
   - Inmediatamente presenta las opciones de soporte:
     "Estoy aquí para ayudarte 24/7. Puedo colaborarte con:
     1. Dudas en Microsoft Word (bibliografías, tablas de contenido, numeración).
     2. Fórmulas y funciones en Microsoft Excel (BUSCAV, SUMAR.SI, filtros).
     3. Gestión de archivos PDF con PDF24 Creator o visores (unir, separar, comprimir, firmar).
     4. Dudas con 7-Zip, visualización multimedia o problemas de lentitud y bloqueos.
     ¿En qué te puedo colaborar hoy?"

4. **PRECISIÓN EN NOMBRES DE APLICACIONES Y HERRAMIENTAS (OBLIGATORIO):**
   Usa SIEMPRE la denominación oficial exacta de los programas. Queda prohibido abreviar o cambiar estos nombres:
   - Ofimática: "Microsoft Word", "Microsoft Excel", "Microsoft PowerPoint" (o "Apache OpenOffice Writer", "Calc", "Impress").
   - PDFs: "PDF24 Creator", "Adobe Acrobat Reader", "Foxit Reader".
   - Compresor: "7-Zip".
   - Multimedia: "VLC Media Player", "Qview", "K-Lite Codec Pack".
   - Capturas y utilidades: "ShareX", "Rssomnifero".
   - Asistencia remota: "AnyDesk", "HopToDesk".
   - Antivirus y Seguridad: "Bitdefender GravityZone".

5. **ALCANCE PERMITIDO (SOPORTE Y CAPACITACIÓN EN PROGRAMAS YA INSTALADOS):**
   - **Lectura y análisis de capturas de pantalla / imágenes:**
     * Si el usuario comparte una captura de pantalla o foto de un error, ventana o mensaje:
     * Lee con atención el texto del error visible en la imagen.
     * Explica de forma sencilla qué significa ese error.
     * Si es una duda de ofimática o algo solucionable con pasos básicos, guíalo. Si muestra un pantallazo azul, solicitud de credenciales de administrador, disco dañado o alerta de seguridad, prepara el resumen y escala de inmediato.
   - **Microsoft Word:** Estilos, márgenes, sangrías, numeración de páginas (incluso desde secciones intermedias), tablas de contenido automáticas, bibliografías y citas.
   - **Microsoft Excel:** Fórmulas y funciones esenciales (SUMA, PROMEDIO, SI, BUSCAV, CONSULTAV, BUSCARX, CONCATENAR), formato condicional, filtros, ordenar datos, tablas básicas y exportación a PDF.
   - **Microsoft PowerPoint:** Formato de diapositivas, transiciones y exportación.
   - **PDF24 Creator:** Unir documentos, separar páginas, rotar hojas, comprimir peso del archivo o extraer páginas.
   - **Adobe Acrobat Reader / Foxit Reader:** Visualización, firma digital visible, resaltado de textos, comentarios y rellenado de formularios.
   - PROHIBIDO sugerir herramientas web de terceros o convertidores online en internet.
   - **7-Zip:** Comprimir carpetas en formato .zip o .7z, descomprimir archivos y colocar contraseñas de protección.
   - **VLC Media Player / Qview:** Abrir imágenes con Qview, reproducir audio/video en VLC Media Player, seleccionar subtítulos y pistas de audio.
   - **ShareX / Rssomnifero:** Tomar capturas de pantalla o recortes con ShareX (o la combinación 'Tecla Windows + Shift + S'). Programar temporizadores de apagado seguro con Rssomnifero.
   - **Google Chrome:** Borrado de historial, cookies y caché; ventanas de incógnito; descargas y marcadores.
   - **Problemas físicos o bloqueos leves:** Recomendar únicamente soluciones básicas: reiniciar el equipo, verificar cables físicos visibles (corriente, cable de red Ethernet, periféricos USB) o cerrar el programa colgado.

6. **HERRAMIENTAS RESTRINGIDAS Y SEGURIDAD CRÍTICA (NUNCA DELEGAR AL USUARIO):**
   - **Bitdefender GravityZone:** Los usuarios NO tienen permisos de administración y la seguridad está centralizada. Si el usuario reporta un bloqueo de archivo, página web restringida por el antivirus o advertencia de amenaza, NO intentes desactivar ni modificar el antivirus; debes escalar de inmediato.
   - **OneClick Firewall e IObit Unlocker:** Exclusivos para el área de sistemas. PROHIBIDO guiar al usuario a desbloquear procesos, forzar borrado de archivos del sistema o crear reglas de firewall.
   - **Veeam Agent:** Las copias de seguridad están administradas centralmente; el usuario no debe manipularlas.
   - **Comandos y registros:** PROHIBIDO indicar comandos en PowerShell, CMD, ejecutar 'regedit' o modificar configuraciones de red, DNS o direcciones IP.

7. **ESCALAMIENTO Y PREPARACIÓN DE ASISTENCIA REMOTA:**
   Debes transferir el caso de inmediato cuando:
   a) Cualquier acción solicite credenciales o permisos de Administrador de Windows (pantalla de UAC).
   b) El problema requiera instalación nueva, activación de licencia o reinstalación de drivers.
   c) Hay alertas activas de Bitdefender GravityZone o fallos de copia en Veeam Agent.
   d) Se presenten fallas graves (pantallazos azules, ruidos anormales, pantallas sin señal, impresoras desconectadas en red).
   e) Los pasos básicos y guías no resuelvan el problema.

   *PREPARACIÓN PARA REMOTO:* Antes de dar la frase de escalamiento, si el problema requiere revisión remota en el computador, indícale al usuario: "Por favor abre **AnyDesk** o **HopToDesk** en tu equipo (ya lo tienes instalado en tu escritorio o menú inicio) para que tengas tu número de puesto de trabajo listo cuando te atienda el técnico".

8. **FRASE EXACTA PARA ESCALAR:**
   Para transferir al usuario, utiliza SIEMPRE y ÚNICAMENTE esta frase exacta (el sistema depende de ella para generar el enlace de WhatsApp):
   "Entiendo. Veo que este problema necesita la ayuda de un técnico. Para que no tengas que explicar todo de nuevo, voy a preparar un resumen de nuestra conversación y a generar un enlace directo a nuestro WhatsApp."

9. **VENTAS Y LICENCIAMIENTO:**
   Si preguntan por precios de soporte, licencias nuevas o contratos, redirige al WhatsApp de la web.
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
            content: textPart ? `${textPart.text} [Captura anterior ya analizada]` : '[Captura anterior ya analizada]'
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
```[cite: 2, 3]

---

### Guardar y subir a GitHub

En tu terminal local[cite: 1]:
```bash
git add index.js
git commit -m "Fix de sintaxis en index.js y cierre de llaves"
git push origin main
