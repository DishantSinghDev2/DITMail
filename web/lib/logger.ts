// /lib/logger.ts

import { createLogger, format, transports } from "winston";

// No more 'fs' or 'path' needed, as we are not interacting with the file system.

const logger = createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json() // Use JSON format so Vercel can parse it nicely
  ),
  defaultMeta: { service: "ditmail" },
  // --- MODIFICATION START ---
  // Remove the 'File' transports completely. They will cause a crash on Vercel.
  transports: [
    // The Console transport is all you need for Vercel.
    // It writes to stdout/stderr, which Vercel captures automatically.
    new transports.Console({
      format: format.combine(
        // In a serverless environment, structured JSON logs are often more useful
        // than simple colored text, even in non-production environments.
        format.timestamp(),
        format.json()
      ),
    }),
  ],
  // --- MODIFICATION END ---
});

// The logger functions remain the same.
export { logger };

export function logError(error: Error, context?: any) {
  logger.error(error.message, { // Pass the message directly for cleaner logging
    error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
    },
    context,
  });
}

export function logInfo(message: string, meta?: any) {
  logger.info(message, meta);
}

export function logWarning(message: string, meta?: any) {
  logger.warn(message, meta);
}