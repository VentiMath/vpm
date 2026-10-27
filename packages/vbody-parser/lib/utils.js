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

function booleanOption (value, fallback, name) {
  if (value === undefined) return fallback
  if (typeof value !== 'boolean') throw new TypeError(name + ' must be a boolean')
  return value
}

function integerOption (value, fallback, minimum, name) {
  if (value === undefined) return fallback
  if (value === Infinity || (Number.isSafeInteger(value) && value >= minimum)) return value
  throw new TypeError(name + ' must be a safe integer >= ' + minimum + ' or Infinity')
}

function normalizeOptions (options, defaultType) {
  options = optionsObject(options)
  const { inflate, limit: requestedLimit, type: requestedType, verify: requestedVerify, defaultCharset: requestedCharset } = options
  const limit = requestedLimit == null ? 102400 : bytes.parse(requestedLimit)
  if (!Number.isSafeInteger(limit) || limit < 0) throw new RangeError('limit must be a nonnegative safe integer byte count')
  const type = requestedType === undefined ? defaultType : requestedType
  const verify = requestedVerify === undefined ? false : requestedVerify
  if (verify !== false && typeof verify !== 'function') throw new TypeError('verify must be a function or false')
  const charset = requestedCharset === undefined ? 'utf-8' : requestedCharset
  if (typeof charset !== 'string' || !charset) throw new TypeError('defaultCharset must be a nonempty string')
  const defaultCharset = charset.toLowerCase()
  if (defaultType !== 'application/octet-stream' && !iconv.encodingExists(defaultCharset)) {
    throw new TypeError('unsupported defaultCharset: ' + defaultCharset)
  }
  let shouldParse = type
  if (typeof type !== 'function') {
    const list = Array.isArray(type) ? type.slice() : [type]
    if (!list.length) throw new TypeError('type must contain at least one media type')
    for (let i = 0; i < list.length; i++) {
      const normalized = typeis.normalize(list[i])
      if (typeof normalized !== 'string' || !typeis.match(normalized, normalized.replace(/\*/g, 'x'))) {
        throw new TypeError('type must contain valid media types, extensions, or wildcard patterns')
      }
      list[i] = normalized.toLowerCase()
    }
    shouldParse = req => Boolean(typeis(req, list))
  }
  return { inflate: booleanOption(inflate, true, 'inflate'), limit, verify, defaultCharset, shouldParse }
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

module.exports = { normalizeOptions, optionsObject, booleanOption, integerOption, bodyError, passthrough: value => value }
