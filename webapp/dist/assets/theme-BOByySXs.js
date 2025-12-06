const t={purple:{name:"Púrpura Pasión",icon:"💜",gradient:"linear-gradient(135deg, #667eea 0%, #764ba2 100%)",primary:"#667eea",secondary:"#764ba2",accent:"#ff0080",background:{start:"rgba(120, 119, 198, 0.3)",middle:"rgba(138, 43, 226, 0.3)",end:"rgba(255, 0, 128, 0.2)"}},blue:{name:"Azul Océano",icon:"💙",gradient:"linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",primary:"#4facfe",secondary:"#00f2fe",accent:"#0080ff",background:{start:"rgba(79, 172, 254, 0.3)",middle:"rgba(0, 242, 254, 0.3)",end:"rgba(0, 128, 255, 0.2)"}},green:{name:"Verde Natura",icon:"💚",gradient:"linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",primary:"#11998e",secondary:"#38ef7d",accent:"#00d084",background:{start:"rgba(17, 153, 142, 0.3)",middle:"rgba(56, 239, 125, 0.3)",end:"rgba(0, 208, 132, 0.2)"}},orange:{name:"Naranja Solar",icon:"🧡",gradient:"linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",primary:"#f093fb",secondary:"#f5576c",accent:"#ff6b6b",background:{start:"rgba(240, 147, 251, 0.3)",middle:"rgba(245, 87, 108, 0.3)",end:"rgba(255, 107, 107, 0.2)"}},teal:{name:"Turquesa Tropical",icon:"🩵",gradient:"linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",primary:"#43e97b",secondary:"#38f9d7",accent:"#00d9a5",background:{start:"rgba(67, 233, 123, 0.3)",middle:"rgba(56, 249, 215, 0.3)",end:"rgba(0, 217, 165, 0.2)"}},pink:{name:"Rosa Romance",icon:"🩷",gradient:"linear-gradient(135deg, #ff6a88 0%, #ff99ac 100%)",primary:"#ff6a88",secondary:"#ff99ac",accent:"#ff4d7d",background:{start:"rgba(255, 106, 136, 0.3)",middle:"rgba(255, 153, 172, 0.3)",end:"rgba(255, 77, 125, 0.2)"}},dark:{name:"Modo Oscuro",icon:"🌙",gradient:"linear-gradient(135deg, #2d3748 0%, #1a202c 100%)",primary:"#4a5568",secondary:"#2d3748",accent:"#667eea",background:{start:"rgba(45, 55, 72, 0.4)",middle:"rgba(26, 32, 44, 0.4)",end:"rgba(74, 85, 104, 0.3)"},isDark:!0},red:{name:"Rojo Pasión",icon:"❤️",gradient:"linear-gradient(135deg, #eb3349 0%, #f45c43 100%)",primary:"#eb3349",secondary:"#f45c43",accent:"#ff0844",background:{start:"rgba(235, 51, 73, 0.3)",middle:"rgba(244, 92, 67, 0.3)",end:"rgba(255, 8, 68, 0.2)"}},gold:{name:"Dorado Elegante",icon:"⭐",gradient:"linear-gradient(135deg, #f7971e 0%, #ffd200 100%)",primary:"#f7971e",secondary:"#ffd200",accent:"#ffaa00",background:{start:"rgba(247, 151, 30, 0.3)",middle:"rgba(255, 210, 0, 0.3)",end:"rgba(255, 170, 0, 0.2)"}},violet:{name:"Violeta Místico",icon:"🔮",gradient:"linear-gradient(135deg, #5f2c82 0%, #49a09d 100%)",primary:"#5f2c82",secondary:"#49a09d",accent:"#8e44ad",background:{start:"rgba(95, 44, 130, 0.3)",middle:"rgba(73, 160, 157, 0.3)",end:"rgba(142, 68, 173, 0.2)"}}};function d(a){const e=t[a]||t.purple;document.documentElement.style.setProperty("--theme-gradient",e.gradient),document.documentElement.style.setProperty("--theme-primary",e.primary),document.documentElement.style.setProperty("--theme-secondary",e.secondary),document.documentElement.style.setProperty("--theme-accent",e.accent);const r=document.createElement("style");r.id="theme-style";const n=document.getElementById("theme-style");n&&n.remove();const o=e.isDark||!1;r.textContent=`
    body {
      background: ${e.gradient} !important;
      ${o?"color: #e2e8f0 !important;":""}
    }

    body::before {
      background:
        radial-gradient(circle at 20% 50%, ${e.background.start}, transparent 50%),
        radial-gradient(circle at 80% 80%, ${e.background.middle}, transparent 50%),
        radial-gradient(circle at 40% 20%, ${e.background.end}, transparent 50%) !important;
    }

    .gradient-button {
      background: ${e.gradient} !important;
    }

    .theme-gradient-bg {
      background: ${e.gradient} !important;
    }

    .theme-primary {
      color: ${e.primary} !important;
    }

    .theme-secondary {
      color: ${e.secondary} !important;
    }

    .theme-accent {
      color: ${e.accent} !important;
    }

    /* Loading overlay */
    .loading-overlay {
      background: ${e.primary}f2 !important;
    }

    /* Navigation gradient icons */
    nav .bg-gradient-to-r {
      background: ${e.gradient} !important;
    }

    /* Profile photo placeholder gradient */
    .bg-gradient-to-br.from-purple-500,
    .bg-gradient-to-r.from-purple-500 {
      background: ${e.gradient} !important;
    }

    /* Hover effects */
    .gradient-button:hover {
      box-shadow: 0 10px 25px ${e.primary}66 !important;
    }

    /* Dark mode specific adjustments */
    ${o?`
      .glass {
        background: rgba(45, 55, 72, 0.7) !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        color: #e2e8f0 !important;
      }

      .glass h1, .glass h2, .glass h3, .glass h4, .glass h5, .glass h6 {
        color: #f7fafc !important;
      }

      .glass p, .glass span, .glass div {
        color: #e2e8f0 !important;
      }

      input, textarea, select {
        background: rgba(26, 32, 44, 0.6) !important;
        color: #e2e8f0 !important;
        border-color: rgba(255, 255, 255, 0.2) !important;
      }

      input::placeholder, textarea::placeholder {
        color: #a0aec0 !important;
      }

      .text-gray-600, .text-gray-700, .text-gray-800 {
        color: #cbd5e0 !important;
      }

      .bg-white {
        background: rgba(45, 55, 72, 0.6) !important;
        color: #e2e8f0 !important;
      }
    `:""}
  `,document.head.appendChild(r),localStorage.setItem("userTheme",a)}function c(a=null){let e="purple";if(a&&a.theme)e=a.theme;else{const r=localStorage.getItem("userTheme");r&&t[r]&&(e=r)}return d(e),e}function i(){const a=localStorage.getItem("userTheme");a&&t[a]&&d(a)}typeof window<"u"&&i();export{d as a,c as l,t};
