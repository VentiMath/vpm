'use strict';

const comparison = 'signing a token asynchronously when signing a token should return the same result as singing synchronously';
let previousNow;
exports.mochaHooks = {
    beforeEach() {
        if (this.currentTest.fullTitle() !== comparison) return;
        // Both tokens must have the same issue time for byte equality to be
        // meaningful. Scheduling and every other test retain their real clocks.
        previousNow = Date.now;
        Date.now = () => 1700000000000;
    },
    afterEach() {
        if (!previousNow) return;
        Date.now = previousNow;
        previousNow = undefined;
    },
};
