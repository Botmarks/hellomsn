const winston = require('winston');
const fs = require('fs');
const path = require('path');

var logDir = './logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

/* singleton export */

module.exports = new winston.Logger({
  transports: [
    new winston.transports.Console({
      level: 'debug'
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'all.log'),
      level: 'debug'
    })
  ],
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'error.log')
    })
  ]
});