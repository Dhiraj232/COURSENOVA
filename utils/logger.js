'use strict';

const fs = require('fs');
const path = require('path');

const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

const outLogPath = path.join(logDir, 'out.log');
const errLogPath = path.join(logDir, 'err.log');

function formatMessage(level, message, meta) {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` | Meta: ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level}] ${message}${metaStr}\n`;
}

function writeLog(filePath, level, message, meta) {
    const formatted = formatMessage(level, message, meta);
    
    if (process.env.NODE_ENV !== 'production') {
        if (level === 'ERROR') {
            console.error(formatted.trim());
        } else if (level === 'WARN') {
            console.warn(formatted.trim());
        } else {
            console.log(formatted.trim());
        }
    }
    
    try {
        fs.appendFileSync(filePath, formatted);
    } catch (err) {
        // Fallback silently
    }
}

const logger = {
    info: (msg, meta) => writeLog(outLogPath, 'INFO', msg, meta),
    warn: (msg, meta) => writeLog(errLogPath, 'WARN', msg, meta),
    error: (msg, meta) => writeLog(errLogPath, 'ERROR', msg, meta)
};

module.exports = logger;
