'use strict';

// Derived from debug 4.4.3. Copyright (c) 2014-2017 TJ Holowaychuk,
// (c) 2018-2021 Josh Junon, and (c) 2026 VentiMath. MIT; see LICENSE.
/**
 * Detect Electron renderer / nwjs process, which is node, but we should
 * treat as a browser.
 */

if (typeof process === 'undefined' || process.type === 'renderer' || process.browser === true || process.__nwjs) {
	module.exports = require('./browser.js');
} else {
	module.exports = require('./node.js');
}
