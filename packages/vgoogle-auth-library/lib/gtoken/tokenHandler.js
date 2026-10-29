"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenHandler = void 0;
const getToken_1 = require("./getToken");
const getCredentials_1 = require("./getCredentials");
/**
 * Manages the fetching and caching of access tokens.
 */
class TokenHandler {
    /** The cached access token. */
    token;
    /** The expiration time of the cached access token. */
    tokenExpiresAt;
    /** A promise for an in-flight token request. */
    inFlightRequest;
    tokenOptions;
    /**
     * Creates an instance of TokenHandler.
     * @param tokenOptions The options for fetching tokens.
     * @param transporter The transporter to use for making requests.
     */
    constructor(tokenOptions) {
        this.tokenOptions = tokenOptions;
    }
    /**
     * Processes the credentials, loading them from a key file if necessary.
     * This method is called before any token request.
     */
    async processCredentials() {
        if (!this.tokenOptions.key && !this.tokenOptions.keyFile) {
            throw new Error('No key or keyFile set.');
        }
        if (!this.tokenOptions.key && this.tokenOptions.keyFile) {
            const credentials = await (0, getCredentials_1.getCredentials)(this.tokenOptions.keyFile);
            this.tokenOptions.key = credentials.privateKey;
            this.tokenOptions.email = credentials.clientEmail;
            this.tokenOptions.iss ||= credentials.clientEmail;
        }
    }
    /**
     * Checks if the cached token is expired or close to expiring.
     * @returns True if the token is expiring, false otherwise.
     */
    isTokenExpiring() {
        if (!this.token || !this.tokenExpiresAt) {
            return true;
        }
        const now = new Date().getTime();
        const eagerRefreshThresholdMillis = this.tokenOptions.eagerRefreshThresholdMillis ?? 0;
        return this.tokenExpiresAt <= now + eagerRefreshThresholdMillis;
    }
    /**
     * Returns whether the token has completely expired.
     *
     * @returns true if the token has expired, false otherwise.
     */
    hasExpired() {
        const now = new Date().getTime();
        if (this.token && this.tokenExpiresAt) {
            const now = new Date().getTime();
            return now >= this.tokenExpiresAt;
        }
        return true;
    }
    /**
     * Fetches an access token, using a cached one if available and not expired.
     * @param forceRefresh If true, forces a new token to be fetched.
     * @returns A promise that resolves with the token data.
     */
    async getToken(forceRefresh) {
        // Forced refreshes also join an active exchange; no caller can clear another's flight.
        if (this.inFlightRequest) return this.inFlightRequest;
        if (!forceRefresh && this.token && !this.isTokenExpiring()) return this.token;
        const flight = (async () => {
            await this.processCredentials();
            const token = await (0, getToken_1.getToken)(this.tokenOptions);
            if (!token || typeof token !== 'object' || Array.isArray(token) ||
                !(typeof token.access_token === 'string' && token.access_token.length ||
                  typeof token.id_token === 'string' && token.id_token.length)) {
                throw new Error('Invalid token response');
            }
            const expires = token.expires_in === undefined ? 0 : token.expires_in;
            const expiration = Date.now() + expires * 1000;
            if (typeof expires !== 'number' || !Number.isFinite(expires) || expires < 0 ||
                !Number.isFinite(expiration) || expiration > Number.MAX_SAFE_INTEGER) {
                throw new Error('Invalid token expiry');
            }
            this.token = token;
            this.tokenExpiresAt = expiration;
            return token;
        })();
        this.inFlightRequest = flight;
        try { return await flight; }
        finally { if (this.inFlightRequest === flight) this.inFlightRequest = undefined; }
    }
}
exports.TokenHandler = TokenHandler;
