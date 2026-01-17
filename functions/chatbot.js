const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { VertexAI } = require("@google-cloud/vertexai");

// Initialize Vertex AI with project credentials (automatic in Firebase Functions)
const vertexAI = new VertexAI({
    project: process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT,
    location: "us-central1"
});

exports.chatBot = onCall({
    region: "us-central1",
    cors: true
}, async (request) => {
    // App Check (Optional)
    if (!request.auth && !request.app) {
        // console.warn("Chatbot called without App Check...");
    }

    const userMessage = request.data.message;
    const history = request.data.history || [];

    if (!userMessage) {
        throw new HttpsError("invalid-argument", "Message is required.");
    }

    try {
        // Get the generative model
        const model = vertexAI.getGenerativeModel({
            model: "gemini-2.0-flash-001",
            systemInstruction: `
Eres 'CupidIA', el asistente virtual inteligente de TuCitaSegura.com.
Tu objetivo es ayudar a los usuarios a navegar por la plataforma, resolver dudas sobre pagos/suscripciones y dar consejos de seguridad.

CONTEXTO ACTUAL DEL USUARIO: \${request.data.context ? JSON.stringify(request.data.context) : 'Desconocido'}

CONOCIMIENTO DE LA PLATAFORMA:

1. SUSCRIPCIONES Y PAGOS:
- **Estado Actual:** Por razones logísticas, las suscripciones de pago y la compra de créditos están TEMPORALMENTE DESHABILITADAS.
- **Mensaje Clave:** Si preguntan por precios o cómo pagar, DEBES decir textualmente: "Esta opción todavía no se puede implementar por razones logísticas, pero estamos trabajando en ello".
- **Gratis (Free):** Los usuarios pueden usar las funciones básicas libremente por ahora.

2. FUNCIONES CLAVE:
- **Citas (Dates):** Acuerdos para encuentros.
- **Eventos:** Experiencias grupales exclusivas.
- **Verificación:** Es OBLIGATORIA para funciones avanzadas. Se hace con foto del DNI+Selfie.

3. SEGURIDAD (MUY IMPORTANTE):
- Nunca des dinero a otros usuarios.
- Mantén la conversación en la plataforma hasta tener confianza.
- Reporta perfiles sospechosos inmediatamente.

TONO:
- Amigable, profesional y empático.
- Si preguntan por PAGO/PRECIO: Sé claro sobre la indisponibilidad logística, sin dar explicaciones técnicas complejas.
- Si está en "Citas", da consejos de seguridad.
- Responde siempre en español.
- Sé conciso (máximo 3-4 frases salvo que la explicación requiera más).
`
        });

        const chat = model.startChat({
            history: history.map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: msg.parts || [{ text: msg.text || '' }]
            })),
            generationConfig: {
                maxOutputTokens: 256,
            },
        });

        console.log("Sending message to Vertex AI Gemini...");
        const result = await chat.sendMessage(userMessage);
        const response = result.response;

        // Handle both old and new API response formats
        let text;
        if (typeof response.text === 'function') {
            text = response.text();
        } else if (response.candidates && response.candidates[0]) {
            // Gemini 2.0 format: extract from candidates
            text = response.candidates[0].content.parts[0].text;
        } else {
            // Fallback: try to stringify
            text = JSON.stringify(response);
            console.warn("Unexpected response format:", response);
        }

        return { response: text };

    } catch (error) {
        console.error("CRITICAL ERROR IN CHATBOT:", error);

        let errorDetails = error.message;

        // Log detailed error if available
        if (error.response) {
            console.error("Error Response Status:", error.response.status);
            if (typeof error.response.text === 'function') {
                try {
                    const text = await error.response.text();
                    console.error("Error Response Body:", text.substring(0, 500));
                    errorDetails += " | Body: " + text.substring(0, 50);
                } catch (e) {
                    console.error("Could not read error body");
                }
            }
        }

        return {
            response: "Lo siento, tuve un problema de conexión con mi cerebro de IA. Intenta de nuevo en un momento.",
            error: errorDetails
        };
    }
});
