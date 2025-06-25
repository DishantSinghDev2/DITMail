import * as Sentry from "@sentry/nextjs"

export function initSentry() {
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
      beforeSend(event) {
        // Filter out sensitive data
        if (event.request?.data) {
          delete event.request.data.password
          delete event.request.data.password_hash
        }
        return event
      },
    })
  }
}

export function captureError(error: Error, context?: any) {
  if (process.env.SENTRY_DSN) {
    Sentry.withScope((scope) => {
      if (context) {
        scope.setContext("additional", context)
      }
      Sentry.captureException(error)
    })
  }
  console.error("Error captured:", error, context)
}

export function captureMessage(message: string, level: "info" | "warning" | "error" = "info") {
  if (process.env.SENTRY_DSN) {
    Sentry.captureMessage(message, level)
  }
  console.log(`[${level.toUpperCase()}] ${message}`)
}
