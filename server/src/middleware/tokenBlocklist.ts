/**
 * In-memory token blocklist — invalidates JWTs on logout.
 * Keyed on the token's `jti` (JWT ID) claim.
 *
 * Note: This is an in-memory Set. In a multi-instance deployment,
 * replace with a shared store (e.g., Redis) for cross-instance invalidation.
 */
const tokenBlocklist = new Set<string>();

export function addToBlocklist(jti: string): void {
  tokenBlocklist.add(jti);
}

export function isBlocklisted(jti: string): boolean {
  return tokenBlocklist.has(jti);
}
