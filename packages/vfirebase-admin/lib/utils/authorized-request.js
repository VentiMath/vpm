'use strict';

const {ApplicationDefaultCredential} = require('../app/credential-internal');
const {getMetricsHeader} = require('./index');

// Operation builders own their request bodies. This boundary captures transport
// options and headers before token acquisition, then supplies protected headers
// once. Header spelling cannot override the acquired credential or quota policy.
function captureRequest(input) {
    const request = {...input};
    const source = request.headers;
    const headers = Object.create(null);
    let quota, metrics, quotaPresent = false;
    for (const name of Object.keys(source || {})) {
        let value = source[name];
        if (Array.isArray(value)) value = value.slice();
        switch (name.toLowerCase()) {
            case 'authorization': break;
            case 'x-goog-user-project': quota = value; quotaPresent = true; break;
            case 'x-goog-api-client': metrics = value; break;
            default: headers[name] = value;
        }
    }
    request.headers = headers;
    return {request, quota, metrics, quotaPresent};
}

function authorizeRequest(captured, app, token, useAgent) {
    // Reading options after acquisition preserves the app's deletion check.
    const options = app.options;
    let quota = captured.quota, quotaPresent = captured.quotaPresent;
    if (!quota) {
        const credential = options.credential;
        const credentialQuota = credential instanceof ApplicationDefaultCredential
            ? credential.getQuotaProjectId() : undefined;
        const configured = process.env.GOOGLE_CLOUD_QUOTA_PROJECT || credentialQuota;
        if (typeof configured === 'string' && configured.length) {quota = configured; quotaPresent = true;}
    }
    const request = captured.request;
    request.headers.Authorization = `Bearer ${token}`;
    request.headers['X-Goog-Api-Client'] = captured.metrics || getMetricsHeader();
    if (quotaPresent) request.headers['x-goog-user-project'] = quota;
    if (useAgent && !request.httpAgent && options.httpAgent) request.httpAgent = options.httpAgent;
    return request;
}

module.exports = {captureRequest, authorizeRequest};
