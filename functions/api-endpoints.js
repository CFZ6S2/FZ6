// functions/api-endpoints.js
// Core API endpoints migrated from Python FastAPI backend

const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const { createLogger } = require('./utils/structured-logger');
const { verifyAppCheckHTTP } = require('./middleware/app-check');

const logger = createLogger('api-endpoints');

// ============================================================================
// MIDDLEWARE: Authentication
// ============================================================================

/**
 * Verify Firebase ID token from Authorization header
 */
async function verifyAuth(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            error: true,
            status_code: 401,
            message: 'No authentication token provided'
        });
    }

    const idToken = authHeader.split('Bearer ')[1];

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.user = decodedToken;
        next();
    } catch (error) {
        logger.error('Token verification failed', error);
        return res.status(401).json({
            error: true,
            status_code: 401,
            message: 'Invalid or expired token'
        });
    }
}

/**
 * Optional auth - doesn't fail if no token provided
 */
async function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        req.user = null;
        return next();
    }

    const idToken = authHeader.split('Bearer ')[1];

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.user = decodedToken;
    } catch (error) {
        logger.warn('Optional auth: token verification failed', { error: error.message });
        req.user = null;
    }

    next();
}

// ============================================================================
// CORS Helper
// ============================================================================

function setCORS(res) {
    const allowedOrigins = [
        'https://tucitasegura.vercel.app',
        'https://tucitasegura.com',
        'https://www.tucitasegura.com',
        'https://tucitasegura-129cc.web.app',
        'https://tucitasegura-129cc.firebaseapp.com',
        'http://localhost:5173',
        'http://localhost:3000'
    ];

    res.set('Access-Control-Allow-Origin', '*'); // Simplificado para desarrollo
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Firebase-AppCheck');
    res.set('Access-Control-Allow-Credentials', 'true');
}

// ============================================================================
// PUBLIC ENDPOINTS
// ============================================================================

/**
 * Health check endpoint
 */
exports.apiHealth = functions.https.onRequest(async (req, res) => {
    setCORS(res);

    if (req.method === 'OPTIONS') {
        return res.status(204).send('');
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const healthData = {
        status: 'healthy',
        service: 'tucitasegura-api',
        timestamp: new Date().toISOString(),
        firebase: 'connected',
        environment: process.env.FUNCTION_TARGET || 'production'
    };

    logger.info('Health check', healthData);
    res.status(200).json(healthData);
});

/**
 * Public test endpoint
 */
exports.apiPublic = functions.https.onRequest(async (req, res) => {
    setCORS(res);

    if (req.method === 'OPTIONS') {
        return res.status(204).send('');
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    res.status(200).json({
        message: 'Esta ruta es pública ✔️',
        access: 'public',
        description: 'No se requiere autenticación para acceder a este endpoint'
    });
});

// ============================================================================
// PROTECTED ENDPOINTS (require authentication)
// ============================================================================

/**
 * Protected test endpoint
 */
exports.apiProtected = functions.https.onRequest(async (req, res) => {
    setCORS(res);

    if (req.method === 'OPTIONS') {
        return res.status(204).send('');
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Verify authentication
    await new Promise((resolve, reject) => {
        verifyAuth(req, res, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });

    res.status(200).json({
        message: 'Ruta protegida 🔐',
        access: 'authenticated',
        user: {
            uid: req.user.uid,
            email: req.user.email,
            email_verified: req.user.email_verified || false
        }
    });
});

/**
 * Get user profile
 */
exports.apiUserProfile = functions.https.onRequest(async (req, res) => {
    setCORS(res);

    if (req.method === 'OPTIONS') {
        return res.status(204).send('');
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Verify authentication
    try {
        await new Promise((resolve, reject) => {
            verifyAuth(req, res, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    } catch (error) {
        return; // verifyAuth already sent response
    }

    try {
        const userDoc = await admin.firestore()
            .collection('users')
            .doc(req.user.uid)
            .get();

        if (!userDoc.exists) {
            return res.status(404).json({
                error: true,
                status_code: 404,
                message: 'User profile not found'
            });
        }

        const userData = userDoc.data();

        res.status(200).json({
            success: true,
            profile: {
                uid: req.user.uid,
                email: req.user.email,
                email_verified: req.user.email_verified || false,
                name: userData.name || userData.alias || 'Usuario',
                photoURL: userData.photoURL || null,
                gender: userData.gender || null,
                userRole: userData.userRole || 'regular',
                hasActiveSubscription: userData.hasActiveSubscription || false,
                auth_time: req.user.auth_time,
                provider: req.user.firebase?.sign_in_provider || 'unknown'
            }
        });

    } catch (error) {
        logger.error('Error getting user profile', error, { uid: req.user?.uid });
        res.status(500).json({
            error: true,
            status_code: 500,
            message: 'Error al obtener el perfil de usuario'
        });
    }
});

/**
 * Upload file to Storage
 */
exports.apiUpload = functions.https.onRequest(async (req, res) => {
    setCORS(res);

    if (req.method === 'OPTIONS') {
        return res.status(204).send('');
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Verify authentication
    try {
        await new Promise((resolve, reject) => {
            verifyAuth(req, res, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    } catch (error) {
        return; // verifyAuth already sent response
    }

    // Note: File upload implementation requires multipart/form-data parsing
    // For now, return placeholder - implement with busboy or similar if needed
    res.status(501).json({
        error: true,
        status_code: 501,
        message: 'File upload not yet implemented in Firebase Functions. Use Firebase Storage SDK directly from client.'
    });
});

/**
 * Optional auth endpoint (works with or without token)
 */
exports.apiOptional = functions.https.onRequest(async (req, res) => {
    setCORS(res);

    if (req.method === 'OPTIONS') {
        return res.status(204).send('');
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    await new Promise((resolve) => {
        optionalAuth(req, res, resolve);
    });

    if (req.user) {
        res.status(200).json({
            message: 'Usuario autenticado ✅',
            authenticated: true,
            uid: req.user.uid,
            email: req.user.email
        });
    } else {
        res.status(200).json({
            message: 'Usuario anónimo 👤',
            authenticated: false,
            access: 'public'
        });
    }
});

logger.info('API endpoints module loaded');
