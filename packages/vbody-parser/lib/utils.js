'use strict'
// Derived from body-parser 2.4.0, MIT licensed. VPM modifications © 2026 VentiMath.
const bytes = require('vbytes')
const typeis = require('vtype-is')
const iconv = require('viconv-lite')
const createError = require('vhttp-errors')
// Old V8 materializes the fallback stack during descriptor inspection. Keep
// its eager copy path; otherwise deferring the original adds a second format.
const lazyErrorStacks = Boolean(process.versions.bun) || typeof Object.getOwnPropertyDescriptor(new Error(), 'stack')?.get === 'function'

function optionsObject (options) {
  if (options == null) return {}
  if (typeof options !== 'object' || Array.isArray(options)) throw new TypeError('options must be an object')
  return options
}

// Option coercions follow body-parser 2.4.0, so configurations that start there
// start here: inflate is on unless exactly false, falsy type/verify/charset use
// their defaults, and numeric limits reach the reader unchanged (Infinity means
// no limit). NaN, negative and malformed limits still fail at startup instead
// of silently disabling or truncating the limit, or rejecting every request.
function normalizeOptions (options, defaultType) {
  options = optionsObject(options)
  const { inflate, limit: requestedLimit, type: requestedType, verify: requestedVerify, defaultCharset: requestedCharset } = options
  const limit = requestedLimit == null ? 102400 : typeof requestedLimit === 'number' ? requestedLimit : bytes.parse(requestedLimit)
  if (Number.isNaN(limit) || limit < 0) throw new RangeError('limit must be a nonnegative byte count')
  const type = requestedType || defaultType
  const verify = requestedVerify || false
  if (verify !== false && typeof verify !== 'function') throw new TypeError('verify must be a function or false')
  // raw never decodes, so like body-parser it ignores defaultCharset. The
  // others fail at startup on a charset every request without one would 415 on.
  const charset = requestedCharset || 'utf-8'
  const decodes = defaultType !== 'application/octet-stream'
  if (decodes && typeof charset !== 'string') throw new TypeError('defaultCharset must be a nonempty string')
  const defaultCharset = decodes ? charset.toLowerCase() : 'utf-8'
  if (decodes && !iconv.encodingExists(defaultCharset)) {
    throw new TypeError('unsupported defaultCharset: ' + defaultCharset)
  }
  let shouldParse = type
  if (typeof type !== 'function') {
    // Normalize valid patterns once. An empty list or a pattern type-is cannot
    // match keeps upstream's per-request semantics (an empty list accepts any
    // valid type; an unknown extension matches nothing) instead of throwing.
    const list = Array.isArray(type) ? type.slice() : [type]
    let prepared = list.length > 0
    for (let i = 0; prepared && i < list.length; i++) {
      const normalized = typeis.normalize(list[i])
      if (typeof normalized !== 'string' || !typeis.match(normalized, normalized.replace(/\*/g, 'x'))) prepared = false
      else list[i] = normalized.toLowerCase()
    }
    shouldParse = prepared ? req => Boolean(typeis(req, list)) : req => Boolean(typeis(req, type))
  }
  return { inflate: inflate !== false, limit, verify, defaultCharset, shouldParse }
}

// Errors supplied by revivers/verifiers may be frozen, primitives, or null.
// Preserve their identity as cause and their metadata without assigning to them.
function bodyError (status, thrown, properties = {}) {
  const original = thrown instanceof Error ? thrown : null
  const message = original ? original.message : typeof thrown === 'string' ? thrown : 'Body parser callback failed'
  const ErrorType = thrown instanceof SyntaxError ? SyntaxError : Error
  const error = new ErrorType(message, { cause: thrown })
  if (original) {
    for (const key of Object.keys(original)) {
      if (!['__proto__', 'constructor', 'prototype', 'cause', 'name', 'message', 'stack'].includes(key)) {
        Object.defineProperty(error, key, { value: original[key], writable: true, enumerable: true, configurable: true })
      }
    }
    error.name = original.name
    copyStack(error, original)
    // Common HTTP errors expose these through a prototype, not own fields.
    if (Number.isInteger(original.status) && original.status >= 400 && original.status <= 599) error.status = original.status
    else if (Number.isInteger(original.statusCode) && original.statusCode >= 400 && original.statusCode <= 599) error.status = original.statusCode
    if (typeof original.type === 'string' && original.type) properties = { ...properties, type: original.type }
  }
  return createError(status, error, properties)
}

function copyStack (error, original) {
  if (!lazyErrorStacks) {
    const stack = original.stack
    if (typeof stack === 'string') error.stack = stack
    return
  }
  // Reading Error.stack can format every frame. Most HTTP error handlers only
  // need status/type, so defer that work without discarding the original trace.
  // Retain our own captured trace as fallback for a non-string original stack.
  const fallback = Object.getOwnPropertyDescriptor(error, 'stack')
  let resolved = false
  let stack
  Object.defineProperty(error, 'stack', {
    configurable: true,
    get () {
      if (!resolved) {
        const originalStack = original.stack
        stack = typeof originalStack === 'string' ? originalStack : fallback?.get ? fallback.get.call(error) : fallback?.value
        resolved = true
      }
      return stack
    },
    set (value) {
      Object.defineProperty(this, 'stack', { value, writable: true, configurable: true })
    }
  })
}

module.exports = { normalizeOptions, optionsObject, bodyError, passthrough: value => value }
