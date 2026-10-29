'use strict';
const {createPrivateKey} = require('node:crypto');
// Private material lives only as long as its owning credential object. Mutable
// byte views are parsed on every call; string keys are immutable and safe to reuse.
const keys = new WeakMap();
exports.signingKey = function signingKey(owner, key) {
    if (typeof key !== 'string') return key;
    const previous = keys.get(owner);
    if (previous?.source === key) return previous.parsed;
    const parsed = createPrivateKey(key);
    keys.set(owner, {source: key, parsed});
    return parsed;
};
