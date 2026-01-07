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

    const { uid } = req.user;
    const db = admin.firestore();

    // GET: Retrieve Profile
    if (req.method === 'GET') {
        try {
            const userDoc = await db.collection('users').doc(uid).get();

            if (!userDoc.exists) {
                // If not found, return basic auth info (graceful degradation) instead of 404
                // enabling frontend to fill the form for new users
                return res.status(200).json({
                    success: true,
                    profile: {
                        uid: uid,
                        email: req.user.email,
                        email_verified: req.user.email_verified || false,
                        auth_time: req.user.auth_time,
                        provider: req.user.firebase?.sign_in_provider || 'unknown'
                    }
                });
            }

            const userData = userDoc.data();
            res.status(200).json({
                success: true,
                profile: {
                    ...userData,
                    uid: uid,
                    email: req.user.email, // Ensure email from auth is always present
                    email_verified: req.user.email_verified || false
                }
            });

        } catch (error) {
            logger.error('Error getting user profile', error, { uid });
            res.status(500).json({
                error: true,
                status_code: 500,
                message: 'Error al obtener el perfil de usuario'
            });
        }
        return;
    }

    // PUT: Update Profile
    if (req.method === 'PUT') {
        try {
            const updates = req.body;

            // Security: Whitelist allowed fields to prevent overwriting critical data (like subscription)
            const allowedFields = [
                'alias', 'birthDate', 'gender', 'city', 'bio', 'interests', 'profession',
                'photoURL', 'municipio', 'photos', 'relationshipStatus', 'lookingFor',
                'ageRangeMin', 'ageRangeMax', 'location', 'latitude', 'longitude', 'theme', 'email',
                'availabilityStatus', 'isProfileHidden'
            ];
            const safeUpdates = {};

            Object.keys(updates).forEach(key => {
                if (allowedFields.includes(key)) {
                    safeUpdates[key] = updates[key];
                }
            });

            // Always update updatedAt
            safeUpdates.updatedAt = admin.firestore.FieldValue.serverTimestamp();

            // Update or Set (merge)
            await db.collection('users').doc(uid).set(safeUpdates, { merge: true });

            // Return updated data
            const updatedDoc = await db.collection('users').doc(uid).get();
            res.status(200).json({
                success: true,
                message: 'Perfil actualizado correctamente',
                profile: {
                    ...updatedDoc.data(),
                    uid: uid
                }
            });

        } catch (error) {
            logger.error('Error updating user profile', error, { uid });
            res.status(500).json({
                error: true,
                status_code: 500,
                message: 'Error al actualizar el perfil'
            });
        }
        return;
    }

    return res.status(405).json({ error: 'Method not allowed' });
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
/**
 * Moderate message content
 */
exports.apiModerateMessage = functions.https.onRequest(async (req, res) => {
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

    try {
        const { text } = req.body;

        // Simple mock moderation for now
        // In real world, call OpenAI or Google Cloud NLP
        const flagged = false;

        return res.status(200).json({
            success: true,
            flagged: flagged,
            reason: null
        });

    } catch (error) {
        logger.error('Moderation error', error);
        res.status(500).json({ error: 'Moderation failed' });
    }
});
