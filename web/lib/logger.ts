import { createLogger, format, transports } from "winston"

const logger = createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: format.combine(format.timestamp(), format.errors({ stack: true }), format.json()),
  defaultMeta: { service: "ditmail" },
  transports: [
    new transports.File({ filename: "logs/error.log", level: "error" }),
    new transports.File({ filename: "logs/combined.log" }),
  ],
})

if (process.env.NODE_ENV !== "production") {
  logger.add(
    new transports.Console({
      format: format.combine(format.colorize(), format.simple()),
    }),
  )
}

export { logger }

export function logError(error: Error, context?: any) {
  logger.error("Application error", {
    error: error.message,
    stack: error.stack,
    context,
  })
}

export function logInfo(message: string, meta?: any) {
  logger.info(message, meta)
}

export function logWarning(message: string, meta?: any) {
  logger.warn(message, meta)
}
