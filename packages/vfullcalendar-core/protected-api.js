class JsonRequestError extends Error {
    constructor(message, response) {
        super(message);
        this.response = response;
    }
}
// Adds a query string to a URL ahead of any #fragment, which the browser never
// sends, with no separator left dangling when there is nothing to add.
function appendQuery(url, query) {
    if (!query) {
        return url;
    }
    const hashIndex = url.indexOf('#');
    const base = hashIndex === -1 ? url : url.slice(0, hashIndex);
    const fragment = hashIndex === -1 ? '' : url.slice(hashIndex);
    const separator = base.indexOf('?') === -1 ? '?' : /[?&]$/.test(base) ? '' : '&';
    return base + separator + query + fragment;
}
function requestJson(method, url, params) {
    method = method.toUpperCase();
    const fetchOptions = {
        method,
    };
    if (method === 'GET') {
        url = appendQuery(url, String(new URLSearchParams(params)));
    }
    else {
        fetchOptions.body = new URLSearchParams(params);
        fetchOptions.headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
        };
    }
    return fetch(url, fetchOptions).then((fetchRes) => {
        if (fetchRes.ok) {
            return fetchRes.json().then((parsedResponse) => {
                return [parsedResponse, fetchRes];
            }, () => {
                throw new JsonRequestError('Failure parsing JSON', fetchRes);
            });
        }
        else {
            throw new JsonRequestError('Request failed', fetchRes);
        }
    });
}
function identity(raw) {
    return raw;
}

export { JsonRequestError, identity, requestJson };
