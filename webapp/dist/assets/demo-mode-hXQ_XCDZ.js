function o(){return localStorage.getItem("isDemoMode")==="true"}function t(){const e=localStorage.getItem("demoUser");return e?JSON.parse(e):null}function n(){localStorage.removeItem("isDemoMode"),localStorage.removeItem("demoUser"),localStorage.removeItem("demoToken")}function i(){if(o()){const e=document.createElement("div");e.id="demo-mode-banner",e.innerHTML=`
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: linear-gradient(45deg, #f59e0b, #ef4444);
                color: white;
                text-align: center;
                padding: 8px;
                font-size: 14px;
                font-weight: 600;
                z-index: 9999;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            ">
                🎯 MODO DEMO ACTIVO - Funcionalidad limitada
                <button onclick="window.exitDemoMode()" style="
                    margin-left: 10px;
                    background: white;
                    color: #f59e0b;
                    border: none;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 12px;
                    cursor: pointer;
                ">Salir</button>
            </div>
        `,document.body.appendChild(e),document.body.style.marginTop="40px",window.exitDemoMode=function(){confirm("¿Salir del modo demo?")&&(n(),window.location.href="/webapp/login.html")}}}function d(){o()&&(i(),console.log("🎯 Demo mode active - User:",t()?.email))}typeof window<"u"&&(localStorage.getItem("isDemoMode")==="true"&&(console.log("🧹 Limpiando Modo Demo obsoletar automáticamente..."),localStorage.removeItem("isDemoMode"),localStorage.removeItem("demoUser"),localStorage.removeItem("demoToken")),document.addEventListener("DOMContentLoaded",d));export{o as a,t as g,d as i};
