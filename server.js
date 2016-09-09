const express = require('express');
const https = require('https');
const http = require('http');
const fs = require('fs');
const bodyParser = require('body-parser');
const config = require('config');
const path = require('path');

const messenger = require('./lib/messenger');
const logger = require('./lib/logger');

/* --------- CONFIG ----------- */

const VALIDATION_TOKEN = config.get('tokens.validationToken');
if (!VALIDATION_TOKEN) {
  logger.error('Missing validation token');
  process.exit(1);
}

const PAGE_ACCESS_TOKEN = config.get('tokens.pageAccessToken');
if (!PAGE_ACCESS_TOKEN) {
  logger.error('Missing page access token');
  process.exit(1);
}

/* --------- WEB APP ------------ */

let msn = new messenger({
  accessToken: PAGE_ACCESS_TOKEN
});
let app = express();
app.use(bodyParser.json());

app.get('/', function (req, res) {
  res.send('This is the Botmarks HelloYou Messenger Bot (c) ' + new Date().getUTCFullYear());
});

app.get('/', function (req, res) {
  if (req.query['hub.mode'] === 'subscribe' &&
    req.query['hub.verify_token'] === VALIDATION_TOKEN) {
    me._logger.debug('Validated webhook correctly');
    res.status(200).send(req.query['hub.challenge']);
  } else {
    me._logger.log('error', 'Webhook validation failed for token %s. Make sure the validation tokens match.', req.query['hub.verify_token']);
    res.sendStatus(403);
  }
});

app.post('/', function (req, res) {
  var data = req.body;
  if (data.object == 'page') {
    data.entry.forEach(function (pageEntry) {
      pageEntry.messaging.forEach(function (messagingEvent) {
        logger.log('debug', 'Received messaging entry:\n\t%s', JSON.stringify(messagingEvent || {}));
        if (messagingEvent.message) {
          receivedMessage(messagingEvent);
        } else if (messagingEvent.postback) {
          receivedPostback(messagingEvent);
        } else {
          logger.log('warn', 'Webhook received strange/unsupported messagingEvent:\n\t%s', JSON.stringify(messagingEvent || {}));
        }
      });
    });

    res.sendStatus(200);
  }
});

function receivedMessage(event) {
  let me = this;
  let text = 'hello you';
  msn.sendTextMessage(event.sender.id, text)
}

// user tapped a button in structured message
function receivedPostback(event) {
  let me = this;
  if (event.postback.payload) {
    let text = 'hello you';
    msn.sendTextMessage(event.sender.id, text)
  } else {
    logger.log('warn', 'Received postback without payload:\n\t%s', JSON.stringify(event || {}))
  }
}

/* ---------- WEB SERVER ----------- */

var ssl = config.get('ssl');
var ports = config.get('ports');

if (ssl.enabled) {
  const httpsOptions = {
    ca: fs.readFileSync(path.join(ssl.certRoot, 'chain.pem')),
    key: fs.readFileSync(path.join(ssl.certRoot, 'privkey.pem')),
    cert: fs.readFileSync(path.join(ssl.certRoot, 'cert.pem'))
  };

  https.createServer(httpsOptions, app).listen(ports.https, function () {
    logger.log('info', 'HTTPS on port %d', ports.https);
  });
} else {
  logger.log('info', 'HTTPS disabled');
}

http.createServer(app).listen(ports.http, function () {
  logger.log('info', 'HTTP on port %d', ports.http);
});
