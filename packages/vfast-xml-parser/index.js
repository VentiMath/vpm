'use strict';
exports.XMLParser = require('./lib/xmlparser/XMLParser.js');
exports.XMLValidator = {validate: require('./lib/validator.js').validate};
exports.XMLBuilder = require('vfast-xml-builder');
