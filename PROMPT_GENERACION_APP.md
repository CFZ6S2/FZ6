# Prompt para Generación de App: TuCitaSegura Landing Page

## Contexto del Proyecto
Crea una landing page premium para "TuCitaSegura", una plataforma de reserva de citas sin estrés. El diseño debe ser moderno, con estilo glassmorphism, animaciones suaves y completamente responsive.

## Estilo Visual

### Glassmorphism Premium
- Fondos con desenfoque (backdrop-filter: blur)
- Tarjetas semitransparentes con bordes suaves
- Sombras sutiles y efectos de brillo
- Degradados suaves (azul-violeta como base)
- Tipografía sans-serif moderna, títulos en peso alto

### Paleta de Colores
- Degradado principal: azul (#4A90E2) a violeta (#9B59B6)
- Fondos: blanco/negro con transparencias
- Acentos: colores vibrantes en botones CTA
- Texto: alto contraste para legibilidad

## Estructura de la Landing Page (index.html)

### 1. Header/Navegación
- Logo "TuCitaSegura" a la izquierda
- Menú horizontal: Inicio, Cómo Funciona, Testimonios, Comparativa, Contacto
- Botón CTA "Empezar Ahora" en el header
- Sticky header con efecto glassmorphism

### 2. Hero Section
- **Fondo de partículas animadas** (canvas ligero o CSS)
- **Efecto typing** en el título principal que alterna:
  - "Reserva citas sin esperas"
  - "Reserva citas sin llamadas"
  - "Reserva citas 24/7"
- Subtítulo: "La plataforma más sencilla para gestionar tus citas. Olvídate de las esperas telefónicas."
- Dos botones: "Crear Cuenta Gratis" (principal) y "Ver Demo" (secundario)
- Mockup/imagen de la app a la derecha (o debajo en móvil)

### 3. Sección Estadísticas (#estadisticas)
- 4 tarjetas glassmorphism con contadores animados:
  - "Usuarios Activos" → 10,000+
  - "Citas Gestionadas" → 50,000+
  - "Centros Asociados" → 500+
  - "Satisfacción" → 98%
- Los números se animan al entrar en viewport (incremento gradual)
- Iconos simples para cada métrica

### 4. Sección Cómo Funciona (#como-funciona)
- Título: "¿Cómo funciona TuCitaSegura?"
- 4 pasos en horizontal (desktop) con líneas conectores:
  1. **Regístrate** - Crea tu cuenta en segundos
  2. **Elige tu servicio** - Selecciona el tipo de cita que necesitas
  3. **Elige fecha y hora** - Disponibilidad en tiempo real
  4. **Confirma y recibe recordatorios** - Notificaciones automáticas
- Cada paso tiene icono, título y descripción breve
- Layout vertical en móvil

### 5. Sección Testimonios (#testimonios)
- Título: "Lo que dicen nuestros usuarios"
- 3-4 tarjetas de testimonios con:
  - Foto/avatar (o iniciales en círculo)
  - Nombre y rol (ej: "María González, Clínica Dental")
  - Texto del testimonio (2-3 frases)
  - Badge de verificación ✓
  - Rating con estrellas (4-5 estrellas)
- Efecto hover: levitación y sombra aumentada
- Animación de entrada al hacer scroll

### 6. Sección Comparativa (#comparativa)
- Título: "TuCitaSegura vs Otras Soluciones"
- Tabla comparativa con:
  - Filas: Recordatorios automáticos, Panel online, Soporte en español, Seguridad de datos, Sin costos ocultos, Integración fácil
  - Columnas: TuCitaSegura (✓) vs Otros (✗ o vacío)
- Estilo glassmorphism en la tabla
- Destacar la columna de TuCitaSegura

### 7. Footer
- Enlaces a: Privacidad, Términos, Contacto
- Redes sociales (iconos)
- Copyright: "© 2024 TuCitaSegura. Todos los derechos reservados."
- Email de contacto genérico

## Páginas Adicionales

### privacidad.html
- Política de Privacidad completa en español (España)
- Secciones: Recopilación de datos, Uso de cookies, Derechos del usuario (RGPD), Seguridad, Contacto
- Mismo estilo glassmorphism
- Navegación de vuelta a index.html

### terminos.html
- Términos y Condiciones en español (España)
- Secciones: Aceptación de términos, Conducta del usuario, Responsabilidad, Cancelación, Modificaciones
- Mismo estilo glassmorphism
- Navegación de vuelta a index.html

### contacto.html
- Formulario de contacto (solo visual, sin backend)
- Campos: Nombre, Email, Asunto, Mensaje
- Botón "Enviar" que muestra mensaje de confirmación (sin envío real)
- Sección FAQ breve (3-4 preguntas comunes)
- Canales de soporte: Email, Teléfono (genérico)
- Mismo estilo glassmorphism

## Animaciones y Efectos

### Scroll Reveal
- Usar IntersectionObserver (sin librerías pesadas)
- Efectos: fade-in, slide-up, scale-in
- Cada sección se revela al entrar en viewport

### Partículas en Hero
- Canvas ligero con partículas flotantes
- O alternativamente, pseudo-elementos CSS animados
- Movimiento suave, sin sobrecargar CPU

### Typing Effect
- JavaScript vanilla para el efecto de escritura
- Velocidad configurable
- Loop infinito entre los 3 mensajes

### Contadores Animados
- Incremento gradual desde 0 hasta el número objetivo
- Duración: ~2 segundos
- Trigger: cuando la sección entra en viewport

## Responsive Design

### Breakpoints
- Mobile: 375px - 767px (diseño vertical, menú hamburguesa)
- Tablet: 768px - 1023px (layout adaptado)
- Desktop: 1024px+ (layout completo horizontal)

### Mobile-First
- Diseño base para móvil
- Mejoras progresivas para pantallas grandes
- Menú hamburguesa en móvil
- Imágenes y textos optimizados para touch

## Tecnologías

- HTML5 semántico
- CSS3 (variables CSS, flexbox, grid)
- JavaScript vanilla (sin frameworks)
- IntersectionObserver API
- Canvas API (para partículas)

## Requisitos de Performance

- Animaciones con `will-change` y `transform` (GPU-accelerated)
- Lazy loading de imágenes
- CSS crítico inline
- JavaScript no bloqueante
- Optimización de partículas (máximo 50-100 partículas)

## Contenido de Ejemplo

### Testimonios
1. "TuCitaSegura ha revolucionado cómo gestionamos nuestras citas. Ya no perdemos tiempo en llamadas." - Dr. Carlos Ruiz, Clínica Dental
2. "Los pacientes adoran poder reservar a cualquier hora. Nuestra satisfacción ha aumentado un 40%." - Ana Martínez, Spa Relax
3. "Súper fácil de usar y los recordatorios automáticos son un salvavidas." - Laura Sánchez, Usuaria

### Comparativa
- TuCitaSegura tiene: ✓ en todas las características
- Otros tienen: ✗ o "Limitado" en la mayoría

## Instrucciones de Implementación

1. Crear `index.html` con toda la estructura
2. Crear `styles.css` con estilos glassmorphism y responsive
3. Crear `main.js` con todas las animaciones (typing, contadores, scroll reveal, partículas)
4. Crear `privacidad.html`, `terminos.html`, `contacto.html` con contenido legal completo
5. Asegurar que todos los enlaces funcionen correctamente
6. Probar en diferentes tamaños de pantalla
7. Optimizar para performance

## Notas Finales

- Todo el contenido debe estar en español
- Los textos legales deben ser genéricos pero completos
- El formulario de contacto es solo visual (muestra mensaje de éxito sin enviar)
- Mantener consistencia visual en todas las páginas
- Priorizar la experiencia de usuario y conversión


