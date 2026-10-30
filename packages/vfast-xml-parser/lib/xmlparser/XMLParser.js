'use strict';
const {buildOptions} = require('./OptionsBuilder.js');
const OrderedObjParser = require('./OrderedObjParser.js');
const prettify = require('./node2json.js');
const {validate} = require('../validator.js');
const XmlNode = require('./xmlNode.js');
const {name: isName} = require('vxml-naming');
const utf8 = new TextDecoder('utf-8', {ignoreBOM:true});

class XMLParser {
  #options;
  #entities = Object.create(null);
  #parser;
  #active = false;
  constructor(options) { this.#options = buildOptions(options); }
  get options() { return this.#options; }
  get externalEntities() { return Object.freeze({...this.#entities}); }
  parse(xmlData, validationOption) {
    if (typeof xmlData !== 'string') {
      if (!(xmlData instanceof Uint8Array)) throw new TypeError('XML data must be a string or Uint8Array');
      xmlData = typeof Buffer !== 'undefined' && Buffer.isBuffer(xmlData) ? xmlData.toString('utf8') : utf8.decode(xmlData);
    }
    if (this.#active) throw new Error('XMLParser cannot be reentered during parsing');
    if (validationOption) {
      const result = validate(xmlData, validationOption === true ? {} : validationOption);
      if (result !== true) throw new Error(`${result.err.msg}:${result.err.line}:${result.err.col}`);
    }
    this.#active = true;
    let parser;
    try {
      parser = this.#parser ??= new OrderedObjParser(this.#options, this.#entities);
      const ordered = parser.parseXml(xmlData);
      return this.#options.preserveOrder || ordered === undefined ? ordered : prettify(ordered, this.#options, parser.matcher, parser.readonlyMatcher);
    } finally {
      this.#active = false;
      // Keep compiled expressions/decoder configuration, never a previous document.
      if (parser) {
        parser.tagsNodeStack.length = 0;
        parser.currentNode = null;
        parser.matcher.reset();
        if (!this.#options.entityDecoder) parser.entityDecoder.reset();
      }
    }
  }
  addEntity(key, value) {
    if (this.#active) throw new Error('Cannot register entities during parsing');
    if (typeof key !== 'string' || typeof value !== 'string') throw new TypeError('Entity names and values must be strings');
    if (value.includes('&')) throw new Error("Entity value can't have '&'");
    if (key.includes('&') || key.includes(';')) throw new Error("An entity must be set without '&' and ';'. Eg. use '#xD' for '&#xD;'");
    if (!isName(key)) throw new TypeError('Invalid entity name: ' + key);
    this.#entities[key] = value;
    this.#parser = undefined;
  }
  static getMetaDataSymbol() { return XmlNode.getMetaDataSymbol(); }
}
module.exports = XMLParser;
