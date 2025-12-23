// Onboarding Wizard for Profile Completion
// Guides new users through completing their profile step by step

let currentStep = 1;
const totalSteps = 4;

const wizardSteps = [
    {
        title: '¡Bienvenido a TuCitaSegura! 👋',
        subtitle: 'Vamos a completar tu perfil en 4 pasos simples',
        content: `
      <div class="text-center">
        <div class="w-24 h-24 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <i class="fas fa-user-plus text-5xl text-white"></i>
        </div>
        <h3 class="text-2xl font-bold mb-4">¡Empecemos!</h3>
        <p class="text-slate-300 mb-6">
          Completar tu perfil te ayudará a encontrar mejores matches y aumentar tus posibilidades de éxito.
        </p>
        <div class="glass rounded-xl p-4 text-left">
          <p class="text-sm font-semibold mb-2">✨ Lo que haremos:</p>
          <ul class="text-sm text-slate-300 space-y-1">
            <li>✅ Elegir tu alias único</li>
            <li>✅ Subir tu foto de perfil</li>
            <li>✅ Escribir una bio atractiva</li>
            <li>✅ Configurar tu ubicación</li>
          </ul>
        </div>
      </div>
    `,
        validate: () => true
    },
    {
        title: 'Paso 1: Tu Alias',
        subtitle: 'Elige un nombre único que te represente',
        content: `
      <div>
        <label class="block text-sm font-medium mb-2">
          <i class="fas fa-user mr-2"></i>Alias / Nombre de usuario
        </label>
        <input 
          type="text" 
          id="wizardAlias" 
          class="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:border-blue-500 focus:outline-none"
          placeholder="Ej: Maria2024"
          maxlength="20"
        >
        <p class="text-xs text-slate-400 mt-2">
          <i class="fas fa-info-circle mr-1"></i>
          Este será tu nombre visible en la plataforma
        </p>
      </div>
    `,
        validate: () => {
            const alias = document.getElementById('wizardAlias')?.value.trim();
            if (!alias || alias.length < 3) {
                alert('El alias debe tener al menos 3 caracteres');
                return false;
            }
            // Copy to main form
            document.getElementById('alias').value = alias;
            return true;
        }
    },
    {
        title: 'Paso 2: Tu Foto',
        subtitle: 'Sube una foto clara de tu rostro',
        content: `
      <div class="text-center">
        <div class="mb-4">
          <div id="wizardPhotoPreview" class="w-40 h-40 mx-auto rounded-full bg-white/10 border-2 border-dashed border-white/30 flex items-center justify-center cursor-pointer hover:border-blue-500 transition">
            <i class="fas fa-camera text-4xl text-white/50"></i>
          </div>
        </div>
        <input type="file" id="wizardPhotoInput" accept="image/*" class="hidden">
        <button onclick="document.getElementById('wizardPhotoInput').click()" class="bg-blue-500 hover:bg-blue-600 px-6 py-2 rounded-lg font-semibold transition">
          <i class="fas fa-upload mr-2"></i>Seleccionar Foto
        </button>
        <p class="text-xs text-slate-400 mt-4">
          <i class="fas fa-shield-alt mr-1"></i>
          Tu foto será verificada automáticamente
        </p>
      </div>
    `,
        validate: () => {
            const photoInput = document.getElementById('wizardPhotoInput');
            if (!photoInput?.files[0]) {
                alert('Por favor sube una foto de perfil');
                return false;
            }
            // Copy to main form
            const mainPhotoInput = document.getElementById('photoInput');
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(photoInput.files[0]);
            mainPhotoInput.files = dataTransfer.files;

            // Trigger change event to update preview
            const event = new Event('change', { bubbles: true });
            mainPhotoInput.dispatchEvent(event);
            return true;
        }
    },
    {
        title: 'Paso 3: Tu Bio',
        subtitle: 'Cuéntanos sobre ti (mínimo 50 caracteres)',
        content: `
      <div>
        <label class="block text-sm font-medium mb-2">
          <i class="fas fa-pen mr-2"></i>Descripción personal
        </label>
        <textarea 
          id="wizardBio" 
          rows="5"
          class="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:border-blue-500 focus:outline-none resize-none"
          placeholder="Ej: Me encanta viajar, la música y conocer gente nueva. Busco alguien con quien compartir aventuras..."
        ></textarea>
        <div class="flex justify-between text-xs mt-2">
          <span class="text-slate-400">
            <i class="fas fa-lightbulb mr-1"></i>
            Sé auténtico y positivo
          </span>
          <span id="wizardBioCount" class="text-slate-400">0 / 50 mín</span>
        </div>
      </div>
    `,
        validate: () => {
            const bio = document.getElementById('wizardBio')?.value.trim();
            if (!bio || bio.length < 50) {
                alert('La bio debe tener al menos 50 caracteres');
                return false;
            }
            // Copy to main form
            document.getElementById('bio').value = bio;
            return true;
        }
    },
    {
        title: 'Paso 4: Tu Ubicación',
        subtitle: 'Necesitamos saber dónde estás para encontrar matches cercanos',
        content: `
      <div class="text-center">
        <div class="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <i class="fas fa-map-marker-alt text-5xl text-white"></i>
        </div>
        <p class="text-slate-300 mb-6">
          Haz clic en el botón para obtener tu ubicación automáticamente.
        </p>
        <button id="wizardLocationBtn" class="bg-green-500 hover:bg-green-600 px-8 py-3 rounded-lg font-semibold transition">
          <i class="fas fa-location-crosshairs mr-2"></i>Obtener Mi Ubicación
        </button>
        <p id="wizardLocationStatus" class="text-sm text-slate-400 mt-4"></p>
        <div class="glass rounded-xl p-4 mt-6 text-left">
          <p class="text-xs text-slate-400">
            <i class="fas fa-lock mr-1"></i>
            <strong>Privacidad:</strong> Solo guardamos tu municipio/ciudad, nunca tu dirección exacta.
          </p>
        </div>
      </div>
    `,
        validate: () => {
            const city = document.getElementById('city')?.value.trim();
            if (!city) {
                alert('Por favor obtén tu ubicación antes de continuar');
                return false;
            }
            return true;
        }
    }
];

export function initOnboardingWizard() {
    // Check if onboarding parameter is present
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('onboarding') !== 'true') {
        return;
    }

    // Show wizard
    const wizard = document.getElementById('onboardingWizard');
    if (wizard) {
        wizard.classList.remove('hidden');
        renderStep(1);
        setupWizardListeners();
    }
}

function renderStep(step) {
    currentStep = step;
    const stepData = wizardSteps[step - 1];

    // Update progress
    const progress = (step / totalSteps) * 100;
    document.getElementById('wizardStepText').textContent = `Paso ${step} de ${totalSteps}`;
    document.getElementById('wizardProgress').textContent = `${Math.round(progress)}%`;
    document.getElementById('wizardProgressBar').style.width = `${progress}%`;

    // Update content
    const content = document.getElementById('wizardContent');
    content.innerHTML = `
    <div class="text-center mb-6">
      <h2 class="text-2xl font-bold mb-2">${stepData.title}</h2>
      <p class="text-slate-400">${stepData.subtitle}</p>
    </div>
    ${stepData.content}
  `;

    // Update buttons
    const prevBtn = document.getElementById('wizardPrevBtn');
    const nextBtn = document.getElementById('wizardNextBtn');

    if (step === 1) {
        prevBtn.classList.add('hidden');
    } else {
        prevBtn.classList.remove('hidden');
    }

    if (step === totalSteps) {
        nextBtn.innerHTML = '¡Finalizar! <i class="fas fa-check ml-2"></i>';
    } else {
        nextBtn.innerHTML = 'Siguiente <i class="fas fa-arrow-right ml-2"></i>';
    }

    // Setup step-specific listeners
    setupStepListeners(step);
}

function setupStepListeners(step) {
    if (step === 3) {
        // Photo preview
        const photoInput = document.getElementById('wizardPhotoInput');
        const preview = document.getElementById('wizardPhotoPreview');

        photoInput?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    preview.innerHTML = `<img src="${e.target.result}" class="w-full h-full object-cover rounded-full">`;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (step === 4) {
        // Bio counter
        const bioTextarea = document.getElementById('wizardBio');
        const counter = document.getElementById('wizardBioCount');

        bioTextarea?.addEventListener('input', () => {
            const length = bioTextarea.value.length;
            counter.textContent = `${length} / 50 mín`;
            if (length >= 50) {
                counter.classList.remove('text-slate-400');
                counter.classList.add('text-green-400');
            } else {
                counter.classList.remove('text-green-400');
                counter.classList.add('text-slate-400');
            }
        });
    }

    if (step === 5) {
        // Location button
        const locationBtn = document.getElementById('wizardLocationBtn');
        const status = document.getElementById('wizardLocationStatus');

        locationBtn?.addEventListener('click', async () => {
            locationBtn.disabled = true;
            locationBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Obteniendo...';

            // Trigger main location function
            const mainLocationBtn = document.getElementById('getLocationBtn');
            if (mainLocationBtn) {
                mainLocationBtn.click();

                // Wait and check if location was set
                setTimeout(() => {
                    const city = document.getElementById('city')?.value;
                    if (city) {
                        status.innerHTML = '<i class="fas fa-check-circle text-green-400 mr-1"></i>Ubicación obtenida: ' + city;
                        locationBtn.innerHTML = '<i class="fas fa-check mr-2"></i>Ubicación Obtenida';
                        locationBtn.classList.remove('bg-green-500', 'hover:bg-green-600');
                        locationBtn.classList.add('bg-green-600');
                    } else {
                        status.innerHTML = '<i class="fas fa-exclamation-triangle text-orange-400 mr-1"></i>Error al obtener ubicación';
                        locationBtn.disabled = false;
                        locationBtn.innerHTML = '<i class="fas fa-location-crosshairs mr-2"></i>Reintentar';
                    }
                }, 2000);
            }
        });
    }
}

function setupWizardListeners() {
    const prevBtn = document.getElementById('wizardPrevBtn');
    const nextBtn = document.getElementById('wizardNextBtn');

    prevBtn?.addEventListener('click', () => {
        if (currentStep > 1) {
            renderStep(currentStep - 1);
        }
    });

    nextBtn?.addEventListener('click', async () => {
        const stepData = wizardSteps[currentStep - 1];

        // Validate current step
        if (!stepData.validate()) {
            return;
        }

        // Move to next step or finish
        if (currentStep < totalSteps) {
            renderStep(currentStep + 1);
        } else {
            // Finish wizard
            await finishWizard();
        }
    });
}

async function finishWizard() {
    const nextBtn = document.getElementById('wizardNextBtn');
    nextBtn.disabled = true;
    nextBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Guardando...';

    // Trigger save profile
    const saveBtn = document.getElementById('saveButton');
    if (saveBtn) {
        // Close wizard
        document.getElementById('onboardingWizard').classList.add('hidden');

        // Save profile
        saveBtn.click();

        // Remove onboarding parameter from URL
        const url = new URL(window.location);
        url.searchParams.delete('onboarding');
        window.history.replaceState({}, '', url);
    }
}
