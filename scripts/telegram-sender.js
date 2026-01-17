const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const input = require("input");
const qrcode = require("qrcode-terminal");
const fs = require('fs');
const path = require('path');

// Default config path
const CONFIG_PATH = path.join(__dirname, 'telegram-config.json');

async function getCredentials() {
    let config = {};
    if (fs.existsSync(CONFIG_PATH)) {
        config = JSON.parse(fs.readFileSync(CONFIG_PATH));
    }

    if (!config.apiId) {
        console.log("⚠️  Credentials not found.");
        console.log("👉 Go to https://my.telegram.org to get your API ID and Hash.");
        config.apiId = await input.text("Enter your API ID:");
        config.apiHash = await input.text("Enter your API Hash:");

        fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
        console.log("✅ Credentials saved to telegram-config.json");
    }

    return {
        apiId: parseInt(config.apiId),
        apiHash: config.apiHash,
        session: new StringSession(config.session || "") // Save session string
    };
}

async function saveSession(sessionString) {
    if (fs.existsSync(CONFIG_PATH)) {
        const config = JSON.parse(fs.readFileSync(CONFIG_PATH));
        config.session = sessionString;
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    }
}

(async () => {
    console.log("🤖 Starting Telegram Marketing Bot...");

    // 1. Credentials
    const { apiId, apiHash, session } = await getCredentials();

    // 2. Client Setup
    const client = new TelegramClient(session, apiId, apiHash, {
        connectionRetries: 5,
    });

    // 3. Login Flow
    await client.start({
        phoneNumber: async () => await input.text("📱 Enter your number (+34...):"),
        password: async () => await input.text("🔐 Enter your 2FA password (if enabled):"),
        phoneCode: async () => await input.text("📩 Enter the code you received on Telegram:"),
        onError: (err) => console.log(err),
    });

    console.log("✅ You should now be connected.");
    saveSession(client.session.save()); // Save session for next time

    // 4. Target User
    const target = process.argv[2];
    if (!target) {
        console.error("❌ Error: Please provide a target username or user ID.");
        console.log("Usage: node scripts/telegram-sender.js @username");
        console.log("   or: node scripts/telegram-sender.js 1234567890");
        process.exit(1);
    }

    // Convert to number if it's a user ID (all digits)
    const targetEntity = /^\d+$/.test(target) ? parseInt(target) : target;

    // 5. Message Content
    const message = `
🌟 ¡Hola! Disculpa la molestia.

He visto que te interesan las citas y encuentros exclusivos. 
Te invito a conocer **TuCitaSegura.com**, la nueva plataforma verificada con:
✨ Citas sin 'ghosting' (Seguro Anti-Plantón).
✨ Perfiles 100% reales (Verificación DNI+Selfie).
✨ Suscripción VIP con Concierge personal.

🎁 **Regístrate gratis hoy:** https://tucitasegura.com

¡Espero verte dentro! 💘
`;

    try {
        console.log(`📤 Sending message to ${target}...`);
        await client.sendMessage(targetEntity, { message: message });
        console.log("✅ Message sent successfully!");
    } catch (error) {
        console.error("❌ Error sending message:", error);

        if (error.seconds) {
            console.log(`⏳ FloodWait: Waiting ${error.seconds} seconds...`);
        }
    }

    await client.disconnect();
    process.exit(0);
})();
