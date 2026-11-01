'use strict';

const {createHash} = require('node:crypto');

// JSON descriptors are mutable inputs. Recompute their identity on every call,
// but retain only a fixed-size key and the compiled result, not the JSON text.
// A scope owns the compiler: stubs from two gRPC implementations cannot mix.
class JsonProtoCache {
    #scopes = new WeakMap();

    clear() {
        this.#scopes = new WeakMap();
    }

    load(scope, descriptor, refresh, compile) {
        const text = JSON.stringify(descriptor);
        const key = createHash('sha256').update(text).digest('hex');
        let entries = this.#scopes.get(scope);
        if (!refresh && entries?.has(key)) return entries.get(key);

        // Compile the same snapshot used for identity. Accessors, toJSON and
        // later input mutations must not put different data under that key.
        const result = compile(JSON.parse(text));
        if (!entries) this.#scopes.set(scope, entries = new Map());
        entries.set(key, result);
        return result;
    }
}

module.exports = {JsonProtoCache};
