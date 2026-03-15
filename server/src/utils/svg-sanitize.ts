/**
 * SVG sanitization utility — strips executable content from SVG before storage.
 * Removes: <script> tags, on* event-handler attributes, javascript: URIs.
 * Leaves valid SVG structure intact.
 */
export function sanitizeSvg(content: string): string {
  return content
    // Remove <script>...</script> blocks (case-insensitive, multiline)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    // Remove standalone <script .../> self-closing tags
    .replace(/<script[^>]*\/>/gi, '')
    // Remove on* event handler attributes (e.g. onclick, onload, onerror)
    .replace(/\s+on[a-z][a-z0-9]*\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '')
    // Remove javascript: URIs in href and xlink:href attributes
    .replace(/(href|xlink:href)\s*=\s*["']?\s*javascript:[^"'\s>]*/gi, '')
    // Remove javascript: in any attribute value
    .replace(/javascript\s*:/gi, '');
}
