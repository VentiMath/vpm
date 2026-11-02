/** Read the configured nonce, otherwise the bundler's nonce if available. */
export function getNonce(): string | undefined;
/** Configure a nonce; undefined or an empty string restores bundler fallback. */
export function setNonce(nonce: string | undefined): void;
