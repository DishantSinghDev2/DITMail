// /lib/logger.ts (or wherever your logger file is)

import { createLogger, format, transports } from "winston";
import fs from "fs";
import path from "path";

// --- START: MODIFICATION ---

// Define the directory for log files
const logDir = "logs";

// Check if the logs directory exists, and create it if it doesn't.
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// --- END: MODIFICATION ---


const logger = createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  defaultMeta: { service: "ditmail" },
  transports: [
    // Use path.join to create platform-independent file paths
    new transports.File({ filename: path.join(logDir, "error.log"), level: "error" }),
    new transports.File({ filename: path.join(logDir, "combined.log") }),
  ],
});

// The rest of the file remains the same...
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new transports.Console({
      format: format.combine(format.colorize(), format.simple()),
    }),
  );
}

export { logger };

export function logError(error: Error, context?: any) {
  logger.error("Application error", {
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