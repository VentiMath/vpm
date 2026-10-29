'use strict'
// Derived from body-parser, © 2014 Jonathan Ong, © 2014–2015 Douglas Christopher Wilson.
// VPM modifications © 2026 VentiMath. MIT licensed; see LICENSE.
const debug = require('vdebug')('body-parser:json')
const read = require('../read')
const { normalizeOptions, optionsObject } = require('../utils')
const firstNonWhitespace = /[^\x20\x09\x0a\x0d]/

module.exports = function json (options) {
  options = optionsObject(options)
  const normalized = normalizeOptions(options, 'application/json')
  const { reviver: requestedReviver, strict: requestedStrict } = options
  // As in body-parser: strict unless exactly false; JSON.parse ignores a
  // non-function reviver.
  const strict = requestedStrict !== false
  const reviver = typeof requestedReviver === 'function' ? requestedReviver : undefined
  const isValidCharset = charset => charset.startsWith('utf-')
  if (!isValidCharset(normalized.defaultCharset)) throw new TypeError('JSON defaultCharset must be a UTF charset')
  const readOptions = { ...normalized, isValidCharset }
  function parse (body) {
    if (!body.length) return {}
    if (strict && body[0] !== '{' && body[0] !== '[') {
      const index = body.search(firstNonWhitespace)
      if (body[index] !== '{' && body[index] !== '[') {
        throw new SyntaxError('JSON body must be an object or array')
      }
    }
    return JSON.parse(body, reviver)
  }
  return function jsonParser (req, res, next) { read(req, res, next, parse, debug, readOptions) }
}
