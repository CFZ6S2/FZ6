const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();
const fs = require('fs');

const logFile = 'test_result.txt';
try {
    fs.writeFileSync(logFile, 'Starting test...\n');
} catch (e) {
    console.error('Error writing to log file:', e);
}

function log(msg) {
    try {
        fs.appendFileSync(logFile, msg + '\n');
        console.log(msg);
    } catch (e) {
        console.error('Error appending to log file:', e);
    }
}

async function runTest() {
    log('Starting standalone test...');

    // Mock axios
    const axiosStub = sinon.stub();

    // Mock Firebase Admin
    const adminMock = {
        initializeApp: sinon.stub(),
        firestore: sinon.stub().returns({
            collection: sinon.stub().returns({
                doc: sinon.stub().returns({
                    get: sinon.stub().resolves({ exists: true, data: () => ({ participants: ['victim', 'ghoster'] }) }),
                    update: sinon.stub().resolves(),
                    set: sinon.stub().resolves()
                }),
                add: sinon.stub().resolves()
            })
        }),
        auth: sinon.stub().returns({
            getUser: sinon.stub().resolves({}),
            setCustomClaims: sinon.stub().resolves()
        })
    };
    adminMock.firestore.FieldValue = {
        serverTimestamp: () => 'TIMESTAMP'
    };

    // Load functions with mocks
    const myFunctions = proxyquire('../index', {
        'axios': axiosStub,
        'firebase-admin': adminMock,
        'firebase-functions/v1': {
            https: {
                onCall: (handler) => handler
            },
            config: () => ({})
        }
    });

    log('Functions loaded.');

    // Setup axios responses
    // 1. Token request
    axiosStub.withArgs(sinon.match.has('url', sinon.match(/oauth2\/token/))).resolves({
        data: {
            access_token: 'token_1',
            expires_in: 3600
        }
    });

    // 2. Capture request (mocking success to avoid errors)
    axiosStub.withArgs(sinon.match.has('url', sinon.match(/payments\/authorizations/))).resolves({
        data: {
            id: 'capture_1',
            status: 'COMPLETED'
        }
    });

    // Call the function that triggers getPayPalAccessToken
    const handler = myFunctions.captureInsuranceAuthorization;
    const data = {
        authorizationId: 'auth_1',
        appointmentId: 'appt_1',
        victimUserId: 'victim'
    };
    const context = { auth: { uid: 'victim' } };

    log('First call...');
    // First call - should fetch token
    await handler(data, context);

    log('Second call...');
    // Second call - should use cached token
    await handler(data, context);

    // Verify axios calls to token endpoint
    const tokenCalls = axiosStub.getCalls().filter(call =>
        call.args[0].url && call.args[0].url.includes('oauth2/token')
    );

    log(`Token fetch calls: ${tokenCalls.length}`);

    if (tokenCalls.length === 1) {
        log('✅ TEST PASSED: Token was cached correctly.');
    } else {
        log(`❌ TEST FAILED: Expected 1 token fetch, got ${tokenCalls.length}`);
    }
}

runTest().catch(err => {
    log('Test error: ' + err);
});
