const admin = require('firebase-admin');
const vision = require('@google-cloud/vision');

// Initialize Vision Client
const client = new vision.ImageAnnotatorClient();

/**
 * Verify a photo using Google Cloud Vision API and heuristics
 * @param {string} gcsPath - The Google Cloud Storage path (e.g. gs://bucket/path/to/image)
 * @param {string} userId - The user ID associated with the photo
 * @returns {Promise<Object>} Verification result
 */
async function verifyPhotoOfUser(bucketName, filePath, userId) {
    console.log(`🔍 Verifying photo for user ${userId}: ${filePath}`);

    try {
        const gcsUri = `gs://${bucketName}/${filePath}`;

        // 1. Call Cloud Vision API
        const [result] = await client.annotateImage({
            image: { source: { gcsImageUri: gcsUri } },
            features: [
                { type: 'FACE_DETECTION' },
                { type: 'SAFE_SEARCH_DETECTION' },
                { type: 'IMAGE_PROPERTIES' },
                // { type: 'LABEL_DETECTION' } // Optional: for AI/fake detection hints
            ],
        });

        // 2. Analyze Face
        const faces = result.faceAnnotations || [];
        const isRealPerson = faces.length > 0 && faces[0].detectionConfidence > 0.6;
        const faceCount = faces.length;

        let estimatedAge = 0; // Cloud Vision doesn't give direct age, only joy/sorrow etc.
        // We could use heuristic based on other APIs or just leave as 0 for now

        // 3. Analyze Content Safety
        const safeSearch = result.safeSearchAnnotation || {};
        const isSafe =
            safeSearch.adult !== 'LIKELY' && safeSearch.adult !== 'VERY_LIKELY' &&
            safeSearch.violence !== 'LIKELY' && safeSearch.violence !== 'VERY_LIKELY' &&
            safeSearch.racy !== 'LIKELY' && safeSearch.racy !== 'VERY_LIKELY';

        const inappropriateFlags = [];
        if (!isSafe) {
            if (['LIKELY', 'VERY_LIKELY'].includes(safeSearch.adult)) inappropriateFlags.push('adult');
            if (['LIKELY', 'VERY_LIKELY'].includes(safeSearch.violence)) inappropriateFlags.push('violence');
            if (['LIKELY', 'VERY_LIKELY'].includes(safeSearch.racy)) inappropriateFlags.push('racy');
        }

        // 4. Heuristic Quality/Filter Check
        // Using image properties (color) as a rough proxy or just metadata if available
        const properties = result.imagePropertiesAnnotation;
        let qualityScore = 0.8; // Default optimistic
        // If needed, analyze dominant colors or crop hints for quality

        // 5. Construct Result
        const verificationScore = (isRealPerson ? 0.6 : 0) + (isSafe ? 0.4 : 0);

        let recommendation = 'APPROVED';
        if (!isRealPerson) recommendation = 'REJECT_NO_FACE';
        if (!isSafe) recommendation = 'REJECT_CONTENT';
        if (verificationScore < 0.5) recommendation = 'REVIEW_REQUIRED';

        const verificationResult = {
            is_real_person: isRealPerson,
            has_excessive_filters: false, // Hard to detect without specialized model
            is_appropriate: isSafe,
            estimated_age: estimatedAge,
            confidence: faces.length > 0 ? faces[0].detectionConfidence : 0,
            faces_detected: faceCount,
            warnings: inappropriateFlags,
            details: {
                face_annotations: faces.length,
                safe_search: safeSearch
            },
            verification_score: verificationScore,
            recommendation: recommendation,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        };

        console.log('✅ Photo verification complete:', verificationResult.recommendation);
        return verificationResult;

    } catch (error) {
        console.error('❌ Error verifying photo:', error);
        return {
            error: error.message,
            recommendation: 'ERROR_RETRY',
            verification_score: 0
        };
    }
}

module.exports = { verifyPhotoOfUser };
