export function logInfo(event: string, data?: Record<string, any>) {
  console.log(
    JSON.stringify({
      level: "info",
      event,
      timestamp: new Date().toISOString(),
      ...data,
    })
  );
}

export function logError(event: string, error: any, data?: Record<string, any>) {
  console.error(
    JSON.stringify({
      level: "error",
      event,
      timestamp: new Date().toISOString(),
      message: error?.message,
      stack: error?.stack,
      ...data,
    })
  );
}