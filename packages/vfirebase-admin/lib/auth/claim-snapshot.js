"use strict";
const {snapshotJson} = require('../utils/json-snapshot');
function detachClaims(value, depth = 0) {
    return snapshotJson(value, 'User record data must not contain cycles.', depth);
}
exports.detachClaims = detachClaims;
