console.log('Test file loaded');
const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();
const test = require('firebase-functions-test')();

describe('PayPal Token Cache', () => {
    let myFunctions;
    let axiosStub;
    let adminMock;

    beforeEach(() => {
        // Mock axios
        axiosStub = sinon.stub();

        // Mock Firebase Admin
        adminMock = {
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
        myFunctions = proxyquire('../index', {
            'axios': axiosStub,
            'firebase-admin': adminMock
        });
    });

    afterEach(() => {
        sinon.restore();
        test.cleanup();
    });

    it('should cache PayPal access token', async () => {
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
        const wrapped = test.wrap(myFunctions.captureInsuranceAuthorization);
        const data = {
            authorizationId: 'auth_1',
            appointmentId: 'appt_1',
            victimUserId: 'victim'
        };
        const context = { auth: { uid: 'victim' } };

        // First call - should fetch token
        await wrapped(data, context);

        // Second call - should use cached token
        await wrapped(data, context);

        // Verify axios calls to token endpoint
        const tokenCalls = axiosStub.getCalls().filter(call =>
            call.args[0].url && call.args[0].url.includes('oauth2/token')
        );

        expect(tokenCalls.length).to.equal(1, 'Should fetch token only once');
    });
});
