// The connector needs one operation: send form parameters and return JSON plus
// its response. Keep URL construction separate from response/error ownership.
export class JsonRequestError extends Error {
  constructor(message, response) {
    super(message);
    this.response = response;
  }
}

export const identity = value => value;

const withoutFragment = url => url.split('#', 1)[0];

function requestTarget(url, parameters) {
  const address = withoutFragment(url);
  const encoded = parameters.toString();
  if (encoded.length === 0) return address;
  const last = address.at(-1);
  const join = !address.includes('?') ? '?' : last === '?' || last === '&' ? '' : '&';
  return address + join + encoded;
}

async function receive(url, options) {
  // Network failures retain their original identity. Only HTTP status and JSON
  // decoding failures become JsonRequestError, each carrying the real response.
  const response = await fetch(url, options);
  if (!response.ok) throw new JsonRequestError('Request failed', response);
  let value;
  try { value = await response.json(); }
  catch { throw new JsonRequestError('Failure parsing JSON', response); }
  return [value, response];
}

export function requestJson(method, url, parameters) {
  const verb = method.toUpperCase();
  const form = new URLSearchParams(parameters);
  if (verb === 'GET') return receive(requestTarget(url, form), {method: verb});
  return receive(withoutFragment(url), {
    method: verb,
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: form,
  });
}
