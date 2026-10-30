'use strict';
const Mime = require('./lib/Mime');
const mime = new Mime(require('./types/standard'));
Object.defineProperty(mime, 'Mime', { value: Mime, enumerable: true });
module.exports = mime._freeze();
