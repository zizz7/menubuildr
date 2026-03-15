/**
 * Structured audit logging utility.
 * Writes a JSON log entry for every security-relevant event.
 */
export function auditLog(
  event: string,
  userId: string | null,
  ip: string,
  meta?: Record<string, unknown>
): void {
  const entry = {
    event,
    timestamp: new Date().toISOString(),
    userId,
    ip,
    ...meta,
  };
  console.log(JSON.stringify(entry));
}
