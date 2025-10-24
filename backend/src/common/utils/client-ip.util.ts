import { Request } from 'express';

/**
 * Extracts the client IP address from an Express request object.
 *
 * Checks multiple sources in order of reliability:
 * 1. x-forwarded-for header (for requests behind proxies/load balancers)
 * 2. x-real-ip header (alternative proxy header)
 * 3. connection.remoteAddress (direct connection)
 * 4. socket.remoteAddress (fallback for direct connection)
 *
 * @param request - Express request object
 * @returns Client IP address as string, or 'unknown' if not found
 */
export function getClientIp(request: Request): string {
  // x-forwarded-for can contain multiple IPs, take the first one
  const forwardedFor = request.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    return ips.split(',')[0].trim();
  }

  return (
    (request.headers['x-real-ip'] as string) ||
    request.connection?.remoteAddress ||
    request.socket?.remoteAddress ||
    request.ip ||
    'unknown'
  );
}