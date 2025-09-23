import winston from "winston";
import dotenv from "dotenv";

dotenv.config();

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        return `${timestamp} [${level.toUpperCase()}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
    })
);

// Create the Winston logger instance
const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
    format: logFormat,
    transports: [
        new winston.transports.Console(),  // Logs to console
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),  // Logs errors to a file
        new winston.transports.File({ filename: 'logs/combined.log' }) // Logs all levels to a file
    ]
});

// Asynchronous logging function (similar to Logtail)
export const logAsync = async (
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    context?: object
) => {
    logger.log(level, message, context);
};

export default logger;
