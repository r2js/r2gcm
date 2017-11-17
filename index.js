const gcm = require('node-gcm');
const log = require('debug')('r2:gcm');

module.exports = function Gcm(app, conf) {
  const getConf = conf || app.config('apn');
  if (!getConf) {
    return log('gcm config not found!');
  }

  const device = 'android';
  const method = 'gcm';
  const { key } = getConf;
  const connection = () => new gcm.Sender(key);

  const sendNotification = conn => (opts) => {
    const {
      priority = 'high',
      contentAvailable = true,
      tokens = [],
      data = {},
      payload = {},
      message: title,
      sound = 'beep.wav',
      retries = 0,
    } = opts;

    Object.assign(data, { title, sound, payload });

    const gcmMessage = new gcm.Message({ priority, contentAvailable, data });

    log('sending notification %o', gcmMessage);
    return conn.send(gcmMessage, { registrationTokens: tokens }, retries)
      .then((gcmData) => {
        const { success = 0, failure = 0, results = [] } = gcmData;
        const response = { method, device, success, failure, message: [] };

        results.reduce((prev, result) => {
          const { registration_id: token, error } = result;
          prev.message.push({ token, error });
          return prev;
        }, response);

        return response;
      });
  };

  const send = sendNotification(connection());

  return { device, method, send };
};
