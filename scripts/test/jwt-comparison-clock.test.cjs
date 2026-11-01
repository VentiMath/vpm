'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {mochaHooks} = require('../jwt-conformance/comparison-clock.cjs');
const context = {currentTest: {fullTitle: () => 'signing a token asynchronously when signing a token should return the same result as singing synchronously'}};

for (const [name, jwt] of [
    ['upstream', require('../consumers/node_modules/jsonwebtoken')],
    ['VPM', require('../../packages/vjsonwebtoken')],
]) test(`${name}: equal signing inputs need a shared issue time across a second boundary`, async () => {
    const originalNow = Date.now;
    try {
        for (const fixed of [false, true]) {
            let now = 1700000000999;
            const advancing = () => now;
            Date.now = advancing;
            if (fixed) mochaHooks.beforeEach.call(context);
            const asynchronous = await new Promise((resolve, reject) => {
                jwt.sign({foo: 'bar'}, 'fixture', {algorithm: 'HS256'}, (error, token) => error ? reject(error) : resolve(token));
            });
            now++;
            const synchronous = jwt.sign({foo: 'bar'}, 'fixture', {algorithm: 'HS256'});
            if (fixed) {
                assert.equal(asynchronous, synchronous);
                assert.equal(jwt.decode(asynchronous).iat, 1700000000);
                mochaHooks.afterEach.call(context);
                assert.equal(Date.now, advancing);
            } else {
                assert.notEqual(asynchronous, synchronous);
                assert.equal(jwt.decode(synchronous).iat - jwt.decode(asynchronous).iat, 1);
            }
        }
        const before = Date.now;
        mochaHooks.beforeEach.call({currentTest: {fullTitle: () => 'another test'}});
        assert.equal(Date.now, before);
        mochaHooks.afterEach.call(context);
        assert.equal(Date.now, before);
    } finally {mochaHooks.afterEach.call(context); Date.now = originalNow;}
});
