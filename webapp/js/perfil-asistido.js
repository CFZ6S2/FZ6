// CupidIA Guided Profile Completion - Conversational Flow
import './firebase-appcheck.js';
import { auth, storage, getDb } from './firebase-config-env.js';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { imageCompressor } from './image-compressor.js';
import { applyTheme } from './theme.js'; // Import theme utility

// State Machine States
const STATES = {
    LOADING: 'loading',
    NOT_LOGGED_IN: 'not_logged_in',
    WELCOME: 'welcome',
    ASK_GENDER: 'ask_gender', // New State for recovery
    ASK_ALIAS: 'ask_alias',
    ASK_PHOTO: 'ask_photo',
    ASK_BIO: 'ask_bio',
    ASK_RELATIONSHIP: 'ask_relationship',
    ASK_GALLERY: 'ask_gallery',
    ASK_CITY: 'ask_city',
    ASK_LOOKING_FOR: 'ask_looking_for',
    ASK_THEME: 'ask_theme',
    ASK_AVAILABILITY: 'ask_availability', // Females Only
    SAVING: 'saving',
    SUCCESS: 'success'
};

// Profile data
let profileData = {
    alias: '',
    photoURL: '',
    bio: '',
    gallery: [],
    city: '',
    gender: '', // New field
    relationshipStatus: '',
    lookingFor: '',
    availabilityStatus: 'available', // Default
    theme: 'blue'
};

let currentState = STATES.LOADING;
let currentUser = null;
let db = null;

// DOM Elements
const messagesContainer = document.getElementById('chatMessages');
const inputEl = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const quickRepliesContainer = document.getElementById('quickReplies');
const progressFill = document.getElementById('progressFill');
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const inputArea = document.getElementById('inputArea');

// Progress mapping
const progressMap = {
    [STATES.LOADING]: 0,
    [STATES.WELCOME]: 5,
    [STATES.ASK_GENDER]: 8,
    [STATES.ASK_ALIAS]: 10,
    [STATES.ASK_PHOTO]: 20,
    [STATES.ASK_BIO]: 30,
    [STATES.ASK_RELATIONSHIP]: 40,
    [STATES.ASK_GALLERY]: 55,
    [STATES.ASK_CITY]: 70,
    [STATES.ASK_LOOKING_FOR]: 80,
    [STATES.ASK_THEME]: 85,
    [STATES.ASK_AVAILABILITY]: 90,
    [STATES.SAVING]: 95,
    [STATES.SUCCESS]: 100
};

// Update progress bar
function updateProgress() {
    const progress = progressMap[currentState] || 0;
    progressFill.style.width = `${progress}%`;
}

// Add message to chat
function addMessage(text, type = 'bot') {
    const div = document.createElement('div');
    div.className = `message ${type}`;
    div.innerHTML = text;
    messagesContainer.appendChild(div);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    return div;
}

// Add image message
function addImageMessage(url, type = 'user') {
    const div = document.createElement('div');
    div.className = `message ${type}`;
    div.innerHTML = `<img src="${url}" class="photo-preview" alt="Foto">`;
    messagesContainer.appendChild(div);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
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
    addMessage(text, 'bot');
}

// Show file upload button
function showUploadButton() {
    uploadBtn.classList.remove('hidden');
    inputEl.classList.add('hidden');
    sendBtn.classList.add('hidden');
}

// Show text input
function showTextInput(placeholder = 'Escribe aquí...') {
    uploadBtn.classList.add('hidden');
    inputEl.classList.remove('hidden');
    sendBtn.classList.remove('hidden');
    inputEl.placeholder = placeholder;
    inputEl.focus();
}

// Upload image to Firebase Storage
async function uploadImage(file, path) {
    try {
        // Compress image
        let processedFile = file;
        try {
            processedFile = await imageCompressor.compress(file, {
                maxWidth: 1024,
                maxHeight: 1024,
                quality: 0.85
            });
        } catch (e) {
            console.warn('Compression failed, using original', e);
        }

        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, processedFile);
        return await getDownloadURL(storageRef);
    } catch (error) {
        console.error('Upload error:', error);
        throw error;
    }
}

// --- GPS LOCATION LOGIC ---
async function getUserLocation() {
    if (!navigator.geolocation) {
        addMessage('Tu navegador no soporta GPS.', 'bot');
        return;
    }

    addMessage('<i class="fas fa-satellite-dish fa-spin"></i> Localizando...', 'bot');

    try {
        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            });
        });

        const { latitude, longitude } = position.coords;
        await reverseGeocode(latitude, longitude);

    } catch (error) {
        console.error('GPS Error:', error);
        addMessage('No pude obtener tu ubicación. Por favor escríbela.', 'bot');
    }
}

async function reverseGeocode(lat, lng) {
    try {
        // Simple Nominatim fallback if Maps API not loaded/configured in this context
        // Or re-use Maps logic if available. For resilience, let's use a public API or logic.
        // Assuming Google Maps script might not be loaded here.
        // Let's use OpenStreetMap Nominatim for this quick assistant as it requires no key setup in this file.
        // OR better: Just map coordinates to "Ubicación detectada" and ask user to confirm city name.

        // Let's try to fetch city name
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const data = await response.json();

        let city = data.address.city || data.address.town || data.address.village || data.address.municipality;

        if (city) {
            addMessage(`📍 Detectado: ${city}`, 'user');
            profileData.city = city;
            currentState = STATES.ASK_LOOKING_FOR;
            await handleState();
        } else {
            addMessage('Ubicación detectada, pero no el nombre de la ciudad.', 'bot');
            addMessage('Por favor escribe el nombre de tu ciudad.', 'bot');
        }

    } catch (e) {
        console.error('Reverse Geocode failed:', e);
        addMessage('Error al obtener nombre de ciudad. Escríbelo por favor.', 'bot');
    }
}


// State handlers
async function handleState() {
    updateProgress();

    switch (currentState) {
        case STATES.LOADING:
            addMessage('Cargando tu perfil... ⏳', 'bot');
            break;

        case STATES.NOT_LOGGED_IN:
            await botSay('¡Ups! Parece que no has iniciado sesión. 🔐', 500);
            await botSay('Primero necesitas <a href="/registro-asistido.html" style="color: #60a5fa;">crear una cuenta</a> o <a href="/login.html" style="color: #60a5fa;">iniciar sesión</a>.', 400);
            break;

        case STATES.WELCOME:
            await botSay('¡Bienvenido/a de vuelta! 💘', 800);
            await botSay('Vamos a poner tu perfil a punto para triunfar.', 600);
            // Check if Gender is missing
            if (!profileData.gender) {
                currentState = STATES.ASK_GENDER;
                await handleState();
                return;
            }
            currentState = STATES.ASK_ALIAS;
            await handleState();
            break;

        case STATES.ASK_GENDER:
            await botSay('Necesito confirmar un dato importante que falta... 🤔', 500);
            await botSay('¿Cuál es tu <strong>género</strong>?', 500);
            showQuickReplies([
                { icon: '👨', label: 'Hombre', value: 'masculino' },
                { icon: '👩', label: 'Mujer', value: 'femenino' }
            ]);
            break;

        case STATES.ASK_ALIAS:
            if (profileData.alias) { // Skip if already compatible
                currentState = STATES.ASK_PHOTO;
                await handleState();
                return;
            }
            await botSay('¿Cómo quieres que te llamen? (Alias) 📛', 500);
            showTextInput('Tu nombre o apodo...');
            break;

        case STATES.ASK_PHOTO:
            if (profileData.photoURL) { // Skip if already has photo
                currentState = STATES.ASK_BIO;
                await handleState();
                return;
            }
            await botSay(`¡Genial, <strong>${profileData.alias}</strong>! 🎉`, 500);
            await botSay('Sube tu mejor <strong>foto de perfil</strong>. 📸', 600);
            showUploadButton();
            fileInput.multiple = false;
            break;

        case STATES.ASK_BIO:
            await botSay('¡Guapísimo/a! 😍', 500);
            await botSay('Cuéntanos sobre ti. ¿Qué te gusta? ¿Hobbies? ✍️', 600);
            await botSay('Mínimo 50 caracteres para ser interesante.', 400);
            showTextInput('Escribe tu bio...');
            break;

        case STATES.ASK_RELATIONSHIP:
            await botSay('¡Suena interesante! 👏', 500);
            await botSay('¿Cuál es tu <strong>Estado Sentimental</strong> actual? ❤️', 500);
            showQuickReplies([
                { icon: '🔓', label: 'Libre como un Pájaro', value: 'libre_pajaro' },
                { icon: '💔', label: 'Divorciado/Separado', value: 'felizmente_separado' },
                { icon: '💍', label: 'Casado y Golfo', value: 'casado_golfo' },
                { icon: '🕊️', label: 'Viudo', value: 'viudo' },
                { icon: '🤐', label: 'Prefiero no decirlo', value: 'no_contestar' }
            ]);
            break;

        case STATES.ASK_GALLERY:
            const count = profileData.gallery.length;
            if (count === 0) {
                await botSay('Ahora vamos con tu <strong>Galería</strong>. 🖼️', 500);
                await botSay('Sube al menos <strong>2 fotos</strong> más.', 500);
                showUploadButton();
                fileInput.multiple = false; // Single upload per turn
            } else if (count < 2) {
                await botSay(`Llevas ${count} foto(s). ¡Necesitamos ${2 - count} más! 📸`, 500);
                showUploadButton();
                fileInput.multiple = false;
            } else {
                await botSay(`¡Tienes ${count} fotos! ¿Quieres subir otra o continuar?`, 500);
                showQuickReplies([
                    { icon: '➕', label: 'Subir otra', value: 'upload_more' },
                    { icon: '➡️', label: 'Continuar', value: 'next_step' }
                ]);
            }
            break;

        case STATES.ASK_CITY:
            await botSay('¡Tu galería se ve espectacular! 🌟', 500);
            await botSay('¿En qué <strong>ciudad</strong> estás? 🏙️', 500);
            // Quick reply for GPS
            showTextInput('Escribe tu ciudad...');
            // Inject GPS button manually into chat flow or quick replies?
            // Let's use Quick Replies for "Usar GPS" or user types text
            const gpsOption = { icon: '📍', label: 'Usar GPS', value: 'use_gps' };
            showQuickReplies([gpsOption]);
            // Note: showQuickReplies hides text input. We want BOTH.
            // Custom hybrid: Show input, but append a GPS button bubble.
            // Re-enabling text input after showing quick replies is tricky.
            // Let's use a dedicated GPS button in the interface or just quick reply.
            // If user clicks Quick Reply GPS, we handle it.
            // But we can't show input AND quick replies easily with current helper.
            // Let's modify showTextInput to allow appending a helper button?
            // Simplification: Ask "Escribir o GPS" first.
            break;

        case STATES.ASK_LOOKING_FOR:
            await botSay('¿Qué estás <strong>buscando</strong> aquí? 💕', 500);
            showQuickReplies([
                { icon: '💑', label: 'Relación seria', value: 'relacion_seria' },
                { icon: '😈', label: 'Casual / Esporádica', value: 'relacion_casual' },
                { icon: '👋', label: 'Amistad', value: 'amistad' },
                { icon: '🥂', label: 'Conocer gente', value: 'conocer_gente' },
                { icon: '🔥', label: 'Sin compromiso', value: 'sin_compromiso' },
                { icon: '🤷', label: 'Abierto a todo', value: 'abierto' }
            ]);
            break;

        case STATES.ASK_THEME:
            await botSay('¡Casi terminamos! 🎨', 500);
            await botSay('Elige un <strong>Color de Tema</strong> para tu perfil:', 500);
            showQuickReplies([
                { icon: '💙', label: 'Azul Original', value: 'blue' },
                { icon: '☀️', label: 'Claro', value: 'light' },
                { icon: '🌙', label: 'Oscuro', value: 'dark' }
            ]);
            break;

        case STATES.ASK_AVAILABILITY:
            // Check gender logic
            try {
                // Should fetch gender from auth token or profileData if set?
                // profileData doesn't store gender (it was in registration).
                // We must query currentUser doc to know gender if not in memory.
                const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
                const gender = userDoc.data()?.gender;

                if (gender === 'femenino' || gender === 'mujer') {
                    await botSay('Una pregunta especial para ti 💁‍♀️', 500);
                    await botSay('¿Cúal es tu <strong>Estado de Disponibilidad</strong>?', 500);
                    showQuickReplies([
                        { icon: '🟢', label: 'Disponible', value: 'available' },
                        { icon: '🟡', label: 'Con Cita Planeada', value: 'planned' },
                        { icon: '🔴', label: 'No Acepto Citas', value: 'unavailable' }
                    ]);
                } else {
                    // Masculino -> Skip
                    currentState = STATES.SAVING;
                    await handleState();
                }
            } catch (e) {
                console.error(e);
                currentState = STATES.SAVING;
                await handleState();
            }
            break;

        case STATES.SAVING:
            hideQuickReplies();
            await botSay('Guardando tu perfil... ⏳', 300);
            await saveProfile();
            break;

        case STATES.SUCCESS:
            await botSay('🎉 <strong>¡Tu perfil está COMPLETO!</strong>', 500);
            await botSay('Ahora sí, ¡a triunfar! 💘🏹', 600);

            setTimeout(() => {
                const div = document.createElement('div');
                div.className = 'quick-replies';
                div.innerHTML = '<a href="/perfil.html" class="quick-reply" style="text-decoration: none;">👤 Ver Mi Perfil</a> <a href="/buscar-usuarios.html" class="quick-reply" style="text-decoration: none;">🔍 Buscar Usuarios</a>';
                messagesContainer.appendChild(div);
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }, 800);
            break;
    }
}


// Handle text input
async function handleInput(value) {
    value = value.trim();
    if (!value) return;

    // Special: If in ASK_CITY and user types, assume city
    if (currentState === STATES.ASK_CITY) {
        // Clear GPS button if it was there
        hideQuickReplies();
    }

    addMessage(value, 'user');
    inputEl.value = '';

    switch (currentState) {
        case STATES.ASK_ALIAS:
            if (value.length < 2) {
                await botSay('El nombre es muy corto. Mínimo 2 letras. 😅', 400);
                return;
            }
            profileData.alias = value;
            currentState = STATES.ASK_PHOTO;
            break;

        case STATES.ASK_BIO:
            if (value.length < 50) {
                await botSay(`Tienes ${value.length} caracteres. Mínimo 50 porfa. ¡Inspírate! 📝`, 400);
                return;
            }
            profileData.bio = value;
            currentState = STATES.ASK_RELATIONSHIP;
            break;

        case STATES.ASK_CITY:
            if (value.length < 2) {
                await botSay('Ingresa una ciudad válida. 🏙️', 400);
                return;
            }
            profileData.city = value;
            currentState = STATES.ASK_LOOKING_FOR;
            break;
    }

    await handleState();
}

// Handle file upload
async function handleFileUpload(files) {
    if (!files || files.length === 0) return;

    if (currentState === STATES.ASK_PHOTO) {
        try {
            await botSay('Subiendo foto... 📤', 300);
            const url = await uploadImage(files[0], `users/${currentUser.uid}/profile.jpg`);
            profileData.photoURL = url;
            addImageMessage(url);
            currentState = STATES.ASK_BIO;
            await handleState();
        } catch (error) {
            await botSay('Error al subir. Intenta de nuevo. 😓', 400);
        }
        return;
    }

    if (currentState === STATES.ASK_GALLERY) {
        try {
            const index = profileData.gallery.length;
            await botSay(`Subiendo foto ${index + 1}... 📤`, 300);

            const url = await uploadImage(files[0], `users/${currentUser.uid}/gallery_${index}.jpg`);

            // Add to data
            profileData.gallery.push(url);

            // Show preview
            addImageMessage(url);

            // Loop back to same state to check count
            currentState = STATES.ASK_GALLERY;
            await handleState();

        } catch (error) {
            await botSay('Error al subir. ¿Probamos otra vez?', 400);
        }
    }
}

// Handle quick reply buttons
async function handleQuickReply(value) {
    // Special: GPS
    if (value === 'use_gps') {
        hideQuickReplies();
        await getUserLocation();
        return;
    }

    // Special: Gallery Flow
    if (value === 'upload_more') {
        hideQuickReplies();
        showUploadButton();
        fileInput.click();
        return;
    }
    if (value === 'next_step') {
        currentState = STATES.ASK_CITY;
        hideQuickReplies();
        await handleState();
        return;
    }
    if (value === 'retry') {
        saveProfile();
        return;
    }

    // Standard selections
    const labels = {
        'libre_pajaro': '🔓 Libre',
        'felizmente_separado': '💔 Separado',
        'casado_golfo': '💍 Casado y Golfo',
        'viudo': '🕊️ Viudo',
        'no_contestar': '🤐 Secreto',
        'relacion_seria': '💑 Serio',
        'relacion_casual': '😈 Casual',
        'amistad': '👋 Amistad',
        'conocer_gente': '🥂 Socializar',
        'sin_compromiso': '🔥 Sin filtro',
        'abierto': '🤷 Abierto',
        'blue': '💙 Azul',
        'light': '☀️ Claro',
        'dark': '🌙 Oscuro',
        'available': '🟢 Disponible',
        'planned': '🟡 Ocupada',
        'unavailable': '🔴 No disponible'
    };

    hideQuickReplies();
    addMessage(labels[value] || value, 'user');

    if (currentState === STATES.ASK_GENDER) {
        profileData.gender = value;
        currentState = STATES.ASK_ALIAS;
    } else if (currentState === STATES.ASK_RELATIONSHIP) {
        profileData.relationshipStatus = value;
        currentState = STATES.ASK_GALLERY;
    } else if (currentState === STATES.ASK_LOOKING_FOR) {
        profileData.lookingFor = value;
        currentState = STATES.ASK_THEME;
    } else if (currentState === STATES.ASK_THEME) {
        profileData.theme = value;
        // Live apply theme?
        applyTheme(value);
        currentState = STATES.ASK_AVAILABILITY;
    } else if (currentState === STATES.ASK_AVAILABILITY) {
        profileData.availabilityStatus = value;
        currentState = STATES.SAVING;
    }

    await handleState();
}

// Save profile to Firestore
async function saveProfile() {
    try {
        const userRef = doc(db, 'users', currentUser.uid);

        const dataToSave = {
            userRole: 'regular',
            alias: profileData.alias,
            photoURL: profileData.photoURL,
            bio: profileData.bio,
            gallery: profileData.gallery,
            city: profileData.city,
            relationshipStatus: profileData.relationshipStatus,
            lookingFor: profileData.lookingFor,
            theme: profileData.theme, // Save Theme preference
            profileComplete: true,
            updatedAt: serverTimestamp()
        };

        // Saving gender if it was collected (recovery flow)
        if (profileData.gender) {
            dataToSave.gender = profileData.gender;
        }

        // Add availability only if set
        if (profileData.availabilityStatus) {
            dataToSave.availabilityStatus = profileData.availabilityStatus;
        }

        await setDoc(userRef, dataToSave, { merge: true });

        currentState = STATES.SUCCESS;
        await handleState();
    } catch (error) {
        console.error('Error saving profile:', error);
        await botSay('Error al guardar. Intenta de nuevo. 😓', 400);
        showQuickReplies([
            { icon: '🔄', label: 'Reintentar', value: 'retry' }
        ]);
    }
}

// Event listeners
sendBtn.onclick = () => handleInput(inputEl.value);
inputEl.onkeypress = (e) => {
    if (e.key === 'Enter') handleInput(inputEl.value);
};

uploadBtn.onclick = () => fileInput.click();
fileInput.onchange = (e) => handleFileUpload(e.target.files);

// Expose for quick replies
window.handleQuickReply = handleQuickReply;

// Initialize
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        db = await getDb();

        // Check if profile already has some data
        try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
                const data = userDoc.data();
                if (data.alias) profileData.alias = data.alias;
                if (data.photoURL) profileData.photoURL = data.photoURL;
                if (data.gallery) profileData.gallery = data.gallery;
                if (data.gender) profileData.gender = data.gender; // Load gender if exists
            }
        } catch (e) {
            console.warn('Could not load existing profile data', e);
        }

        currentState = STATES.WELCOME;
        document.getElementById('chatMessages').innerHTML = '';
        await handleState();
    } else {
        currentState = STATES.NOT_LOGGED_IN;
        await handleState();
    }
});
