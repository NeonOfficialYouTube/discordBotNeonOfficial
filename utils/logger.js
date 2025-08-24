const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

// Log levels
const LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
};

const CURRENT_LOG_LEVEL = LOG_LEVELS.INFO;

/**
 * Format timestamp for logging
 * @returns {string} Formatted timestamp
 */
function getTimestamp() {
    return new Date().toISOString();
}

/**
 * Get log filename for current date
 * @returns {string} Log filename
 */
function getLogFilename() {
    const date = new Date().toISOString().split('T')[0];
    return path.join(logsDir, `bot-${date}.log`);
}

/**
 * Write log entry to file and console
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {any} data - Additional data to log
 */
function writeLog(level, message, data = null) {
    const timestamp = getTimestamp();
    const logEntry = {
        timestamp,
        level,
        message,
        data: data ? (typeof data === 'object' ? JSON.stringify(data, null, 2) : data) : null
    };
    
    // Console output with colors
    const colorCode = {
        ERROR: '\x1b[31m', // Red
        WARN: '\x1b[33m',  // Yellow
        INFO: '\x1b[36m',  // Cyan
        DEBUG: '\x1b[37m'  // White
    };
    
    const resetColor = '\x1b[0m';
    const consoleMessage = `${colorCode[level]}[${timestamp}] ${level}: ${message}${resetColor}`;
    
    console.log(consoleMessage);
    if (data) {
        console.log(colorCode[level] + JSON.stringify(data, null, 2) + resetColor);
    }
    
    // File output
    try {
        const logString = `[${timestamp}] ${level}: ${message}${data ? '\n' + JSON.stringify(data, null, 2) : ''}\n`;
        fs.appendFileSync(getLogFilename(), logString);
    } catch (error) {
        console.error('Failed to write to log file:', error);
    }
}

/**
 * Log error message
 * @param {string} message - Error message
 * @param {any} data - Additional error data
 */
function error(message, data = null) {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.ERROR) {
        writeLog('ERROR', message, data);
    }
}

/**
 * Log warning message
 * @param {string} message - Warning message
 * @param {any} data - Additional warning data
 */
function warn(message, data = null) {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.WARN) {
        writeLog('WARN', message, data);
    }
}

/**
 * Log info message
 * @param {string} message - Info message
 * @param {any} data - Additional info data
 */
function info(message, data = null) {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.INFO) {
        writeLog('INFO', message, data);
    }
}

/**
 * Log debug message
 * @param {string} message - Debug message
 * @param {any} data - Additional debug data
 */
function debug(message, data = null) {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.DEBUG) {
        writeLog('DEBUG', message, data);
    }
}

/**
 * Clean up old log files (older than 30 days)
 */
function cleanupOldLogs() {
    try {
        const files = fs.readdirSync(logsDir);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        files.forEach(file => {
            if (file.startsWith('bot-') && file.endsWith('.log')) {
                const filePath = path.join(logsDir, file);
                const stats = fs.statSync(filePath);
                
                if (stats.mtime < thirtyDaysAgo) {
                    fs.unlinkSync(filePath);
                    info(`Cleaned up old log file: ${file}`);
                }
            }
        });
    } catch (error) {
        error('Failed to cleanup old logs:', error);
    }
}

// Clean up old logs on startup
cleanupOldLogs();

// Clean up old logs daily
setInterval(cleanupOldLogs, 24 * 60 * 60 * 1000);

module.exports = {
    error,
    warn,
    info,
    debug,
    cleanupOldLogs
};
