// landing.js - lightweight animations for the new landing page

// Particle background (simple canvas animation)
function initParticles() {
    const canvas = document.getElementById('particle-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const particles = [];
    const colors = ['#3b82f6', '#8b5cf6', '#60a5fa', '#c084fc'];
    const resize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    function createParticle() {
        const size = Math.random() * 3 + 1;
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            size,
            color: colors[Math.floor(Math.random() * colors.length)],
        });
    }
    for (let i = 0; i < 100; i++) createParticle();

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
            if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
        });
        requestAnimationFrame(animate);
    }
    animate();
}

// Typing effect for hero headline
function typeHeadline(element, texts, speed = 100) {
    let i = 0, j = 0, current = '';
    function type() {
        if (i < texts.length) {
            if (j < texts[i].length) {
                current += texts[i][j];
                element.textContent = current;
                j++;
                setTimeout(type, speed);
            } else {
                // pause before next phrase
                setTimeout(() => {
                    current = '';
                    element.textContent = '';
                    j = 0;
                    i = (i + 1) % texts.length;
                    type();
                }, 1500);
            }
        }
    }
    type();
}

// Counter animation when element enters viewport
function animateCounters() {
    const counters = document.querySelectorAll('.stat-number');
    const options = { threshold: 0.6 };
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const target = +el.getAttribute('data-target');
                const duration = 2000;
                const stepTime = Math.abs(Math.floor(duration / target));
                let count = 0;
                const timer = setInterval(() => {
                    count += 1;
                    el.textContent = count;
                    if (count >= target) clearInterval(timer);
                }, stepTime);
                obs.unobserve(el);
            }
        });
    }, options);
    counters.forEach(c => observer.observe(c));
}

// Simple scroll reveal using IntersectionObserver
function scrollReveal() {
    const revealElems = document.querySelectorAll('.reveal');
    const options = { threshold: 0.2 };
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-fade-in');
                obs.unobserve(entry.target);
            }
        });
    }, options);
    revealElems.forEach(el => observer.observe(el));
}

// Initialize all when DOM ready
document.addEventListener('DOMContentLoaded', () => {
    // Defer particle initialization to improve LCP
    if ('requestIdleCallback' in window) {
        requestIdleCallback(() => initParticles());
    } else {
        setTimeout(initParticles, 2000);
    }
    const headline = document.getElementById('hero-headline');
    if (headline) {
        typeHeadline(headline, ['Conexiones Reales, Sin Riesgos', 'Seguridad Garantizada', 'Citas Verificadas']);
    }
    animateCounters();
    scrollReveal();
});
