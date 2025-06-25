import { NextResponse } from "next/server"
import { logError } from "./logger"
import { ZodError } from "zod"

export class AppError extends Error {
  statusCode: number
  isOperational: boolean

  constructor(message: string, statusCode = 500, isOperational = true) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = isOperational

    Error.captureStackTrace(this, this.constructor)
  }
}

export function handleError(error: any, context?: any) {
  logError(error, context)

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Validation error",
        details: error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
      },
      { status: 400 },
    )
  }

  if (error instanceof AppError) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode })
  }

  if (error.code === 11000) {
    return NextResponse.json({ error: "Duplicate entry. This record already exists." }, { status: 409 })
  }

  if (error.name === "ValidationError") {
    const messages = Object.values(error.errors).map((err: any) => err.message)
    return NextResponse.json({ error: "Validation error", details: messages }, { status: 400 })
  }

  // Default error response
  return NextResponse.json({ error: "Internal server error" }, { status: 500 })
}

export function asyncHandler(fn: Function) {
  return async (req: any, res?: any, params?: any) => {
    try {
      return await fn(req, res, params)
    } catch (error) {
      return handleError(error, { url: req.url, method: req.method })
    }
  }
}
