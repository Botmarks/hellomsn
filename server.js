const express = require('express');
const http = require('http');
const fs = require('fs');
const bodyParser = require('body-parser');
const config = require('config');
const path = require('path');
const nodemailer = require('nodemailer');
let emailTransporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: true,
    auth: {
        user: config.email.user,
        pass: config.email.password
    }
});
emailTransporter.verify(function (error, success) {
    if (error) {
        console.log(error);
    } else {
        console.log('SMTP is ready');
    }
});

const messenger = require('./lib/messenger');
const logger = require('./lib/logger');
let emailMeRegex = new RegExp(/email me at (\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b) with (.*)/, 'i');

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

function extractEmailSetup(command) {
    let match = command.match(emailMeRegex);
    let result = null;
    if (match && match.length > 2) {
        result = {
            email: match[1],
            subject: match[2]
        }
    }
    return result;
}

function sendEmail(setup) {
    let data = {
        from: config.email.from,
        to: setup.email,
        subject: setup.subject,
        text: ''
    };
    emailTransporter.sendMail(data, function (error, info) {
        if (error) {
            logger.log('error', 'Sending email failed:\n\t%s', JSON.stringify(error || {}));
        } else {
            logger.debug('Sending email OK: ' +  info.response);
        }
    });
}

function receivedMessage(event) {
    let me = this;
    let answer = null;
    if (event.message.text) {
        var command = event.message.text.toLowerCase();
        if (command.indexOf('email me at ') === 0) {
            var emailSetup = extractEmailSetup(command);
            if (emailSetup) {
                sendEmail(emailSetup);
                answer = 'Email is sent!';
            } else {
                answer = 'There is something wrong with the email command. Please try again.';
            }
        } else if (command.indexOf('my name is ') === 0) {
            answer = 'Hello ' + event.message.text.substr(11);
        }
    } else {
        answer = 'Say "My name is {your name}"'
    }
    msn.sendTextMessage(event.sender.id, answer, event.x__botmark);
}

msn.setGreetingText('Welcome to HelloYou bot! Say "My name is {your name}".');

/* ---------- WEB SERVER ----------- */

let ports = config.get('ports');

http.createServer(app).listen(ports.http, function () {
    logger.log('info', 'HTTP on port %d', ports.http);
});
