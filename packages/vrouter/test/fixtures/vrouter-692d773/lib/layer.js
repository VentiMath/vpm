/*!
 * router
 * Copyright(c) 2013 Roman Shtylman
 * Copyright(c) 2014-2022 Douglas Christopher Wilson
 * MIT Licensed
 */

'use strict'

/**
 * Module dependencies.
 * @private
 */

const pathRegexp = require('vpath-to-regexp')
const debug = require('vdebug')('router:layer')
const deprecate = require('vdepd')('router')
const captureNames = require('./regexp')

/**
 * Module variables.
 * @private
 */

const TRAILING_SLASH_REGEXP = /\/+$/
let handlerMatcher

/**
 * Expose `Layer`.
 */

module.exports = Layer

// Route.dispatch never matches its handler layers. Keep their introspection
// behavior with one shared, stateless root matcher instead of compiling each.
Layer.forHandler = function forHandler (fn) {
  const layer = Object.create(Layer.prototype)
  initialize(layer, fn)
  layer.slash = false
  layer.matchers = [handlerMatcher || (handlerMatcher = pathRegexp.match('/', { decode: decodeParam }))]
  return layer
}

// One .use(path, ...handlers) call has one path configuration. Share its
// private matcher functions while retaining separate layer arrays and results.
Layer.withMatcher = function withMatcher (source, fn) {
  const layer = Object.create(Layer.prototype)
  initialize(layer, fn)
  layer.slash = source.slash
  layer.matchers = source.matchers.slice()
  return layer
}

function initialize (layer, fn) {
  layer.handle = fn
  layer.keys = []
  layer.name = fn.name || '<anonymous>'
  layer.params = undefined
  layer.path = undefined
}

function Layer (path, options, fn) {
  if (!(this instanceof Layer)) {
    return new Layer(path, options, fn)
  }

  debug('new %o', path)
  const opts = options || {}

  initialize(this, fn)
  this.slash = path === '/' && opts.end === false

  function matcher (_path) {
    if (_path instanceof RegExp) {
      // Own the regexp state; /g and /y always start at zero for each request.
      const regexp = new RegExp(_path.source, _path.flags)
      const keys = captureNames(regexp)

      return function regexpMatcher (p) {
        regexp.lastIndex = 0
        const match = regexp.exec(p)
        if (!match) {
          return false
        }

        const params = Object.create(null)
        for (let i = 1; i < match.length; i++) {
          const prop = keys[i - 1]
          const val = decodeParam(match[i])

          if (val !== undefined) {
            params[prop] = val
          }
        }

        return {
          params,
          path: match[0]
        }
      }
    }

    return pathRegexp.match((opts.strict ? _path : loosen(_path)), {
      sensitive: opts.sensitive,
      end: opts.end,
      trailing: !opts.strict,
      decode: decodeParam
    })
  }
  this.matchers = this.slash ? [] : (Array.isArray(path) ? path.map(matcher) : [matcher(path)])
}

/**
 * Handle the error for the layer.
 *
 * @param {Error} error
 * @param {Request} req
 * @param {Response} res
 * @param {function} next
 * @api private
 */

Layer.prototype.handleError = function handleError (error, req, res, next) {
  const fn = this.handle

  if (fn.length !== 4) {
    // not a standard error handler
    return next(error)
  }

  try {
    // invoke function
    const ret = fn(error, req, res, next)

    // wait for returned promise
    const then = ret !== null && (typeof ret === 'object' || typeof ret === 'function') ? ret.then : undefined
    if (typeof then === 'function') {
      if (!(ret instanceof Promise)) {
        deprecate('handlers that are Promise-like are deprecated, use a native Promise instead')
      }

      Reflect.apply(then, ret, [null, function (error) {
        next(error || new Error('Rejected promise'))
      }])
    }
  } catch (err) {
    next(err)
  }
}

/**
 * Handle the request for the layer.
 *
 * @param {Request} req
 * @param {Response} res
 * @param {function} next
 * @api private
 */

Layer.prototype.handleRequest = function handleRequest (req, res, next) {
  const fn = this.handle

  if (fn.length > 3) {
    // not a standard request handler
    return next()
  }

  try {
    // invoke function
    const ret = fn(req, res, next)

    // wait for returned promise
    const then = ret !== null && (typeof ret === 'object' || typeof ret === 'function') ? ret.then : undefined
    if (typeof then === 'function') {
      if (!(ret instanceof Promise)) {
        deprecate('handlers that are Promise-like are deprecated, use a native Promise instead')
      }

      Reflect.apply(then, ret, [null, function (error) {
        next(error || new Error('Rejected promise'))
      }])
    }
  } catch (err) {
    next(err)
  }
}

/**
 * Check if this route matches `path`, if so
 * populate `.params`.
 *
 * @param {String} path
 * @return {Boolean}
 * @api private
 */

Layer.prototype.match = function match (path) {
  let match

  if (path != null) {
    // fast path non-ending match for / (any path matches)
    if (this.slash) {
      this.params = Object.create(null)
      this.path = ''
      return true
    }

    let i = 0
    while (!match && i < this.matchers.length) {
      // match the path
      match = this.matchers[i](path)
      i++
    }
  }

  if (!match) {
    this.params = undefined
    this.path = undefined
    return false
  }

  // store values
  this.params = match.params
  this.path = match.path
  this.keys = Object.keys(match.params)

  return true
}

/**
 * Decode param value.
 *
 * @param {string} val
 * @return {string}
 * @private
 */

function decodeParam (val) {
  if (typeof val !== 'string' || !val.includes('%')) {
    return val
  }

  try {
    return decodeURIComponent(val)
  } catch (err) {
    if (err instanceof URIError) {
      err.message = 'Failed to decode param \'' + val + '\''
      err.status = 400
    }

    throw err
  }
}

/**
 * Loosens the given path for path-to-regexp matching.
 */
function loosen (path) {
  if (path instanceof RegExp || path === '/') {
    return path
  }

  return Array.isArray(path)
    ? path.map(function (p) { return loosen(p) })
    : String(path).replace(TRAILING_SLASH_REGEXP, '')
}
