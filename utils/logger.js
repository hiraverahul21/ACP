const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// Colors for console output
const COLORS = {
  ERROR: '\x1b[31m', // Red
  WARN: '\x1b[33m',  // Yellow
  INFO: '\x1b[36m',  // Cyan
  DEBUG: '\x1b[35m', // Magenta
  RESET: '\x1b[0m'   // Reset
};

class Logger {
  constructor() {
    this.logLevel = process.env.LOG_LEVEL || 'INFO';
    this.logToFile = process.env.LOG_TO_FILE === 'true';
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level}] ${message}${metaStr}`;
  }

  shouldLog(level) {
    return LOG_LEVELS[level] <= LOG_LEVELS[this.logLevel];
  }

  writeToFile(level, formattedMessage) {
    if (!this.logToFile) return;

    const logFile = path.join(logsDir, `${new Date().toISOString().split('T')[0]}.log`);
    const errorLogFile = path.join(logsDir, `error-${new Date().toISOString().split('T')[0]}.log`);

    // Write to general log file
    fs.appendFileSync(logFile, formattedMessage + '\n');

    // Write errors to separate error log file
    if (level === 'ERROR') {
      fs.appendFileSync(errorLogFile, formattedMessage + '\n');
    }
  }

  log(level, message, meta = {}) {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(level, message, meta);
    
    // Console output with colors
    if (process.env.NODE_ENV !== 'test') {
      const color = COLORS[level] || COLORS.RESET;
      console.log(`${color}${formattedMessage}${COLORS.RESET}`);
    }

    // File output
    this.writeToFile(level, formattedMessage);
  }

  error(message, meta = {}) {
    this.log('ERROR', message, meta);
  }

  warn(message, meta = {}) {
    this.log('WARN', message, meta);
  }

  info(message, meta = {}) {
    this.log('INFO', message, meta);
  }

  debug(message, meta = {}) {
    this.log('DEBUG', message, meta);
  }

  // HTTP request logging
  logRequest(req, res, responseTime) {
    const { method, url, ip, headers } = req;
    const { statusCode } = res;
    
    const logData = {
      method,
      url,
      ip,
      statusCode,
      responseTime: `${responseTime}ms`,
      userAgent: headers['user-agent']
    };

    const level = statusCode >= 400 ? 'ERROR' : 'INFO';
    this.log(level, `${method} ${url} ${statusCode}`, logData);
  }

  // Database query logging
  logQuery(query, params, duration) {
    this.debug('Database Query', {
      query,
      params,
      duration: `${duration}ms`
    });
  }

  // Authentication logging
  logAuth(action, email, success, reason = null) {
    const level = success ? 'INFO' : 'WARN';
    const message = `Auth ${action}: ${email} - ${success ? 'SUCCESS' : 'FAILED'}`;
    const meta = { action, email, success };
    
    if (reason) {
      meta.reason = reason;
    }

    this.log(level, message, meta);
  }

  // Security logging
  logSecurity(event, details) {
    this.log('WARN', `Security Event: ${event}`, details);
  }
}

// Create singleton instance
const logger = new Logger();

module.exports = {
  logger,
  Logger
};