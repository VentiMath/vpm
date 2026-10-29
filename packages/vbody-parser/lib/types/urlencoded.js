/*!
 * body-parser
 * Copyright(c) 2014 Jonathan Ong
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * MIT Licensed
 */

'use strict'

/**
 * Module dependencies.
 * @private
 */

const createError = require('vhttp-errors')
const debug = require('vdebug')('body-parser:urlencoded')
const read = require('../read')
const qs = require('vqs')
const { normalizeOptions, optionsObject } = require('../utils')

/**
 * Module exports.
 */

module.exports = urlencoded

/**
 * Create a middleware to parse urlencoded bodies.
 *
 * @param {Object} [options]
 * @returns {Function}
 * @public
 */
function urlencoded (options) {
  options = optionsObject(options)
  const normalizedOptions = normalizeOptions(options, 'application/x-www-form-urlencoded')

  if (normalizedOptions.defaultCharset !== 'utf-8' && normalizedOptions.defaultCharset !== 'iso-8859-1') {
    throw new TypeError('option defaultCharset must be either utf-8 or iso-8859-1')
  }

  // create the appropriate query parser
  const parse = createQueryParser(options)

  const readOptions = {
    ...normalizedOptions,
    // assert charset
    isValidCharset: (charset) => charset === 'utf-8' || charset === 'iso-8859-1'
  }

  return function urlencodedParser (req, res, next) {
    read(req, res, next, parse, debug, readOptions)
  }
}

/**
 * Get the extended query parser.
 *
 * @param {Object} options
 * @returns {Function}
 * @private
 */
function createQueryParser (options) {
  const { extended: requestedExtended, parameterLimit: requestedLimit, depth: requestedDepth, charsetSentinel: requestedSentinel, interpretNumericEntities: requestedEntities } = options
  // These follow body-parser 2.4.0 and the qs options it passes through, so
  // configurations from environment strings (parameterLimit: '1000') or
  // truthy flags start as they do upstream.
  const extended = Boolean(requestedExtended)
  let parameterLimit = requestedLimit !== undefined ? requestedLimit : 1000
  const requestedOrDefaultDepth = extended ? (requestedDepth !== undefined ? requestedDepth : 32) : 0
  if (isNaN(parameterLimit) || parameterLimit < 1) throw new TypeError('parameterLimit must be a safe integer >= 1 or Infinity')
  if (isNaN(requestedOrDefaultDepth) || requestedOrDefaultDepth < 0) throw new TypeError('depth must be a safe integer >= 0 or Infinity')
  // Floor rather than body-parser's `| 0`, which wraps limits >= 2 ** 31 to
  // values that reject every form.
  parameterLimit = isFinite(parameterLimit) ? Math.floor(parameterLimit) : Infinity
  const depth = qsDepth(requestedOrDefaultDepth)
  // qs ignores non-boolean flags.
  const charsetSentinel = requestedSentinel === true
  const interpretNumericEntities = requestedEntities === true

  return function parse (body, encoding) {
    if (!body.length) return {}

    const paramCount = parameterCount(body, parameterLimit)

    if (paramCount === undefined) {
      debug('too many parameters')
      throw createError(413, 'too many parameters', {
        type: 'parameters.too.many'
      })
    }

    const arrayLimit = extended ? Math.max(100, paramCount) : paramCount

    debug('parse ' + (extended ? 'extended ' : '') + 'urlencoding')
    try {
      return qs.parse(body, {
        allowPrototypes: true,
        arrayLimit,
        depth,
        charsetSentinel,
        interpretNumericEntities,
        charset: encoding,
        parameterLimit,
        strictDepth: true
      })
    } catch (err) {
      if (err instanceof RangeError) {
        throw createError(400, 'The input exceeded the depth', {
          type: 'querystring.parse.rangeError'
        })
      } else {
        throw err
      }
    }
  }
}

/**
 * The depth qs applies for body-parser's value: a non-number uses qs's default
 * of 5, and a fraction admits one more nesting level, as qs's loop does.
 *
 * @param {*} value
 * @returns {number}
 * @private
 */
function qsDepth (value) {
  if (value === false) return 0
  if (typeof value !== 'number') return 5
  return Number.isFinite(value) ? Math.ceil(value) : Infinity
}

/**
 * Count the number of parameters, stopping once limit reached
 *
 * @param {string} body
 * @param {number} limit
 * @returns {number|undefined} Returns undefined if limit exceeded
 * @private
 */
function parameterCount (body, limit) {
  let count = 0
  let index = -1
  do {
    count++
    if (count > limit) return undefined // Early exit if limit exceeded
    index = body.indexOf('&', index + 1)
  } while (index !== -1)
  return count
}
