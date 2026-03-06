export function successResponse(data: any, message?: string) {
  return {
    success: true,
    ...(message ? { message } : { data }),
    timestamp: new Date().toISOString(),
  };
}

export function errorResponse(
  code: string,
  message: string,
  details: any = null,
) {
  return {
    success: false,
    error: { code, message, details },
    timestamp: new Date().toISOString(),
  };
}
