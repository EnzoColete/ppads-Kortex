type LogLevel = "info" | "warn" | "error" | "debug"

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: Record<string, any>
  userId?: string
  requestId?: string
  error?: {
    message: string
    stack?: string
    code?: string
  }
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === "development"

  private formatLog(entry: LogEntry): string {
    return JSON.stringify(entry, null, this.isDevelopment ? 2 : 0)
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(context && { context }),
      ...(error && {
        error: {
          message: error.message,
          stack: this.isDevelopment ? error.stack : undefined,
          code: (error as any).code,
        },
      }),
    }

    const formattedLog = this.formatLog(entry)

    switch (level) {
      case "error":
        console.error(formattedLog)
        break
      case "warn":
        console.warn(formattedLog)
        break
      case "debug":
        if (this.isDevelopment) {
          console.debug(formattedLog)
        }
        break
      default:
        console.log(formattedLog)
    }

    // In production, you could send logs to a service like Datadog, Sentry, etc.
    if (!this.isDevelopment) {
      this.sendToLogService(entry)
    }
  }

  private sendToLogService(entry: LogEntry) {
    // Placeholder for sending logs to external service
    // Example: Send to Vercel Analytics, Datadog, Sentry, etc.
  }

  info(message: string, context?: Record<string, any>) {
    this.log("info", message, context)
  }

  warn(message: string, context?: Record<string, any>) {
    this.log("warn", message, context)
  }

  error(message: string, error?: Error, context?: Record<string, any>) {
    this.log("error", message, context, error)
  }

  debug(message: string, context?: Record<string, any>) {
    this.log("debug", message, context)
  }

  // Specific logging methods for common scenarios
  logRequest(method: string, path: string, userId?: string, context?: Record<string, any>) {
    this.info("HTTP Request", {
      method,
      path,
      userId,
      ...context,
    })
  }

  logResponse(method: string, path: string, statusCode: number, duration: number, context?: Record<string, any>) {
    this.info("HTTP Response", {
      method,
      path,
      statusCode,
      duration: `${duration}ms`,
      ...context,
    })
  }

  logDatabaseQuery(operation: string, table: string, duration: number, context?: Record<string, any>) {
    this.debug("Database Query", {
      operation,
      table,
      duration: `${duration}ms`,
      ...context,
    })
  }

  logAuthentication(event: string, userId?: string, success = true, context?: Record<string, any>) {
    this.info("Authentication Event", {
      event,
      userId,
      success,
      ...context,
    })
  }

  logAuthorization(resource: string, action: string, userId?: string, allowed = true, context?: Record<string, any>) {
    this.info("Authorization Check", {
      resource,
      action,
      userId,
      allowed,
      ...context,
    })
  }

  logBusinessEvent(event: string, context?: Record<string, any>) {
    this.info("Business Event", {
      event,
      ...context,
    })
  }
}

export const logger = new Logger()
