const request = require('request-promise');
const logger = require('./logger');
const botmarks_response_uri = require('config').get('botmarks.apiResponseUri');

/* sends platform-specific messages to Messenger or Botmarks API */

/* constructor */

function Messenger(options) {
    this._PAGE_ACCESS_TOKEN = options.accessToken;
    this._logger = logger;
};

/* private functions */

function send(payload) {
    let me = this;
    request(payload)
        .then(response => {
            me._logger.log('debug', '---- OK\n\tpayload: %s\n\tresponse: %s',
                JSON.stringify(payload || {}),
                JSON.stringify(response || {}));
        })
        .catch(err => {
            me._logger.log('error', '---- ERR\n\tpayload: %s\n\tresponse: %s',
                JSON.stringify(payload || {}),
                JSON.stringify(err || {}));
        });
}

function botmarksSend(messageData, uri) {
    let me = this;
    let payload = {
        uri: botmarks_response_uri,
        method: 'POST',
        json: messageData
    };
    send.call(me, payload);
}

function graphSend(messageData) {
    let me = this;
    let payload = {
        uri: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {
            access_token: me._PAGE_ACCESS_TOKEN
        },
        method: 'POST',
        json: messageData
    };
    send.call(me, payload);
}

/* public functions */

Messenger.prototype.sendTextMessage = function (recipient, text, botmarks_request_info) {
    let messageData = {
        recipient: {
            id: recipient
        },
        message: {
            text: text
        }
    };
    if (botmarks_request_info) {
        messageData.x__botmark = botmarks_request_info
        botmarksSend.call(this, messageData);
    } else {
        graphSend.call(this, messageData);
    }
};

module.exports = Messenger;
