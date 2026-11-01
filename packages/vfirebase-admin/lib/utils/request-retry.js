'use strict';

const {FirebaseAppError, AppErrorCode} = require('../app/error');
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthNumbers = Object.fromEntries(months.map((name, index) => [name.toLowerCase(), index]));
const weekday = '(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)';
const month = '(' + months.join('|') + ')';
const time = '(\\d{2}):(\\d{2}):(\\d{2})';
const modern = new RegExp('^' + weekday + ', (\\d{2}) ' + month + ' (\\d{4}) ' + time + ' GMT$', 'i');
const obsolete = new RegExp('^(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), (\\d{2})-' + month + '-(\\d{2}) ' + time + ' GMT$', 'i');
const asctime = new RegExp('^' + weekday + ' ' + month + ' ([ \\d]\\d) ' + time + ' (\\d{4})$', 'i');

function defaultRetryConfig() {
    return {maxRetries: 4, statusCodes: [503], ioErrorCodes: ['ECONNRESET', 'ETIMEDOUT'], backOffFactor: 0.5, maxDelayInMillis: 60000};
}

const defaultPolicy = Object.freeze({...defaultRetryConfig(), statusCodes: Object.freeze([503]), ioErrorCodes: Object.freeze(['ECONNRESET', 'ETIMEDOUT'])});

function invalid(message) { throw new FirebaseAppError({code: AppErrorCode.INVALID_ARGUMENT, message}); }
function nonnegativeInteger(value) { return Number.isSafeInteger(value) && value >= 0; }

class RetryPolicy {
    constructor(input) {
        if (input === undefined) { this.retry = defaultPolicy; return; }
        if (!input) return;
        const {maxRetries, backOffFactor, maxDelayInMillis, statusCodes, ioErrorCodes} = input;
        if (!nonnegativeInteger(maxRetries)) invalid('maxRetries must be a non-negative integer');
        if (backOffFactor !== undefined && (!Number.isFinite(backOffFactor) || backOffFactor < 0)) invalid('backOffFactor must be a non-negative number');
        if (!nonnegativeInteger(maxDelayInMillis)) invalid('maxDelayInMillis must be a non-negative integer');
        if (statusCodes !== undefined && !Array.isArray(statusCodes)) invalid('statusCodes must be an array');
        if (ioErrorCodes !== undefined && !Array.isArray(ioErrorCodes)) invalid('ioErrorCodes must be an array');
        const retry = {maxRetries, maxDelayInMillis};
        if (backOffFactor !== undefined) retry.backOffFactor = backOffFactor;
        if (statusCodes !== undefined) retry.statusCodes = Object.freeze(statusCodes.slice());
        if (ioErrorCodes !== undefined) retry.ioErrorCodes = Object.freeze(ioErrorCodes.slice());
        this.retry = Object.freeze(retry);
    }

    async waitForRetry(delay) {
        if (!Number.isFinite(delay)) throw RangeError('Retry delay must be finite');
        // Native timers overflow above this range. Preserve a configured long
        // wait by scheduling bounded segments, rather than silently waiting 1ms.
        while (delay > 0) {
            const segment = Math.min(delay, 0x7fffffff);
            await new Promise(resolve => setTimeout(resolve, segment));
            delay -= segment;
        }
    }

    isRetryEligible(attempt, error) {
        if (!this.retry || !nonnegativeInteger(attempt) || attempt >= this.retry.maxRetries) return false;
        return error.response ? !!this.retry.statusCodes?.includes(error.response.status)
            : !!this.retry.ioErrorCodes?.includes(error.code);
    }

    getRetryDelayMillis(attempt, error) {
        if (!this.isRetryEligible(attempt, error)) return [0, false];
        const headers = error.response?.headers;
        if (headers) {
            const key = Object.hasOwn(headers, 'retry-after') ? 'retry-after' : Object.keys(headers).find(key => key.toLowerCase() === 'retry-after');
            const delay = this.parseRetryAfterIntoMillis(key === undefined ? undefined : headers[key]);
            if (delay >= 0) return [delay, true];
        }
        return [this.backOffDelayMillis(attempt), true];
    }

    parseRetryAfterIntoMillis(value) {
        if (typeof value !== 'string') return -1;
        const text = value.replace(/^[\t ]+|[\t ]+$/g, '');
        if (/^\d+$/.test(text)) {
            const millis = Number(text) * 1000;
            // An enormous valid delay must exceed the retry budget, never fall
            // back to an immediate attempt or reach an overflowing native timer.
            return Number.isSafeInteger(millis) ? millis : Infinity;
        }
        let fields = modern.exec(text), legacy = false;
        if (!fields) {fields = obsolete.exec(text); legacy = !!fields;}
        if (!fields) {
            const old = asctime.exec(text);
            if (!old) return -1;
            fields = [old[0], old[2], old[1], old[6], old[3], old[4], old[5]];
        }
        const now = Date.now();
        let year = Number(fields[3]);
        if (legacy) {
            const current = new Date(now).getUTCFullYear();
            year += Math.floor(current / 100) * 100;
            if (year > current + 50) year -= 100;
        }
        const day = Number(fields[1]), monthIndex = monthNumbers[fields[2].toLowerCase()];
        const hour = Number(fields[4]), minute = Number(fields[5]), second = Number(fields[6]);
        if (hour > 23 || minute > 59 || second > 60 || day < 1) return -1;
        const date = new Date(0);
        date.setUTCFullYear(year, monthIndex, day);
        date.setUTCHours(hour, minute, Math.min(second, 59), 0);
        if (date.getUTCFullYear() !== year || date.getUTCMonth() !== monthIndex || date.getUTCDate() !== day) return -1;
        return date.getTime() + (second === 60 ? 1000 : 0) - now;
    }

    backOffDelayMillis(attempt) {
        if (attempt === 0) return 0;
        if (!this.retry) throw new FirebaseAppError({code: AppErrorCode.INTERNAL_ERROR, message: 'Expected this.retry to exist.'});
        const factor = this.retry.backOffFactor || 0;
        return factor === 0 ? 0 : Math.min(2 ** attempt * factor * 1000, this.retry.maxDelayInMillis);
    }
}

module.exports = {RetryPolicy, defaultRetryConfig};
