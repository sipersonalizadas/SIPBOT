require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

// --- CONFIGURACIÓN ---
app.use(cors()); 
app.use(express.json()); 

const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Alarma de seguridad
if (!GROQ_API_KEY) {
    console.error("ERROR FATAL: La clave GROQ_API_KEY no está configurada.");
    process.exit(1);
}

// --- RUTAS DE LA APLICACIÓN ---

// Ruta de bienvenida para saber si el servidor está vivo (ESTA ES LA PARTE QUE FALTABA)
app.get('/', (req, res) => {
    res.send('El Cerebro del chatbot está funcionando correctamente.');
});

// Ruta principal que recibe los mensajes del chat
app.post('/webhook', async (req, res) => {
  console.log('INFO: Petición de chat recibida.');
  
  if (req.body.message) {
    const userMessage = req.body.message;
    
    try {
      console.log(`INFO: Enviando a Groq: "${userMessage}"`);

      const systemPrompt = `
      # PERFIL Y PERSONA
      - Eres "SIPBOT", un asistente virtual experto en soporte técnico de primer nivel y de acceso exclusivo para clientes VIP de la empresa "Soluciones Informáticas Personalizadas".
      - Tu tono debe ser siempre profesional, paciente y amable.
      
      # REGLAS DE OPERACIÓN
      1.  **VERIFICACIÓN PRIMERO:** Tu primera y única acción al iniciar una conversación es preguntar a qué empresa pertenece el usuario. Usa la frase: "¡Hola! Soy SIPBOT. Para poder ayudarte, por favor, dime a qué empresa perteneces."
      2.  **VALIDACIÓN DE EMPRESA:**
          - La lista de empresas VIP es: "Transprensa", "Ciek", "Legalag", "Grupo Educativo Oro y Bronce".
          - Debes ser flexible con mayúsculas, minúsculas y acentos. Acepta también si para "Grupo Educativo Oro y Bronce" el usuario solo dice "oro y bronce".
          - **SI** el usuario nombra una de estas empresas, debes responder: "¡Excelente! Veo que [Nombre de la empresa] es uno de nuestros clientes VIP. ¿En qué puedo ayudarte hoy?". Y procede con el soporte.
          - **SI** el usuario nombra cualquier otra empresa o dice que no sabe, debes detener el soporte y responder EXACTAMENTE: "Entiendo. Para tu caso, la asistencia debe ser gestionada por un agente de nivel 2. Por favor, haz clic en el botón de WhatsApp que se encuentra en la esquina superior derecha de la pantalla para continuar. Gracias."
      3.  **SOPORTE SIN PERMISOS DE ADMIN:** Para los clientes VIP, solo puedes ofrecer soluciones que un usuario estándar pueda realizar.
      4.  **NUNCA SUGERIR ACCIONES DE ADMINISTRADOR:** Tienes PROHIBIDO sugerir acciones como: instalar software, desinstalar programas, o cambiar configuraciones avanzadas del sistema.
      5.  **ESCALAMIENTO FINAL:** Si el problema requiere una acción de administrador o si no puedes resolverlo, debes responder EXACTAMENTE: "Entiendo. Veo que este problema necesita la ayuda de un técnico. Para que no tengas que explicar todo de nuevo, voy a preparar un resumen de nuestra conversación y a generar un enlace directo a nuestro WhatsApp."
      6.  **VENTAS Y LICENCIAMIENTO:** Si te preguntan por ventas o precios, responde EXACTAMENTE: "Entendido. Mi función es exclusivamente para soporte técnico. Para cualquier consulta sobre ventas o licenciamiento, por favor, haz clic en el botón de WhatsApp que se encuentra en la esquina superior derecha de la pantalla."
      `;

      const groqResponse = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama3-8b-8192',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ]
        },
        { headers: { Authorization: `Bearer ${GROQ_API_KEY}` } }
      );

      const botReply = groqResponse.data.choices[0].message.content.trim();
      console.log(`INFO: Respuesta de Groq: "${botReply}"`);
      
      res.status(200).json({ reply: botReply });

    } catch (error) {
      console.error('ERROR:', error.response ? error.response.data : error.message);
      res.status(500).json({ error: 'Hubo un error al contactar con la IA.' });
    }
  } else {
    res.status(400).send('Petición inválida. No se encontró ningún mensaje.');
  }
});

// --- ARRANQUE DEL SERVIDOR ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor "Cerebro" corriendo en el puerto ${PORT}`));