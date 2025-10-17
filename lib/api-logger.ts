import { logger } from "./logger"
import { getCurrentUser } from "./auth"

export async function logApiRequest(request: Request) {
  const startTime = Date.now()
  const method = request.method
  const url = new URL(request.url)
  const path = url.pathname

  try {
    const user = await getCurrentUser()
    logger.logRequest(method, path, user?.id, {
      query: Object.fromEntries(url.searchParams),
      headers: {
        userAgent: request.headers.get("user-agent"),
        referer: request.headers.get("referer"),
      },
    })

    return { startTime, userId: user?.id }
  } catch (error) {
    logger.error("Error logging API request", error as Error, { method, path })
    return { startTime, userId: undefined }
  }
}

export function logApiResponse(
  method: string,
  path: string,
  statusCode: number,
  startTime: number,
  context?: Record<string, any>,
) {
  const duration = Date.now() - startTime
  logger.logResponse(method, path, statusCode, duration, context)
}

export function logApiError(method: string, path: string, error: Error, context?: Record<string, any>) {
  logger.error(`API Error: ${method} ${path}`, error, context)
}
