// CupidIA Guided Registration - Conversational Flow
import './firebase-appcheck.js';
import { auth } from './firebase-config-env.js';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';

// State Machine States
const STATES = {
    WELCOME: 'welcome',
    ASK_EMAIL: 'ask_email',
    ASK_PASSWORD: 'ask_password',
    ASK_CONFIRM_PASSWORD: 'ask_confirm_password',
    ASK_BIRTHDATE: 'ask_birthdate',
    ASK_GENDER: 'ask_gender',
    ASK_REFERRAL_EXIST: 'ask_referral_exist',
    ASK_REFERRAL_CODE: 'ask_referral_code',
    ASK_TERMS: 'ask_terms',
    CREATING_ACCOUNT: 'creating_account',
    SUCCESS: 'success',
    ERROR: 'error'
};

// Registration data
let registrationData = {
    email: '',
    password: '',
    confirmPassword: '',
    birthDate: '',
    birthDate: '',
    gender: '',
    referralCode: '',
    termsAccepted: false
};

let currentState = STATES.WELCOME;

// DOM Elements
const messagesContainer = document.getElementById('chatMessages');
const inputEl = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const quickRepliesContainer = document.getElementById('quickReplies');
const progressFill = document.getElementById('progressFill');
const passwordToggle = document.getElementById('passwordToggle');
const inputArea = document.getElementById('inputArea');

// Progress mapping
const progressMap = {
    [STATES.WELCOME]: 0,
    [STATES.ASK_EMAIL]: 15,
    [STATES.ASK_PASSWORD]: 30,
    [STATES.ASK_CONFIRM_PASSWORD]: 45,
    [STATES.ASK_BIRTHDATE]: 60,
    [STATES.ASK_GENDER]: 70,
    [STATES.ASK_REFERRAL_EXIST]: 80,
    [STATES.ASK_REFERRAL_CODE]: 85,
    [STATES.ASK_TERMS]: 90,
    [STATES.CREATING_ACCOUNT]: 95,
    [STATES.SUCCESS]: 100
};

// Update progress bar
function updateProgress() {
    const progress = progressMap[currentState] || 0;
    progressFill.style.width = `${progress}%`;
}

// Add message to chat
function addMessage(text, type = 'bot', delay = 0) {
    return new Promise(resolve => {
        setTimeout(() => {
            const div = document.createElement('div');
            div.className = `message ${type}`;
            div.innerHTML = text;
            messagesContainer.appendChild(div);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            resolve();
        }, delay);
    });
}

// Show typing indicator
function showTyping() {
    const div = document.createElement('div');
    div.className = 'typing-indicator';
    div.id = 'typingIndicator';
    div.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
    messagesContainer.appendChild(div);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Hide typing indicator
function hideTyping() {
    document.getElementById('typingIndicator')?.remove();
}

// Show quick reply buttons
function showQuickReplies(options) {
    quickRepliesContainer.innerHTML = '';
    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'quick-reply';
        btn.innerHTML = opt.icon ? `${opt.icon} ${opt.label}` : opt.label;
        btn.onclick = () => handleQuickReply(opt.value);
        quickRepliesContainer.appendChild(btn);
    });
    quickRepliesContainer.classList.remove('hidden');
    inputArea.classList.add('hidden');
}

// Hide quick replies
function hideQuickReplies() {
    quickRepliesContainer.classList.add('hidden');
    quickRepliesContainer.innerHTML = '';
    inputArea.classList.remove('hidden');
}

// Bot speaks with typing effect
async function botSay(text, delay = 500) {
    showTyping();
    await new Promise(r => setTimeout(r, delay));
    hideTyping();
    await addMessage(text, 'bot');
}

// Validation functions
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(password) {
    return password.length >= 6;
}

function isOver18(birthDate) {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age >= 18;
}

// State handlers
async function handleState() {
    updateProgress();

    switch (currentState) {
        case STATES.WELCOME:
            await botSay('¡Hola! Soy <strong>CupidIA</strong> 💘', 800);
            await botSay('Te voy a ayudar a crear tu cuenta paso a paso. ¡Es muy fácil!', 600);
            currentState = STATES.ASK_EMAIL;
            await handleState();
            break;

        case STATES.ASK_EMAIL:
            await botSay('Primero, ¿cuál es tu <strong>correo electrónico</strong>? 📧', 500);
            inputEl.type = 'email';
            inputEl.placeholder = 'tu@email.com';
            inputEl.focus();
            break;

        case STATES.ASK_PASSWORD:
            await botSay('¡Perfecto! Ahora necesito una <strong>contraseña segura</strong> 🔒', 500);
            await botSay('Debe tener al menos 6 caracteres.', 400);
            inputEl.type = 'password';
            inputEl.placeholder = 'Mínimo 6 caracteres';
            passwordToggle.classList.remove('hidden');
            inputEl.focus();
            break;

        case STATES.ASK_CONFIRM_PASSWORD:
            await botSay('Repite la contraseña para confirmar:', 500);
            inputEl.type = 'password';
            inputEl.placeholder = 'Confirma tu contraseña';
            inputEl.focus();
            break;

        case STATES.ASK_BIRTHDATE:
            await botSay('¿Cuál es tu <strong>fecha de nacimiento</strong>? 🎂', 500);
            await botSay('Debes ser mayor de 18 años para usar TuCitaSegura.', 400);
            inputEl.type = 'date';
            inputEl.placeholder = '';
            // Set max date to 18 years ago
            const maxDate = new Date();
            maxDate.setFullYear(maxDate.getFullYear() - 18);
            inputEl.max = maxDate.toISOString().split('T')[0];
            passwordToggle.classList.add('hidden');
            inputEl.focus();
            break;

        case STATES.ASK_GENDER:
            await botSay('¿Cómo te identificas? 👤', 500);
            showQuickReplies([
                { icon: '👨', label: 'Hombre', value: 'masculino' },
                { icon: '👩', label: 'Mujer', value: 'femenino' }
            ]);
            break;

        case STATES.ASK_REFERRAL_EXIST:
            await botSay('Por cierto, ¿tienes algún <strong>código de invitación</strong> de un amigo? 🎟️', 500);
            showQuickReplies([
                { icon: '👍', label: 'Sí, tengo código', value: 'yes_code' },
                { icon: '👎', label: 'No tengo', value: 'no_code' }
            ]);
            break;

        case STATES.ASK_REFERRAL_CODE:
            await botSay('¡Genial! Escríbelo aquí abajo 👇', 500);
            inputEl.type = 'text';
            inputEl.placeholder = 'Ej: ALIAS123';
            inputEl.focus();
            break;

        case STATES.ASK_TERMS:
            await botSay('Último paso: Para continuar, necesitas aceptar los <strong>Términos y Condiciones</strong> y la <strong>Política de Privacidad</strong>. 📋', 500);
            await botSay('<a href="/terminos.html" target="_blank" style="color: #60a5fa;">Ver Términos</a> | <a href="/privacidad.html" target="_blank" style="color: #60a5fa;">Ver Privacidad</a>', 300);
            showQuickReplies([
                { icon: '✅', label: 'Acepto', value: 'accept' },
                { icon: '❌', label: 'No acepto', value: 'reject' }
            ]);
            break;

        case STATES.CREATING_ACCOUNT:
            hideQuickReplies();
            await botSay('¡Genial! Estoy creando tu cuenta... ⏳', 300);
            await createAccount();
            break;

        case STATES.SUCCESS:
            await botSay('🎉 <strong>¡Tu cuenta ha sido creada!</strong>', 500);
            await botSay('Te he enviado un correo de verificación. Revisa tu bandeja de entrada (y spam).', 500);
            await botSay('Ahora vamos a completar tu perfil para que puedas encontrar tu media naranja 💕', 500);

            // Redirect button
            setTimeout(() => {
                const div = document.createElement('div');
                div.className = 'quick-replies';
                div.innerHTML = '<a href="/perfil-asistido.html" class="quick-reply" style="text-decoration: none;">🚀 Continuar al Perfil</a>';
                messagesContainer.appendChild(div);
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }, 1000);
            break;
    }
}

// Handle user text input
async function handleInput(value) {
    value = value.trim();
    if (!value) return;

    addMessage(value, 'user');
    inputEl.value = '';

    switch (currentState) {
        case STATES.ASK_EMAIL:
            if (!isValidEmail(value)) {
                await botSay('Hmm, ese email no parece válido. ¿Puedes revisarlo? 🤔', 400);
                return;
            }
            registrationData.email = value;
            currentState = STATES.ASK_PASSWORD;
            break;

        case STATES.ASK_PASSWORD:
            if (!isValidPassword(value)) {
                await botSay('La contraseña es muy corta. Necesita al menos 6 caracteres. 🔐', 400);
                return;
            }
            registrationData.password = value;
            currentState = STATES.ASK_CONFIRM_PASSWORD;
            break;

        case STATES.ASK_CONFIRM_PASSWORD:
            if (value !== registrationData.password) {
                await botSay('Las contraseñas no coinciden. Intenta de nuevo. 🔄', 400);
                return;
            }
            registrationData.confirmPassword = value;
            currentState = STATES.ASK_BIRTHDATE;
            break;

        case STATES.ASK_BIRTHDATE:
            if (!isOver18(value)) {
                await botSay('Lo siento, debes tener al menos 18 años para registrarte. 🔞', 400);
                return;
            }
            registrationData.birthDate = value;
            registrationData.birthDate = value;
            currentState = STATES.ASK_GENDER;
            break;

        case STATES.ASK_REFERRAL_CODE:
            registrationData.referralCode = value.toUpperCase(); // Force uppercase
            await botSay(`Código <strong>${registrationData.referralCode}</strong> guardado. 👍`, 500);
            currentState = STATES.ASK_TERMS;
            break;
    }

    await handleState();
}

// Handle quick reply buttons
async function handleQuickReply(value) {
    hideQuickReplies();

    switch (currentState) {
        case STATES.ASK_GENDER:
            const genderLabel = value === 'masculino' ? '👨 Hombre' : '👩 Mujer';
            addMessage(genderLabel, 'user');
            addMessage(genderLabel, 'user');
            registrationData.gender = value;
            currentState = STATES.ASK_REFERRAL_EXIST;
            break;

        case STATES.ASK_REFERRAL_EXIST:
            if (value === 'yes_code') {
                addMessage('Sí, tengo código', 'user');
                currentState = STATES.ASK_REFERRAL_CODE;
            } else {
                addMessage('No tengo', 'user');
                currentState = STATES.ASK_TERMS;
            }
            break;

        case STATES.ASK_TERMS:
            if (value === 'accept') {
                addMessage('✅ Acepto', 'user');
                registrationData.termsAccepted = true;
                currentState = STATES.CREATING_ACCOUNT;
            } else {
                addMessage('❌ No acepto', 'user');
                await botSay('Lo siento, necesitas aceptar los términos para crear una cuenta. 😢', 500);
                await botSay('Si cambias de opinión, <a href="/registro-asistido.html" style="color: #60a5fa;">puedes empezar de nuevo</a>.', 400);
                return;
            }
            break;
    }

    await handleState();
}

// Create Firebase account
async function createAccount() {
    try {
        // Create user
        const userCredential = await createUserWithEmailAndPassword(
            auth,
            registrationData.email,
            registrationData.password
        );
        const user = userCredential.user;

        // Send verification email
        await sendEmailVerification(user);

        // Create user document in Firestore
        const db = getFirestore();
        await setDoc(doc(db, 'users', user.uid), {
            email: registrationData.email,
            userRole: 'regular',
            userRole: 'regular',
            gender: registrationData.gender,
            birthDate: registrationData.birthDate,
            referralCode: registrationData.referralCode || null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            profileComplete: false,
            isVerified: false,
            registrationMethod: 'cupidia-assisted'
        });

        currentState = STATES.SUCCESS;
        await handleState();

    } catch (error) {
        console.error('Registration error:', error);

        let errorMessage = 'Hubo un problema al crear tu cuenta.';

        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'Este email ya está registrado. ¿Quizás quieres <a href="/login.html" style="color: #60a5fa;">iniciar sesión</a>?';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'El email no es válido.';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'La contraseña es muy débil.';
        }

        await addMessage(errorMessage, 'error');
        await botSay('¿Quieres intentarlo de nuevo?', 500);

        showQuickReplies([
            { icon: '🔄', label: 'Reintentar', value: 'retry' },
            { icon: '📝', label: 'Formulario normal', value: 'form' }
        ]);

        // Handle retry
        const originalHandler = window.handleQuickReply;
        window.handleQuickReply = async (val) => {
            hideQuickReplies();
            if (val === 'retry') {
                window.location.reload();
            } else {
                window.location.href = '/register.html';
            }
        };
    }
}

// Event listeners
sendBtn.onclick = () => handleInput(inputEl.value);
inputEl.onkeypress = (e) => {
    if (e.key === 'Enter') handleInput(inputEl.value);
};

// Password toggle
passwordToggle.onclick = () => {
    const isPassword = inputEl.type === 'password';
    inputEl.type = isPassword ? 'text' : 'password';
    passwordToggle.innerHTML = `<i class="fas fa-eye${isPassword ? '-slash' : ''}"></i>`;
};

// Expose for quick replies
window.handleQuickReply = handleQuickReply;

// Start conversation (only once)
let initialized = false;
function init() {
    if (initialized) return;
    initialized = true;
    handleState();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
