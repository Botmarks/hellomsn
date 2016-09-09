const request = require('request-promise');
const logger = require('./logger');

/* sends platform-specific messages to Messenger */

/* constructor */

function Messenger(options) {
  this._PAGE_ACCESS_TOKEN = options.accessToken;
  this._logger = logger;
};

/* private functions */

function sendText(recipientId, messageText) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText
    }
  };
  graphSend.call(this, messageData, 'messages');
}

function graphSend(messageData, endpoint) {
  var me = this;
  endpoint = endpoint || 'messages';
  var payload = {
    uri: 'https://graph.facebook.com/v2.6/me/' + endpoint,
    qs: {
      access_token: me._PAGE_ACCESS_TOKEN
    },
    method: 'POST',
    json: messageData
  };
  request(payload)
    .then(response => {
      me._logger.log('debug', '----FB Graph send OK\n\tendpoint: %s\n\tpayload: %s\n\tresponse: %s',
        endpoint,
        JSON.stringify(messageData || {}),
        JSON.stringify(response || {}));
    })
    .catch(err => {
      me._logger.log('error', '----FB Graph send ERR\n\tendpoint: %s\n\tpayload: %s\n\tresponse: %s',
        endpoint,
        JSON.stringify(messageData || {}),
        JSON.stringify(err || {}));
    });
}

/* public functions */

Messenger.prototype.sendTextMessage = function (recipient, text) {
  sendText.call(this, recipient, text);
};

module.exports = Messenger;
