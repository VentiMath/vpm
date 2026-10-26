/**
 * Escape &, <, >, ", and ' for HTML text or quoted ordinary attribute values.
 * Preserves escape-html's `'' + value` conversion; Symbols throw TypeError.
 * Existing entities are escaped again. This is not a general HTML sanitizer.
 */
declare function escapeHtml(value?: unknown): string;

export = escapeHtml;
