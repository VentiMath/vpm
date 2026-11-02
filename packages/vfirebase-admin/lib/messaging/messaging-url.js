'use strict';
// FCM image references are absolute HTTP(S) URLs. Let the platform parse URL
// structure; check raw controls/whitespace before URL can silently discard them.
function isImageURL(value) {
  if (typeof value !== 'string' || value.length === 0) return false;
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code <= 32 || code === 127 || code > 126 || value[i] === '\\') return false;
  }
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    if (!url.hostname) return false;
    if (url.hostname[0] === '[') return true; // URL already validated the IPv6 address.
    return url.hostname.split('.').every(label => /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label));
  } catch {return false;}
}
exports.isImageURL = isImageURL;
