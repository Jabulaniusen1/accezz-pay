export class AppError extends Error {
  status: number
  context?: Record<string, unknown>

  constructor(message: string, status = 400, context?: Record<string, unknown>) {
    super(message)
    this.name = "AppError"
    this.status = status
    this.context = context
  }
}

export function assert(condition: unknown, message: string, status = 400): asserts condition {
  if (!condition) {
    throw new AppError(message, status)
  }
}

