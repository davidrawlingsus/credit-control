const winston = require('winston');
const path = require('path');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Tell winston that you want to link the colors
winston.addColors(colors);

// Define which level to log based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'warn';
};

// Define different log formats
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Define transports
const transports = [
  // Console transport
  new winston.transports.Console({
    format: logFormat,
  }),
];

// Add file transport in production
if (process.env.NODE_ENV === 'production') {
  transports.push(
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/error.log'),
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/combined.log'),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),
  );
}

// Create the logger
const logger = winston.createLogger({
  level: level(),
  levels,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  transports,
  // Don't exit on error
  exitOnError: false,
});

// Create a stream object for Morgan
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  },
};

// Add custom methods for structured logging
logger.logInvoice = (level, message, invoiceData) => {
  logger.log(level, message, {
    invoice_id: invoiceData.id,
    stripe_invoice_id: invoiceData.stripe_invoice_id,
    customer_email: invoiceData.customer_email,
    amount: invoiceData.amount,
    overdue_days: invoiceData.overdue_days,
  });
};

logger.logEmail = (level, message, emailData) => {
  logger.log(level, message, {
    email_id: emailData.id,
    invoice_id: emailData.invoice_id,
    status: emailData.status,
    sent_to: emailData.sent_to,
  });
};

logger.logStripe = (level, message, stripeData) => {
  logger.log(level, message, {
    event_type: stripeData.type,
    stripe_invoice_id: stripeData.data?.object?.id,
    customer_id: stripeData.data?.object?.customer,
  });
};

// Export the logger
module.exports = { logger };
