"use strict";
// Copyright 2015 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.JWTAccess = void 0;
const jws = require("vjws");
const { signingKey } = require("../signing-key");
const credentials = new WeakMap();
const DEFAULT_HEADER = {
    alg: 'RS256',
    typ: 'JWT',
};
class JWTAccess {
    email;
    key;
    keyId;
    projectId;
    eagerRefreshThresholdMillis;
    cache = new Map();
    /**
     * JWTAccess service account credentials.
     *
     * Create a new access token by using the credential to create a new JWT token
     * that's recognized as the access token.
     *
     * @param email the service account email address.
     * @param key the private key that will be used to sign the token.
     * @param keyId the ID of the private key used to sign the token.
     */
    constructor(email, key, keyId, eagerRefreshThresholdMillis) {
        this.email = email;
        this.key = key;
        this.keyId = keyId;
        this.eagerRefreshThresholdMillis =
            eagerRefreshThresholdMillis ?? 5 * 60 * 1000;
    }
    /**
     * Ensures that we're caching a key appropriately, giving precedence to scopes vs. url
     *
     * @param url The URI being authorized.
     * @param scopes The scope or scopes being authorized
     * @returns A string that returns the cached key.
     */
    getCachedKey(url, scopes) {
        const scope = Array.isArray(scopes) ? scopes.join(' ') : scopes;
        if (!url && !scope) throw new Error('Scopes or url must be provided');
        // Distinct prefixes separate simple URL keys from scope tuples.
        return scope ? 's' + JSON.stringify([url || null, scope]) : 'u' + url;
    }

    /**
     * Get a non-expired access token, after refreshing if necessary.
     *
     * @param url The URI being authorized.
     * @param additionalClaims An object with a set of additional claims to
     * include in the payload.
     * @returns An object that includes the authorization header.
     */
    getRequestHeaders(url, additionalClaims, scopes) {
        if (Array.isArray(scopes)) scopes = scopes.join(' ');
        let claims;
        let claimsKey = '';
        if (additionalClaims !== undefined && additionalClaims !== null) {
            if (typeof additionalClaims !== 'object' || Array.isArray(additionalClaims)) {
                throw new TypeError('Additional claims must be an object');
            }
            // Sign the same snapshot that identifies this cache entry.
            claimsKey = JSON.stringify(additionalClaims);
            claims = JSON.parse(claimsKey);
            if (!claims || typeof claims !== 'object' || Array.isArray(claims)) {
                throw new TypeError('Additional claims must serialize to an object');
            }
            const reserved = ['iss', 'sub', 'exp', 'iat', scopes ? 'scope' : 'aud'];
            for (const claim of reserved) {
                if (Object.prototype.hasOwnProperty.call(claims, claim)) {
                    throw new Error(`The '${claim}' property is not allowed when passing additionalClaims. This claim is included in the JWT by default.`);
                }
            }
        }
        const previous = credentials.get(this);
        if (!previous || previous.email !== this.email || previous.key !== this.key || previous.keyId !== this.keyId || ArrayBuffer.isView(this.key)) {
            this.cache.clear();
            credentials.set(this, {email: this.email, key: this.key, keyId: this.keyId});
        }
        const baseKey = this.getCachedKey(url, scopes);
        const key = claimsKey ? 'c' + JSON.stringify([baseKey, claimsKey]) : baseKey;
        const cachedToken = this.cache.get(key);
        const now = Date.now();
        if (cachedToken && cachedToken.expiration - now > this.eagerRefreshThresholdMillis) {
            this.cache.delete(key);
            this.cache.set(key, cachedToken);
            return new Headers(cachedToken.headers);
        }
        const iat = Math.floor(now / 1000);
        const exp = JWTAccess.getExpirationTime(iat);
        const payload = scopes
            ? {iss: this.email, sub: this.email, scope: scopes, exp, iat, ...claims}
            : {iss: this.email, sub: this.email, aud: url, exp, iat, ...claims};
        const header = this.keyId ? {...DEFAULT_HEADER, kid: this.keyId} : DEFAULT_HEADER;
        const signedJWT = jws.sign({header, payload, secret: signingKey(this, this.key)});
        const authorization = `Bearer ${signedJWT}`;
        // Never expose the cached container to the caller, even on the first miss.
        const headers = new Headers({authorization});
        this.cache.delete(key);
        this.cache.set(key, {expiration: exp * 1000, headers});
        if (this.cache.size > 500) this.cache.delete(this.cache.keys().next().value);
        return new Headers(headers);
    }

    /**
     * Returns an expiration time for the JWT token.
     *
     * @param iat The issued at time for the JWT.
     * @returns An expiration time for the JWT.
     */
    static getExpirationTime(iat) {
        const exp = iat + 3600; // 3600 seconds = 1 hour
        return exp;
    }
    /**
     * Create a JWTAccess credentials instance using the given input options.
     * @param json The input object.
     */
    fromJSON(json) {
        if (!json) {
            throw new Error('Must pass in a JSON object containing the service account auth settings.');
        }
        if (!json.client_email) {
            throw new Error('The incoming JSON object does not contain a client_email field');
        }
        if (!json.private_key) {
            throw new Error('The incoming JSON object does not contain a private_key field');
        }
        // Extract the relevant information from the json key file.
        this.email = json.client_email;
        this.key = json.private_key;
        this.keyId = json.private_key_id;
        this.projectId = json.project_id;
    }
    fromStream(inputStream, callback) {
        if (callback) {
            this.fromStreamAsync(inputStream).then(() => callback(), callback);
        }
        else {
            return this.fromStreamAsync(inputStream);
        }
    }
    fromStreamAsync(inputStream) {
        return new Promise((resolve, reject) => {
            if (!inputStream) {
                reject(new Error('Must pass in a stream containing the service account auth settings.'));
            }
            let s = '';
            inputStream
                .setEncoding('utf8')
                .on('data', chunk => (s += chunk))
                .on('error', reject)
                .on('end', () => {
                try {
                    const data = JSON.parse(s);
                    this.fromJSON(data);
                    resolve();
                }
                catch (err) {
                    reject(err);
                }
            });
        });
    }
}
exports.JWTAccess = JWTAccess;
