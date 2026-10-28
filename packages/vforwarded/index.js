'use strict';

// Derived from forwarded (MIT); see LICENSE and PROVENANCE.json.
module.exports = forwarded;
Object.freeze(forwarded);

function forwarded(request) {
  if (request === null || (typeof request !== 'object' && typeof request !== 'function')) {
    throw new TypeError('request must be an object');
  }
  const headers = request.headers;
  if (headers === null || typeof headers !== 'object') throw new TypeError('request.headers must be an object');
  // Node stores incoming headers as own, lowercase properties. An inherited
  // field must not add an address to the chain used by proxy trust decisions.
  const header = Object.hasOwn(headers, 'x-forwarded-for') ? headers['x-forwarded-for'] : undefined;
  if (header !== undefined && typeof header !== 'string') throw new TypeError('x-forwarded-for must be a string');
  const socket = request.socket ?? request.connection;
  if (socket === null || typeof socket !== 'object') throw new TypeError('request.socket or request.connection must be an object');
  const remoteAddress = socket.remoteAddress;
  if (remoteAddress !== undefined && typeof remoteAddress !== 'string') throw new TypeError('remoteAddress must be a string or undefined');
  const addresses = [remoteAddress];
  if (header === undefined) return addresses;

  // Native comma searches skip complete address spans. Trim HTTP OWS only;
  // address syntax and which hops to trust belong to the caller.
  let end = header.length;
  while (end > 0) {
    const last = header.charCodeAt(end - 1);
    if (last === 32 || last === 9 || last === 44) {
      end--;
      continue;
    }
    const comma = header.lastIndexOf(',', end - 1);
    let start = comma + 1;
    while (start < end) {
      const code = header.charCodeAt(start);
      if (code !== 32 && code !== 9) break;
      start++;
    }
    addresses.push(header.slice(start, end));
    end = comma;
  }
  return addresses;
}
