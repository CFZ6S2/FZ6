const { expect } = require('chai');
const sinon = require('sinon');
const test = require('firebase-functions-test')();
const proxyquire = require('proxyquire').noCallThru();

process.env.NODE_ENV = 'test';

const firestoreSingleton = {
  collection: sinon.stub(),
  doc: sinon.stub(),
  get: sinon.stub(),
  set: sinon.stub().resolves(),
  update: sinon.stub().resolves(),
  add: sinon.stub().resolves({ id: 'test-added-doc' })
};

firestoreSingleton.collection.callsFake(() => ({
  doc: firestoreSingleton.doc,
  update: firestoreSingleton.update,
  set: firestoreSingleton.set,
  get: firestoreSingleton.get,
  add: firestoreSingleton.add
}));
firestoreSingleton.doc.callsFake(() => ({
  update: firestoreSingleton.update,
  set: firestoreSingleton.set,
  get: firestoreSingleton.get,
  collection: () => ({
    add: firestoreSingleton.add,
    set: firestoreSingleton.set,
    update: firestoreSingleton.update,
    get: firestoreSingleton.get
  })
}));

const adminMock = {
  initializeApp: sinon.stub(),
  firestore: sinon.stub(),
  auth: sinon.stub(),
  storage: sinon.stub()
};

adminMock.firestore.returns(firestoreSingleton);

const updateUserStub = sinon.stub().resolves();
const setCustomClaimsStub = sinon.stub().resolves();
const getUserStub = sinon.stub().resolves({ uid: 'user123', email: 'cesar.herrera.rojo@gmail.com', customClaims: {} });

adminMock.auth.returns({
  updateUser: updateUserStub,
  getUser: getUserStub,
  setCustomClaims: setCustomClaimsStub
});

global.fetch = sinon.stub().resolves({ ok: true, json: async () => ({}) });

const myFunctions = proxyquire('../index', {
  'firebase-admin': adminMock,
  'stripe': () => ({})
});

describe.skip('Admin claims assignment by email', () => {
  beforeEach(() => {
    sinon.reset();
    firestoreSingleton.collection.resetHistory();
    firestoreSingleton.doc.resetHistory();
    firestoreSingleton.get.resetHistory();
    firestoreSingleton.set.resetHistory();
    firestoreSingleton.update.resetHistory();
    updateUserStub.resetHistory();
    setCustomClaimsStub.resetHistory();
    getUserStub.resetHistory();
  });

  it('promotes user to admin on create when email is whitelisted', async () => {
    expect(myFunctions.onUserDocCreate).to.be.a('function');
    const uid = 'user123';
    const before = null;
    const after = { alias: 'Cesar', gender: 'masculino', userRole: 'regular' };
    const snap = test.firestore.makeDocumentSnapshot(after, `users/${uid}`);
    const wrapped = test.wrap(myFunctions.onUserDocCreate);
    await wrapped(snap, { params: { userId: uid } });

    expect(setCustomClaimsStub.called).to.equal(true);
    const claims = setCustomClaimsStub.getCall(0).args[1];
    expect(claims.role).to.equal('admin');
    expect(claims.gender).to.equal('masculino');
  });

  it('promotes user to admin on update even if role field did not change', async () => {
    expect(myFunctions.onUserDocUpdate).to.be.a('function');
    const uid = 'user123';
    const beforeData = { alias: 'Cesar', gender: 'masculino', userRole: 'regular' };
    const afterData = { alias: 'Cesar', gender: 'masculino', userRole: 'regular' };
    const beforeSnap = test.firestore.makeDocumentSnapshot(beforeData, `users/${uid}`);
    const afterSnap = test.firestore.makeDocumentSnapshot(afterData, `users/${uid}`);
    const change = test.makeChange(beforeSnap, afterSnap);
    const wrapped = test.wrap(myFunctions.onUserDocUpdate);
    await wrapped(change, { params: { userId: uid } });

    expect(setCustomClaimsStub.called).to.equal(true);
    const claims = setCustomClaimsStub.getCall(0).args[1];
    expect(claims.role).to.equal('admin');
    expect(claims.gender).to.equal('masculino');
  });
});