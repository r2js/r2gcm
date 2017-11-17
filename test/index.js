const gcm = require('node-gcm');
const sinon = require('sinon');
const r2base = require('r2base');
const r2gcm = require('../index');
const chai = require('chai');

const { expect } = chai;
process.chdir(__dirname);

const app = r2base();
app.start().serve(r2gcm, {}).into(app);
const Gcm = app.service('Gcm');

const data = {
  message: 'test title',
  body: 'test body',
  topic: 'com.test.app',
  badge: 2,
  sound: 'mySound.aiff',
  data: {
    action: 'test-action',
    email: 'test@app.com',
    body: 'test body',
  },
  tokens: [
    'APA91bFQCD9Ndd8uVggMhj1usfeWsKIfGyBUWMprpZLGciWrMjS-77bIY24IMQNeEHzjidCcddnDxqYo-UEV03xw6ySmtIgQyzTqhSxhPGAi1maf6KDMAQGuUWc6L5Khze8YK9YrL9I_WD1gl49P3f_9hr08ZAS5Ta',
    'APA91bFQCD9Ndd8uVggMhj1usfeWsKIfGyBUWMprpZLGciWrMjS-77bIY24IMQNeEHzjidCcddnDxqYo-UEV03xw6ySmtIgQyzTqhSxhPGAi1maf6KDMAQGuUWc6L5Khze8YK9YrL9I_WD1gl49P3f_9hr08ZAS5Tb',
    'APA91bFQCD9Ndd8uVggMhj1usfeWsKIfGyBUWMprpZLGciWrMjS-77bIY24IMQNeEHzjidCcddnDxqYo-UEV03xw6ySmtIgQyzTqhSxhPGAi1maf6KDMAQGuUWc6L5Khze8YK9YrL9I_WD1gl49P3f_9hr08ZAS5Tc',
    'APA91bFQCD9Ndd8uVggMhj1usfeWsKIfGyBUWMprpZLGciWrMjS-77bIY24IMQNeEHzjidCcddnDxqYo-UEV03xw6ySmtIgQyzTqhSxhPGAi1maf6KDMAQGuUWc6L5Khze8YK9YrL9I_WD1gl49P3f_9hr08ZAS5Td',
    'APA91bFQCD9Ndd8uVggMhj1usfeWsKIfGyBUWMprpZLGciWrMjS-77bIY24IMQNeEHzjidCcddnDxqYo-UEV03xw6ySmtIgQyzTqhSxhPGAi1maf6KDMAQGuUWc6L5Khze8YK9YrL9I_WD1gl49P3f_9hr08ZAS5Te',
    'APA91bFQCD9Ndd8uVggMhj1usfeWsKIfGyBUWMprpZLGciWrMjS-77bIY24IMQNeEHzjidCcddnDxqYo-UEV03xw6ySmtIgQyzTqhSxhPGAi1maf6KDMAQGuUWc6L5Khze8YK9YrL9I_WD1gl49P3f_9hr08ZAS5Tf',
  ],
};

let sendMethod;
const fErr = new Error('Forced error');

const sendOkMethod = () => (
  sinon.stub(gcm.Sender.prototype, 'send').callsFake((message, recipients, retries) => {
    expect(recipients).to.be.instanceOf(Object);
    expect(recipients).to.have.property('registrationTokens');
    const { registrationTokens } = recipients;
    expect(registrationTokens).to.be.instanceOf(Array);
    registrationTokens.forEach(regId => expect(data.tokens).to.include(regId));
    expect(retries).to.be.a('number');
    expect(message).to.be.instanceOf(gcm.Message);
    expect(message.params).to.deep.equal({
      priority: 'high',
      contentAvailable: true,
      data: {
        action: 'test-action',
        email: 'test@app.com',
        body: 'test body',
        title: 'test title',
        sound: 'mySound.aiff',
        payload: {},
      },
    });

    return Promise.resolve({
      multicast_id: 'abc',
      success: registrationTokens.length,
      failure: 0,
      results: registrationTokens.map(token => ({
        message_id: '',
        registration_id: token,
        error: null,
      })),
    });
  })
);

const sendFailureMethod1 = () => (
  sinon.stub(gcm.Sender.prototype, 'send').callsFake((message, recipients) => {
    const { registrationTokens } = recipients;
    return Promise.resolve({
      multicast_id: 'abc',
      success: 0,
      failure: data.tokens.length,
      results: registrationTokens.map(token => ({
        message_id: '',
        registration_id: token,
        error: fErr.message,
      })),
    });
  })
);

const sendFailureMethod2 = () => (
  sinon.stub(gcm.Sender.prototype, 'send').callsFake(() => (
    Promise.resolve({
      multicast_id: 'abc',
      success: 0,
      failure: data.tokens.length,
    })
  ))
);

describe('r2gcm', () => {
  describe('succesful response', () => {
    before(() => {
      sendMethod = sendOkMethod();
    });

    after(() => {
      sendMethod.restore();
    });

    it('should send push notifications, succesful', (done) => {
      Gcm.send(data)
        .then((response) => {
          expect(response.method).to.equal('gcm');
          expect(response.device).to.equal('android');
          expect(response.success).to.equal(6);
          expect(response.failure).to.equal(0);
          expect(response.message.length).to.equal(data.tokens.length);
          done();
        })
        .catch(done);
    });
  });

  describe('failure response', () => {
    before(() => {
      sendMethod = sendFailureMethod1();
    });

    after(() => {
      sendMethod.restore();
    });

    it('should send push notifications, failure (with response)', (done) => {
      Gcm.send(data)
        .then((response) => {
          expect(response.method).to.equal('gcm');
          expect(response.device).to.equal('android');
          expect(response.success).to.equal(0);
          expect(response.failure).to.equal(6);
          expect(response.message.length).to.equal(data.tokens.length);
          done();
        })
        .catch(done);
    });
  });

  describe('failure response', () => {
    before(() => {
      sendMethod = sendFailureMethod2();
    });

    after(() => {
      sendMethod.restore();
    });

    it('should send push notifications, failure (without response)', (done) => {
      Gcm.send(data)
        .then((response) => {
          expect(response.success).to.equal(0);
          expect(response.failure).to.equal(6);
          expect(response.message.length).to.equal(0);
          done();
        })
        .catch(done);
    });
  });
});
