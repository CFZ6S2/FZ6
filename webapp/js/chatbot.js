import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';
import { app } from './firebase-config-env.js';

// Initialize Functions
const functions = getFunctions(app, "us-central1");
// Connect to emulator if on localhost
if (location.hostname === "localhost") {
    console.log("🔌 Connecting to Functions Emulator...");
    connectFunctionsEmulator(functions, "localhost", 5001);
}

const chatBotFunction = httpsCallable(functions, 'chatBot');

// State
let chatHistory = [];
let isOpen = false;

// DOM Elements
const container = document.createElement('div');
container.id = 'chatbot-container';
container.innerHTML = `
    <div id="chatbot-window">
        <div id="chatbot-header">
            <span>CupidIA 💘</span>
            <button id="chatbot-close">✕</button>
        </div>
        <div id="chatbot-messages">
            <!-- Dynamic greeting will be inserted here -->
        </div>
        <div id="chatbot-input-area">
            <input type="text" id="chatbot-input" placeholder="Escribe tu duda..." />
            <button id="chatbot-send">➤</button>
        </div>
    </div>
    <button id="chatbot-toggle" title="CupidIA - Asistente">💘</button>
`;

document.body.appendChild(container);

const toggleBtn = document.getElementById('chatbot-toggle');
const windowEl = document.getElementById('chatbot-window');
const closeBtn = document.getElementById('chatbot-close');
const messagesEl = document.getElementById('chatbot-messages');
const inputEl = document.getElementById('chatbot-input');
const sendBtn = document.getElementById('chatbot-send');

// Custom Greeting Logic
function getContextualGreeting() {
    const path = window.location.pathname;

    if (path.includes('suscripcion') || path.includes('membresia')) {
        return '¡Hola! 💎 Veo que estás interesad@ en potenciar tu perfil. ¿Tienes dudas sobre los planes Premium o VIP?';
    }
    if (path.includes('citas')) {
        return '¡Qué emoción, una cita! 🥂 Recuerda que puedo explicarte cómo funciona el "Seguro Anti-Plantón". ¿Te ayudo?';
    }
    if (path.includes('dashboard') || path.includes('buscar')) {
        return '¡Hola de nuevo! 💘 ¿Buscas a alguien especial o necesitas ayuda con tu perfil hoy?';
    }
    if (path.includes('pagos') || path.includes('cuenta')) {
        return 'Aquí estoy para resolver tus dudas sobre pagos, facturas o tu Monedero. 💳 ¿Qué necesitas saber?';
    }

    // Default
    return '¡Hola! Soy CupidIA, tu asistente virtual. ¿Necesitas ayuda para encontrar tu media naranja? 🏹';
}

// Set initial greeting
const initialGreeting = getContextualGreeting();
appendMessage(initialGreeting, 'bot');


// Event Listeners
toggleBtn.onclick = () => toggleChat();
closeBtn.onclick = () => toggleChat();

sendBtn.onclick = () => sendMessage();
inputEl.onkeypress = (e) => {
    if (e.key === 'Enter') sendMessage();
};

function toggleChat() {
    isOpen = !isOpen;
    if (isOpen) {
        windowEl.classList.add('open');
        inputEl.focus();
    } else {
        windowEl.classList.remove('open');
    }
}

function appendMessage(text, role) {
    const div = document.createElement('div');
    div.classList.add('chat-message', role);
    div.innerText = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    // Save to local history for context window
    chatHistory.push({
        role: role === 'user' ? 'user' : 'model',
        parts: [{ text: text }]
    });
}

function showTypingIndicator() {
    const div = document.createElement('div');
    div.classList.add('typing-indicator');
    div.id = 'typing-indicator';
    div.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
}

function removeTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) indicator.remove();
}

async function sendMessage() {
    const text = inputEl.value.trim();
    if (!text) return;

    inputEl.value = '';
    appendMessage(text, 'user');
    showTypingIndicator();

    try {
        // Detect Context
        const pageContext = {
            url: window.location.href,
            path: window.location.pathname,
            title: document.title
        };

        // Prepare context (limit history to last 10 turns to save tokens)
        const contextHistory = chatHistory.slice(-10);

        const result = await chatBotFunction({
            message: text,
            history: contextHistory,
            context: pageContext
        });

        removeTypingIndicator();

        if (result.data.error) {
            console.error("Backend Error Detail:", result.data.error);
            appendMessage(`Error del Sistema: ${result.data.error}`, 'bot');
        } else {
            const responseText = result.data.response;
            appendMessage(responseText, 'bot');
        }

    } catch (error) {
        removeTypingIndicator();
        console.error("Chatbot Error:", error);
        // DEBUG: Mostrar error real para identificar el problema
        const cleanError = error.message || JSON.stringify(error);
        appendMessage(`Error: ${cleanError}. (Intenta recargar la página)`, 'bot');
    }
}
