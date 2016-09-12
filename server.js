const express = require('express');
const https = require('https');
const http = require('http');
const fs = require('fs');
const bodyParser = require('body-parser');
const config = require('config');
const path = require('path');

const messenger = require('./lib/messenger');
const logger = require('./lib/logger');

/* ---------- CONFIG ---------- */

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

/* ---------- WEB APP ---------- */

let msn = new messenger({
    accessToken: PAGE_ACCESS_TOKEN
});
let app = express();
app.use(bodyParser.json());

app.get('/', function (req, res) {
    res.send('This is the Botmarks HelloYou Messenger Bot (c) ' + new Date().getUTCFullYear());
});

app.get('/webhook', function (req, res) {
    let me = this;
    if (req.query['hub.mode'] === 'subscribe' &&
        req.query['hub.verify_token'] === VALIDATION_TOKEN) {
        logger.debug('Validated webhook correctly');
        res.status(200).send(req.query['hub.challenge']);
    } else {
        logger.log('error', 'Webhook validation failed for token %s. Make sure the validation tokens match.', req.query['hub.verify_token']);
        res.sendStatus(403);
    }
});

app.post('/webhook', function (req, res) {
    var data = req.body;
    if (data.object == 'page') {
        data.entry.forEach(function (pageEntry) {
            pageEntry.messaging.forEach(function (messagingEvent) {
                logger.log('debug', 'Received messaging entry:\n\t%s', JSON.stringify(messagingEvent || {}));
                if (messagingEvent.message) {
                    receivedMessage(messagingEvent);
                } else {
                    logger.log('warn', 'Webhook received unsupported messagingEvent:\n\t%s', JSON.stringify(messagingEvent || {}));
                }
            });
        });

        res.sendStatus(200);
    }
});

function receivedMessage(event) {
    let me = this;
    let answer = null;
    if (event.message.text && event.message.text.toLowerCase().indexOf('my name is ') === 0) {
        answer = 'Hello ' + event.message.text.substr(11);
    } else {
        answer = 'Say "My name is {your name}"'
    }
    msn.sendTextMessage(event.sender.id, answer, event.x__botmark);
}

/* ---------- WEB SERVER ----------- */

var ports = config.get('ports');

const httpsOptions = {
	ca: fs.readFileSync(path.join(ssl.certRoot, 'chain.pem')),
	key: fs.readFileSync(path.join(ssl.certRoot, 'privkey.pem')),
	cert: fs.readFileSync(path.join(ssl.certRoot, 'cert.pem'))
};

https.createServer(httpsOptions, app).listen(ports.https, function () {
	logger.log('info', 'HTTPS on port %d', ports.https);
});
