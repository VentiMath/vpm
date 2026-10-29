'use strict';
const jws = require('vjws');
const {createPublicKey} = require('node:crypto');
exports.verifyToken = function verifyToken(token, certs, audience, issuers, maxExpiry, skew) {
    if (typeof token !== 'string' || token.length > 1024 * 1024 || token.split('.').length !== 3) {
        throw new Error('Wrong number of segments in token or invalid token size');
    }
    let decoded;
    try { decoded = jws.decode(token, {json: true}); } catch {}
    if (!decoded) throw new Error("Can't parse token envelope or payload");
    const {header, payload} = decoded;
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        throw new Error("Can't parse token payload");
    }
    if (!['RS256', 'ES256'].includes(header.alg)) throw new Error('Unsupported ID token algorithm');
    if (typeof header.kid !== 'string' || !header.kid || !certs ||
        !Object.prototype.hasOwnProperty.call(certs, header.kid)) throw new Error('No pem found for envelope');
    let verified = false;
    try {
        const cert = certs[header.kid];
        const key = cert && typeof cert === 'object' && typeof cert.kty === 'string'
            ? createPublicKey({key: cert, format: 'jwk'}) : cert;
        verified = jws.verify(token, header.alg, key);
    } catch {}
    if (!verified) throw new Error('Invalid token signature');
    if (payload.iat === undefined) throw new Error('No issue time in token');
    if (payload.exp === undefined) throw new Error('No expiration time in token');
    if (typeof payload.iat !== 'number' || !Number.isFinite(payload.iat)) throw new Error('iat field using invalid format');
    if (typeof payload.exp !== 'number' || !Number.isFinite(payload.exp)) throw new Error('exp field using invalid format');
    if (payload.exp <= payload.iat) throw new Error('Invalid token lifetime');
    if (typeof maxExpiry !== 'number' || !Number.isFinite(maxExpiry) || maxExpiry <= 0) throw new Error('Invalid maximum token lifetime');
    const now = Date.now() / 1000;
    if (payload.exp >= now + maxExpiry) throw new Error('Expiration time too far in future');
    if (now < payload.iat - skew) throw new Error('Token used too early');
    if (now > payload.exp + skew) throw new Error('Token used too late');
    if (issuers && !issuers.includes(payload.iss)) throw new Error('Invalid issuer');
    if (audience != null && !(Array.isArray(audience) ? audience.includes(payload.aud) : audience === payload.aud)) {
        throw new Error('Wrong recipient, payload audience != requiredAudience');
    }
    return {header, payload};
};
