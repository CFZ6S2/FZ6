/**
 * Simple i18n (Internationalization) Engine
 * Handles language state, translation loading, and text replacement.
 */

class I18n {
    constructor() {
        this.availableLanguages = [
            { code: 'es', name: 'Español', flag: '🇪🇸', current: true },
            { code: 'en', name: 'English', flag: '🇬🇧', current: false },
            { code: 'fr', name: 'Français', flag: '🇫🇷', current: false },
            { code: 'de', name: 'Deutsch', flag: '🇩🇪', current: false },
            { code: 'pt', name: 'Português', flag: '🇧🇷', current: false }
        ];
        this.currentLang = 'es';
        this.translations = {};
        this.isInitialized = false;

        // Basic translations for immediate use (expanded later via JSON fetch if needed)
        this.dictionary = {
            'es': {
                // Common
                'common.save': 'Guardar',
                'common.cancel': 'Cancelar',
                'common.loading': 'Cargando...',
                'common.error': 'Error',
                'common.success': 'Éxito',

                // Navigation
                'nav.login': 'Iniciar Sesión',
                'nav.register': 'Registrarse',
                'nav.dashboard': 'Panel',
                'nav.chat': 'Chat',
                'nav.profile': 'Perfil',
                'nav.logout': 'Cerrar Sesión',

                // Auth
                'auth.login.title': 'Iniciar Sesión',
                'auth.email': 'Email',
                'auth.password': 'Contraseña',
                'auth.login.submit': 'Entrar',
                'auth.register.title': 'Crear Cuenta',
                'auth.register.submit': 'Registrarse',
                'auth.forgot_password': '¿Olvidaste tu contraseña?',
                'auth.no_account': '¿No tienes cuenta?',
                'auth.has_account': '¿Ya tienes cuenta?',

                // Contact
                'contact.title': 'Contacto',
                'contact.name': 'Nombre',
                'contact.email': 'Email',
                'contact.message': 'Mensaje',
                'contact.send': 'Enviar',
                'contact.sending': 'Enviando...',
                'contact.success': '¡Gracias! Hemos recibido tu mensaje.',
                'contact.error': 'Hubo un error al enviar el mensaje.',

                // Chat
                'chat.placeholder': 'Escribe un mensaje...',
                'chat.send': 'Enviar',
                'chat.video_call': 'Iniciar video llamada',
                'chat.proposal': 'Proponer cita',
                'chat.options': 'Opciones',
                'chat.typing': 'escribiendo...',

                // Dashboard
                'dash.welcome': '¡Hola',
                'dash.balance': 'Saldo',
                'dash.dates': 'Citas',
                'dash.favorites': 'Favoritos',
                'dash.search': 'Buscar Pareja',
                'dash.messages': 'Mis Mensajes',
                'dash.my_dates': 'Mis Citas',
                'dash.nav.wallet': 'Monedero & Pagos',

                // Profile
                'profile.title': 'Mi Perfil',
                'profile.edit': 'Editar Perfil',
                'profile.photos': 'Mis Fotos',
                'profile.bio': 'Sobre mí',
                'profile.logout': 'Cerrar sesión',

                // Landing Page
                'landing.hero.verified': '100% Usuarios Verificados',
                'landing.hero.title_start': 'Conexiones Reales,',
                'landing.hero.title_end': 'Sin Riesgos',
                'landing.hero.subtitle': 'La plataforma de citas más exclusiva donde la seguridad es lo primero. Conoce gente auténtica mediante videochat y verificación de identidad avanzada.',
                'landing.hero.cta_start': 'Comenzar Gratis',
                'landing.hero.cta_login': 'Ya tengo cuenta',

                'landing.stats.users': 'Usuarios Activos',
                'landing.stats.matches': 'Coincidencias',
                'landing.stats.events': 'Eventos',

                'landing.how.title': 'Cómo funciona',
                'landing.how.step1': '1. Regístrate y verifica tu identidad',
                'landing.how.step2': '2. Completa tu perfil',
                'landing.how.step3': '3. Busca coincidencias seguras',
                'landing.how.step4': '4. Conecta vía videochat',

                'landing.testimonials.title': 'Testimonios',
                'landing.testimonials.1': '“¡Una experiencia increíble!” – Ana',
                'landing.testimonials.2': '“Me sentí seguro y respetado.” – Luis',
                'landing.testimonials.3': '“¡Encontré a mi pareja ideal!” – Carla',

                'landing.comparison.title': 'Comparativa',
                'landing.comparison.features': 'Características',
                'landing.comparison.verification': 'Verificación',
                'landing.comparison.videochat': 'Videochat',
                'landing.comparison.support': 'Soporte 24/7',
                'landing.comparison.others': 'Otros',

                'landing.features.title': '¿Por qué elegirnos?',
                'landing.features.subtitle': 'Diseñado para personas que valoran su tiempo y seguridad por encima de matches infinitos.',
                'landing.features.1.title': 'Verificación Rigurosa',
                'landing.features.1.desc': 'Cada perfil es validado manualmente y por IA. Adiós a los perfiles falsos y las sorpresas desagradables.',
                'landing.features.2.title': 'Video First',
                'landing.features.2.desc': 'Conoce a tu cita por videollamada segura antes de compartir tu número o quedar en persona.',
                'landing.features.3.title': 'Experiencia VIP',
                'landing.features.3.desc': 'Accede al modo Concierge para que organicemos tus citas o asiste a nuestros eventos exclusivos.',

                'landing.cta.title': '¿Listo para conocer gente real?',
                'landing.cta.subtitle': 'Únete hoy a la comunidad más selecta. Tu primera cita segura está a solo unos clics.',
                'landing.cta.button': 'Crear Cuenta Ahora',

                'landing.footer.desc': 'Redefiniendo las citas online con seguridad, transparencia y exclusividad.',
                'landing.footer.platform': 'Plataforma',
                'landing.footer.vip': 'Eventos VIP',
                'landing.footer.help': 'Ayuda',
                'landing.footer.center': 'Centro de Ayuda',
                'landing.footer.safety': 'Consejos de Seguridad',
                'landing.footer.rights': '2024 TuCitaSegura. Todos los derechos reservados.',
                'landing.footer.privacy': 'Privacidad',
                'landing.footer.terms': 'Términos'
            },
            'en': {
                // Common
                'common.save': 'Save',
                'common.cancel': 'Cancel',
                'common.loading': 'Loading...',
                'common.error': 'Error',
                'common.success': 'Success',

                // Navigation
                'nav.login': 'Login',
                'nav.register': 'Register',
                'nav.dashboard': 'Dashboard',
                'nav.chat': 'Chat',
                'nav.profile': 'Profile',
                'nav.logout': 'Logout',

                // Auth
                'auth.login.title': 'Login',
                'auth.email': 'Email',
                'auth.password': 'Password',
                'auth.login.submit': 'Sign In',
                'auth.register.title': 'Create Account',
                'auth.register.submit': 'Sign Up',
                'auth.forgot_password': 'Forgot password?',
                'auth.no_account': 'Don\'t have an account?',
                'auth.has_account': 'Already have an account?',

                // Contact
                'contact.title': 'Contact',
                'contact.name': 'Name',
                'contact.email': 'Email',
                'contact.message': 'Message',
                'contact.send': 'Send',
                'contact.sending': 'Sending...',
                'contact.success': 'Thanks! We received your message.',
                'contact.error': 'There was an error sending the message.',

                // Chat
                'chat.placeholder': 'Type a message...',
                'chat.send': 'Send',
                'chat.video_call': 'Start video call',
                'chat.proposal': 'Propose Date',
                'chat.options': 'Options',
                'chat.typing': 'typing...',

                // Dashboard
                'dash.welcome': 'Hello',
                'dash.balance': 'Balance',
                'dash.dates': 'Dates',
                'dash.favorites': 'Favorites',
                'dash.search': 'Find Partner',
                'dash.messages': 'My Messages',
                'dash.my_dates': 'My Dates',
                'dash.nav.wallet': 'Wallet & Payments',

                // Profile
                'profile.title': 'My Profile',
                'profile.edit': 'Edit Profile',
                'profile.photos': 'My Photos',
                'profile.bio': 'About me',
                'profile.logout': 'Logout',

                // Landing Page
                'landing.hero.verified': '100% Verified Users',
                'landing.hero.title_start': 'Real Connections,',
                'landing.hero.title_end': 'No Risks',
                'landing.hero.subtitle': 'The most exclusive dating platform where safety comes first. Meet authentic people via video chat and advanced identity verification.',
                'landing.hero.cta_start': 'Start for Free',
                'landing.hero.cta_login': 'I have an account',

                'landing.stats.users': 'Active Users',
                'landing.stats.matches': 'Matches',
                'landing.stats.events': 'Events',

                'landing.how.title': 'How it works',
                'landing.how.step1': '1. Register and verify identity',
                'landing.how.step2': '2. Complete your profile',
                'landing.how.step3': '3. Find safe matches',
                'landing.how.step4': '4. Connect via video chat',

                'landing.testimonials.title': 'Testimonials',
                'landing.testimonials.1': '“An incredible experience!” – Ana',
                'landing.testimonials.2': '“I felt safe and respected.” – Luis',
                'landing.testimonials.3': '“Found my perfect match!” – Carla',

                'landing.comparison.title': 'Comparison',
                'landing.comparison.features': 'Features',
                'landing.comparison.verification': 'Verification',
                'landing.comparison.videochat': 'Video Chat',
                'landing.comparison.support': '24/7 Support',
                'landing.comparison.others': 'Others',

                'landing.features.title': 'Why choose us?',
                'landing.features.subtitle': 'Designed for people who value time and safety over endless matches.',
                'landing.features.1.title': 'Rigorous Verification',
                'landing.features.1.desc': 'Every profile is manually and AI validated. Goodbye fake profiles and unpleasant surprises.',
                'landing.features.2.title': 'Video First',
                'landing.features.2.desc': 'Meet your date via secure video call before sharing your number or meeting in person.',
                'landing.features.3.title': 'VIP Experience',
                'landing.features.3.desc': 'Access Concierge mode to have us organize your dates or attend our exclusive events.',

                'landing.cta.title': 'Ready to meet real people?',
                'landing.cta.subtitle': 'Join the most select community today. Your first safe date is just a few clicks away.',
                'landing.cta.button': 'Create Account Now',

                'landing.footer.desc': 'Redefining online dating with safety, transparency, and exclusivity.',
                'landing.footer.platform': 'Platform',
                'landing.footer.vip': 'VIP Events',
                'landing.footer.help': 'Help',
                'landing.footer.center': 'Help Center',
                'landing.footer.safety': 'Safety Tips',
                'landing.footer.rights': '2024 TuCitaSegura. All rights reserved.',
                'landing.footer.privacy': 'Privacy',
                'landing.footer.terms': 'Terms'
            },
            'fr': {
                'common.save': 'Enregistrer',
                'common.cancel': 'Annuler',
                'common.loading': 'Chargement...',

                'nav.login': 'Connexion',
                'nav.register': 'Inscription',

                'auth.login.title': 'Connexion',
                'auth.email': 'Email',
                'auth.password': 'Mot de passe',
                'auth.login.submit': 'Se connecter',

                'contact.title': 'Contact',
                'contact.name': 'Nom',
                'contact.email': 'Email',
                'contact.message': 'Message',
                'contact.send': 'Envoyer',
                'contact.sending': 'Envoi...',
                'contact.success': 'Merci! Nous avons reçu votre message.',
                'contact.error': 'Erreur lors de l\'envoi du message.',

                // Chat
                'chat.placeholder': 'Écrivez un message...',
                'chat.send': 'Envoyer',
                'chat.video_call': 'Démarrer appel vidéo',
                'chat.proposal': 'Proposer rendez-vous',
                'chat.options': 'Options',
                'chat.typing': 'écrit...',

                // Dashboard
                'dash.welcome': 'Bienvenue',
                'dash.balance': 'Solde',
                'dash.dates': 'Rendez-vous',
                'dash.favorites': 'Favoris',
                'dash.search': 'Chercher Partenaire',
                'dash.messages': 'Mes Messages',
                'dash.my_dates': 'Mes Rendez-vous',
                'dash.nav.wallet': 'Portefeuille & Paiements',

                // Profile
                'profile.title': 'Mon Profil',
                'profile.edit': 'Modifier le profil',
                'profile.photos': 'Mes Photos',
                'profile.bio': 'À propos de moi',
                'profile.logout': 'Se déconnecter',

                // Landing Page
                'landing.hero.verified': '100% Utilisateurs Vérifiés',
                'landing.hero.title_start': 'Vraies Connexions,',
                'landing.hero.title_end': 'Sans Risques',
                'landing.hero.subtitle': 'La plateforme de rencontres la plus exclusive où la sécurité passe avant tout. Rencontrez des gens authentiques via chat vidéo et vérification d\'identité avancée.',
                'landing.hero.cta_start': 'Commencer Gratuitement',
                'landing.hero.cta_login': 'J\'ai un compte',

                'landing.stats.users': 'Utilisateurs Actifs',
                'landing.stats.matches': 'Matchs',
                'landing.stats.events': 'Événements',

                'landing.how.title': 'Comment ça marche',
                'landing.how.step1': '1. Inscrivez-vous et vérifiez votre identité',
                'landing.how.step2': '2. Complétez votre profil',
                'landing.how.step3': '3. Trouvez des matchs sûrs',
                'landing.how.step4': '4. Connectez-vous via chat vidéo',

                'landing.testimonials.title': 'Témoignages',
                'landing.testimonials.1': '“Une expérience incroyable!” – Ana',
                'landing.testimonials.2': '“Je me suis senti en sécurité et respecté.” – Luis',
                'landing.testimonials.3': '“J\'ai trouvé mon partenaire idéal!” – Carla',

                'landing.comparison.title': 'Comparaison',
                'landing.comparison.features': 'Caractéristiques',
                'landing.comparison.verification': 'Vérification',
                'landing.comparison.videochat': 'Chat Vidéo',
                'landing.comparison.support': 'Support 24/7',
                'landing.comparison.others': 'Autres',

                'landing.features.title': 'Pourquoi nous choisir?',
                'landing.features.subtitle': 'Conçu pour les personnes qui apprécient leur temps et leur sécurité plus que les matchs infinis.',
                'landing.features.1.title': 'Vérification Rigoureuse',
                'landing.features.1.desc': 'Chaque profil est validé manuellement et par IA. Adieu faux profils et mauvaises surprises.',
                'landing.features.2.title': 'Vidéo d\'abord',
                'landing.features.2.desc': 'Rencontrez votre rendez-vous par appel vidéo sécurisé avant de partager votre numéro ou de vous rencontrer en personne.',
                'landing.features.3.title': 'Expérience VIP',
                'landing.features.3.desc': 'Accédez au mode Concierge pour que nous organisions vos rendez-vous ou assistez à nos événements exclusifs.',

                'landing.cta.title': 'Prêt à rencontrer de vraies personnes?',
                'landing.cta.subtitle': 'Rejoignez la communauté la plus sélecte aujourd\'hui. Votre premier rendez-vous sûr est à quelques clics.',
                'landing.cta.button': 'Créer un Compte Maintenant',

                'landing.footer.desc': 'Redéfinir les rencontres en ligne avec sécurité, transparence et exclusivité.',
                'landing.footer.platform': 'Plateforme',
                'landing.footer.vip': 'Événements VIP',
                'landing.footer.help': 'Aide',
                'landing.footer.center': 'Centre d\'aide',
                'landing.footer.safety': 'Conseils de sécurité',
                'landing.footer.rights': '2024 TuCitaSegura. Tous droits réservés.',
                'landing.footer.privacy': 'Confidentialité',
                'landing.footer.terms': 'Termes'
            },
            'de': {
                'common.save': 'Speichern',
                'common.cancel': 'Abbrechen',

                'nav.login': 'Anmelden',
                'nav.register': 'Registrieren',

                'auth.login.title': 'Anmelden',
                'auth.email': 'E-Mail',
                'auth.password': 'Passwort',
                'auth.login.submit': 'Anmelden',

                'contact.title': 'Kontakt',
                'contact.name': 'Name',
                'contact.email': 'E-Mail',
                'contact.message': 'Nachricht',
                'contact.send': 'Senden',
                'contact.sending': 'Senden...',
                'contact.success': 'Danke! Wir haben Ihre Nachricht erhalten.',
                'contact.error': 'Fehler beim Senden der Nachricht.',

                // Chat
                'chat.placeholder': 'Nachricht schreiben...',
                'chat.send': 'Senden',
                'chat.video_call': 'Videoanruf starten',
                'chat.proposal': 'Date vorschlagen',
                'chat.options': 'Optionen',
                'chat.typing': 'schreibt...',

                // Dashboard
                'dash.welcome': 'Willkommen',
                'dash.active_users': 'Aktive Benutzer',
                'dash.matches': 'Übereinstimmungen',
                'dash.events': 'Kommende Veranstaltungen',
                'dash.balance': 'Guthaben',
                'dash.dates': 'Dates',
                'dash.favorites': 'Favoriten',
                'dash.nav.wallet': 'Brieftasche & Zahlungen',
                'dash.search': 'Partner suchen',
                'dash.messages': 'Meine Nachrichten',
                'dash.my_dates': 'Meine Dates',

                // Profile
                'profile.title': 'Mein Profil',
                'profile.edit': 'Profil bearbeiten',
                'profile.photos': 'Meine Fotos',
                'profile.bio': 'Über mich',
                'profile.logout': 'Abmelden',

                // Landing Page
                'landing.hero.verified': '100% Verifizierte Benutzer',
                'landing.hero.title_start': 'Echte Verbindungen,',
                'landing.hero.title_end': 'Keine Risiken',
                'landing.hero.subtitle': 'Die exklusivste Dating-Plattform, bei der Sicherheit an erster Stelle steht. Treffen Sie authentische Menschen per Video-Chat und erweiterter Identitätsprüfung.',
                'landing.hero.cta_start': 'Kostenlos Starten',
                'landing.hero.cta_login': 'Ich habe ein Konto',

                'landing.stats.users': 'Aktive Benutzer',
                'landing.stats.matches': 'Matches',
                'landing.stats.events': 'Events',

                'landing.how.title': 'Wie es funktioniert',
                'landing.how.step1': '1. Registrieren und Identität überprüfen',
                'landing.how.step2': '2. Profil vervollständigen',
                'landing.how.step3': '3. Sichere Matches finden',
                'landing.how.step4': '4. Über Video-Chat verbinden',

                'landing.testimonials.title': 'Erfahrungsberichte',
                'landing.testimonials.1': '“Eine unglaubliche Erfahrung!” – Ana',
                'landing.testimonials.2': '“Ich fühlte mich sicher und respektiert.” – Luis',
                'landing.testimonials.3': '“Habe meinen idealen Partner gefunden!” – Carla',

                'landing.comparison.title': 'Vergleich',
                'landing.comparison.features': 'Funktionen',
                'landing.comparison.verification': 'Verifizierung',
                'landing.comparison.videochat': 'Video-Chat',
                'landing.comparison.support': '24/7 Support',
                'landing.comparison.others': 'Andere',

                'landing.features.title': 'Warum uns wählen?',
                'landing.features.subtitle': 'Entwickelt für Menschen, die ihre Zeit und Sicherheit mehr schätzen als endlose Matches.',
                'landing.features.1.title': 'Strenge Überprüfung',
                'landing.features.1.desc': 'Jedes Profil wird manuell und durch KI validiert. Tschüss gefälschte Profile und unangenehme Überraschungen.',
                'landing.features.2.title': 'Video Zuerst',
                'landing.features.2.desc': 'Treffen Sie Ihr Date per sicherem Videoanruf, bevor Sie Ihre Nummer teilen oder sich persönlich treffen.',
                'landing.features.3.title': 'VIP-Erlebnis',
                'landing.features.3.desc': 'Nutzen Sie den Concierge-Modus, damit wir Ihre Dates organisieren, oder besuchen Sie unsere exklusiven Events.',

                'landing.cta.title': 'Bereit, echte Menschen zu treffen?',
                'landing.cta.subtitle': 'Treten Sie heute der auserwähltesten Community bei. Ihr erstes sicheres Date ist nur wenige Klicks entfernt.',
                'landing.cta.button': 'Jetzt Konto Erstellen',

                'landing.footer.desc': 'Neudefinition von Online-Dating mit Sicherheit, Transparenz und Exklusivität.',
                'landing.footer.platform': 'Plattform',
                'landing.footer.vip': 'VIP-Events',
                'landing.footer.help': 'Hilfe',
                'landing.footer.center': 'Hilfe-Center',
                'landing.footer.safety': 'Sicherheitstipps',
                'landing.footer.rights': '2024 TuCitaSegura. Alle Rechte vorbehalten.',
                'landing.footer.privacy': 'Datenschutz',
                'landing.footer.terms': 'AGB'
            },
            'pt': {
                'common.save': 'Salvar',
                'common.cancel': 'Cancelar',
                'common.loading': 'Carregando...',
                'common.error': 'Erro',
                'common.success': 'Sucesso',

                'nav.login': 'Entrar',
                'nav.register': 'Cadastre-se',
                'nav.dashboard': 'Painel',
                'nav.chat': 'Chat',
                'nav.profile': 'Perfil',
                'nav.logout': 'Sair',

                'auth.login.title': 'Entrar',
                'auth.email': 'Email',
                'auth.password': 'Senha',
                'auth.login.submit': 'Entrar',
                'auth.register.title': 'Criar Conta',
                'auth.register.submit': 'Cadastre-se',
                'auth.forgot_password': 'Esqueceu sua senha?',
                'auth.no_account': 'Não tem uma conta?',
                'auth.has_account': 'Já tem uma conta?',

                'contact.title': 'Contato',
                'contact.name': 'Nome',
                'contact.email': 'Email',
                'contact.message': 'Mensagem',
                'contact.send': 'Enviar',
                'contact.sending': 'Enviando...',
                'contact.success': 'Obrigado! Recebemos sua mensagem.',
                'contact.error': 'Houve um erro ao enviar a mensagem.',

                // Chat
                'chat.placeholder': 'Escreva uma mensagem...',
                'chat.send': 'Enviar',
                'chat.video_call': 'Iniciar chamada de vídeo',
                'chat.proposal': 'Propor encontro',
                'chat.options': 'Opções',
                'chat.typing': 'digitando...',

                // Dashboard
                'dash.welcome': 'Bem-vindo',
                'dash.active_users': 'Usuários Ativos',
                'dash.matches': 'Combinações',
                'dash.events': 'Próximos Eventos',
                'dash.balance': 'Saldo',
                'dash.dates': 'Encontros',
                'dash.favorites': 'Favoritos',
                'dash.search': 'Buscar Parceiro',
                'dash.messages': 'Minhas Mensagens',
                'dash.my_dates': 'Meus Encontros',
                'dash.nav.wallet': 'Carteira e Pagamentos',

                // Profile
                'profile.title': 'Meu Perfil',
                'profile.edit': 'Editar Perfil',
                'profile.photos': 'Minhas Fotos',
                'profile.bio': 'Sobre mim',
                'profile.logout': 'Sair',

                // Landing Page
                'landing.hero.verified': '100% Usuários Verificados',
                'landing.hero.title_start': 'Conexões Reais,',
                'landing.hero.title_end': 'Sem Riscos',
                'landing.hero.subtitle': 'A plataforma de namoro mais exclusiva onde a segurança vem em primeiro lugar. Conheça pessoas autênticas via chat de vídeo e verificação de identidade avançada.',
                'landing.hero.cta_start': 'Começar Grátis',
                'landing.hero.cta_login': 'Já tenho conta',

                'landing.stats.users': 'Usuários Ativos',
                'landing.stats.matches': 'Combinações',
                'landing.stats.events': 'Eventos',

                'landing.how.title': 'Como funciona',
                'landing.how.step1': '1. Cadastre-se e verifique sua identidade',
                'landing.how.step2': '2. Complete seu perfil',
                'landing.how.step3': '3. Encontre parceiros seguros',
                'landing.how.step4': '4. Conecte-se via chat de vídeo',

                'landing.testimonials.title': 'Depoimentos',
                'landing.testimonials.1': '“Uma experiência incrível!” – Ana',
                'landing.testimonials.2': '“Senti-me segura e respeitada.” – Luis',
                'landing.testimonials.3': '“Encontrei meu par ideal!” – Carla',

                'landing.comparison.title': 'Comparação',
                'landing.comparison.features': 'Recursos',
                'landing.comparison.verification': 'Verificação',
                'landing.comparison.videochat': 'Chat de Vídeo',
                'landing.comparison.support': 'Suporte 24/7',
                'landing.comparison.others': 'Outros',

                'landing.features.title': 'Por que nos escolher?',
                'landing.features.subtitle': 'Projetado para pessoas que valorizam seu tempo e segurança acima de matches infinitos.',
                'landing.features.1.title': 'Verificação Rigorosa',
                'landing.features.1.desc': 'Cada perfil é validado manualmente e por IA. Adeus perfis falsos e surpresas desagradáveis.',
                'landing.features.2.title': 'Vídeo Primeiro',
                'landing.features.2.desc': 'Conheça seu par por videochamada segura antes de compartilhar seu número ou se encontrar pessoalmente.',
                'landing.features.3.title': 'Experiência VIP',
                'landing.features.3.desc': 'Acesse o modo Concierge para organizarmos seus encontros ou participe de nossos eventos exclusivos.',

                'landing.cta.title': 'Pronto para conhecer pessoas reais?',
                'landing.cta.subtitle': 'Junte-se à comunidade mais seleta hoje. Seu primeiro encontro seguro está a apenas alguns cliques.',
                'landing.cta.button': 'Criar Conta Agora',

                'landing.footer.desc': 'Redefinindo o namoro online com segurança, transparência e exclusividade.',
                'landing.footer.platform': 'Plataforma',
                'landing.footer.vip': 'Eventos VIP',
                'landing.footer.help': 'Ajuda',
                'landing.footer.center': 'Centro de Ajuda',
                'landing.footer.safety': 'Dicas de Segurança',
                'landing.footer.rights': '2024 TuCitaSegura. Todos os direitos reservados.',
                'landing.footer.privacy': 'Privacidade',
                'landing.footer.terms': 'Termos'
            }
        };

        this.init();
    }

    init() {
        // Detect browser language
        const browserLang = navigator.language.split('-')[0];
        if (this.dictionary[browserLang]) {
            this.setLanguage(browserLang, false); // Don't trigger render yet
        }

        this.isInitialized = true;

        // Translate page on load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.translatePage());
        } else {
            this.translatePage();
        }

        console.log('🌍 i18n Initialized');
    }

    async setLanguage(lang) {
        if (!this.dictionary[lang]) {
            console.warn(`Language ${lang} not supported.`);
            return;
        }

        this.currentLang = lang;

        // Update available languages state
        this.availableLanguages.forEach(l => {
            l.current = l.code === lang;
        });

        // Translate the page
        this.translatePage();

        // Dispatch event for other components (like LanguageSelector)
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
    }

    translatePage() {
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = this.t(key);

            if (translation) {
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    el.placeholder = translation;
                } else {
                    el.textContent = translation;
                }
            }
        });

        // Update HTML lang attribute
        document.documentElement.lang = this.currentLang;
    }

    t(key) {
        return this.dictionary[this.currentLang][key] || key;
    }

    getAvailableLanguages() {
        return this.availableLanguages;
    }
}

// Singleton attach to window
window.i18n = new I18n();
export default window.i18n;
