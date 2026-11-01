'use strict';

const {FirebaseAppError, AppErrorCode} = require('../app/error');

// Source-informed response contract; parsing state belongs to this response,
// independently of mutable low-level transport records and public properties.
class HttpResponse {
    #value;
    #failure;
    constructor(input) {
        const {status, headers, data, config} = input;
        this.status = status;
        this.text = data;
        this.config = config;
        const owned = {...headers};
        for (const name of Object.keys(owned)) {
            if (Array.isArray(owned[name])) owned[name] = owned[name].slice();
        }
        this.headers = owned;
        try {
            if (!data) throw new FirebaseAppError({code: AppErrorCode.INTERNAL_ERROR, message: 'HTTP response missing data.'});
            this.#value = JSON.parse(data);
        } catch (error) {this.#failure = error;}
    }
    isJson() {return this.#failure === undefined;}
    get data() {
        if (this.isJson()) return this.#value;
        throw new FirebaseAppError({code: AppErrorCode.UNABLE_TO_PARSE_RESPONSE,
            message: 'Error while parsing response data', cause: this.#failure,
            httpResponse: {status: this.status, headers: this.headers, data: this.text}});
    }
}

// Native Error construction preserves subclasses on the supported runtimes.
class RequestResponseError extends Error {
    constructor(response) {
        super(`Server responded with status ${response.status}.`);
        this.response = response;
    }
}

exports.HttpResponse = HttpResponse;
exports.RequestResponseError = RequestResponseError;
