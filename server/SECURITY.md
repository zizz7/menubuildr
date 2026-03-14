# Security Design & Architecture

This document outlines the security architecture decisions and tradeoffs for the Menubuildr backend.

## Authentication & Authorization

### JWT Token Management (M3)
The system uses stateless JWT-based authentication. 
- **Secret Management**: `JWT_SECRET` is mandatory in all environments. Fallbacks are disabled to prevent weak signatures.
- **Revocation Tradeoff**: Currently, the system does not implement a blocklist (e.g., in Redis) for immediate token revocation on logout. 
  - **Tradeoff**: This choice simplifies the architecture and removes dependencies. 
  - **Risk**: A compromised token remains valid until its expiration (`JWT_EXPIRES_IN`).
  - **Mitigation**: Keep token expiration times reasonably low and use HTTPS to prevent interception.

### Ownership verification
Every resource-level access (Menus, Sections, Items, etc.) is protected by `verifyOwnership` middleware which ensures that the `adminId` associated with the resource matches the `userId` in the JWT.

## Input Validation & Sanitization

### Zod Schemas
All write endpoints (`POST`, `PUT`) use Zod for schema validation. This prevents:
- **Injection**: Type-safe parsing prevents raw SQL or parameter injection.
- **Mass Assignment**: Schemas define strictly allowed fields. `BulkItemUpdateSchema` specifically protects bulk operations.

### XSS Prevention (H4)
Custom CSS input is sanitized to strip `<style>` and `<script>` tags before injection into the generated menu HTML.

### Magic-Byte Verification (M2)
File uploads are verified using the `file-type` package (magic-byte check) to ensure MIME types match the physical file content, preventing extension-spoofing attacks.

## API Security

### Rate Limiting (H3)
Sensitive endpoints are rate-limited:
- `POST /api/auth/login`: Protects against brute-force attacks.
- `PUT /api/auth/password`: Prevents rapid password change attempts.

### Security Headers (L5)
The `helmet` middleware is used to set secure HTTP headers:
- `Content-Security-Policy`
- `X-Frame-Options`
- `Strict-Transport-Security`

## Data Safety

### Import Limits (M5)
Imported JSON data is capped to prevent resource exhaustion (Zip-bombs or memory overflow):
- Max Menus per Restaurant: 4
- Max Sections per Menu: 20
- Max Items per Section: 50
