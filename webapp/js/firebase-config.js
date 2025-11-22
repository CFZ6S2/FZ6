// Firebase Configuration
export const firebaseConfig = {
    apiKey: "AIzaSyAgFcoHwoBpo80rlEHL2hHVZ2DqtjWXh2s",
    authDomain: "tu-cita-segura.firebaseapp.com",
    projectId: "tu-cita-segura",
    storageBucket: "tu-cita-segura.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456"
};

export default firebaseConfig;

// Export for CommonJS modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { firebaseConfig };
}
