'use strict'
// Derived from body-parser, © 2014–2015 Douglas Christopher Wilson.
// VPM modifications © 2026 VentiMath. MIT licensed; see LICENSE.
const createError = require('vhttp-errors')
const getBody = require('vraw-body')
const iconv = require('viconv-lite')
const onFinished = require('von-finished')
const zlib = require('node:zlib')
const hasBody = require('vtype-is').hasBody
const contentType = require('vcontent-type')
const { bodyError } = require('./utils')
const ignoreError = () => {}

module.exports = function read (req, res, next, parse, debug, options) {
  if (onFinished.isFinished(req)) { debug('body already parsed'); next(); return }
  if (!('body' in req)) req.body = undefined
  let encoding = null
  let stream = req
  let length
  let skip
  try { skip = !hasBody(req) || !options.shouldParse(req) }
  catch (error) { next(bodyError(400, error)); return }
  if (skip) { debug('skip parsing'); next(); return }
  try {
    if (!options.skipCharset) {
      const header = req.headers['content-type']
      encoding = (header ? contentType.parse(header).parameters.charset?.toLowerCase() : undefined) || options.defaultCharset
      if ((options.isValidCharset && !options.isValidCharset(encoding)) || !iconv.encodingExists(encoding)) {
        throw createError(415, 'unsupported charset "' + encoding.toUpperCase() + '"', { charset: encoding, type: 'charset.unsupported' })
      }
    }
    const header = req.headers['content-encoding']
    if (header !== undefined && typeof header !== 'string') {
      throw createError(415, 'unsupported content encoding', { type: 'encoding.unsupported' })
    }
    const contentEncoding = (header || 'identity').toLowerCase()
    if (!options.inflate && contentEncoding !== 'identity') {
      throw createError(415, 'content encoding unsupported', { encoding: contentEncoding, type: 'encoding.unsupported' })
    }
    if (contentEncoding === 'identity') length = req.headers['content-length']
    else stream = decompressor(contentEncoding)
  } catch (error) { next(bodyError(400, error)); return }

  const compressed = stream !== req
  let settled = false
  if (compressed) stream.on('error', ignoreError)

  function onAbort () {
    stream.destroy(createError(400, 'request aborted', { code: 'ECONNABORTED', type: 'request.aborted' }))
  }
  function onRequestError (error) { stream.destroy(bodyError(400, error)) }
  function onClose () { if (!req.complete && !req.readableEnded) onAbort() }
  function detach () {
    if (!compressed) return
    req.removeListener('aborted', onAbort)
    req.removeListener('error', onRequestError)
    req.removeListener('close', onClose)
    req.unpipe(stream)
    stream.destroy()
  }
  function complete (error, body) {
    if (settled) return
    settled = true
    detach()
    if (error) {
      const failure = bodyError(400, error)
      dump(req, () => next(failure))
      return
    }
    if (compressed) req.resume()
    if (options.verify) {
      try { options.verify(req, res, body, encoding) }
      catch (error) { next(bodyError(403, error, { body, type: 'entity.verify.failed' })); return }
    }
    let value = body
    try {
      if (typeof body !== 'string' && encoding !== null) value = iconv.decode(body, encoding)
      req.body = parse(value, encoding)
    } catch (error) { next(bodyError(400, error, { body: value, type: 'entity.parse.failed' })); return }
    next()
  }

  debug('read body')
  try {
    // Register the decoded-stream reader before piping can start delivering data.
    getBody(stream, { length, encoding: options.verify ? null : encoding, limit: options.limit }, complete)
    if (compressed && !settled) {
      req.on('aborted', onAbort)
      req.on('error', onRequestError)
      req.on('close', onClose)
      if (req.aborted || req.destroyed) onAbort()
      else req.pipe(stream)
    }
  } catch (error) {
    // Exceptions from the caller's next() must not become a second completion.
    if (settled) throw error
    complete(error)
  }
}

function decompressor (encoding) {
  switch (encoding) {
    case 'gzip': return zlib.createGunzip()
    case 'deflate': return zlib.createInflate()
    case 'br': return zlib.createBrotliDecompress()
    case 'zstd': if (typeof zlib.createZstdDecompress === 'function') return zlib.createZstdDecompress()
  }
  throw createError(415, 'unsupported content encoding "' + encoding + '"', { encoding, type: 'encoding.unsupported' })
}

function dump (req, callback) {
  if (req.aborted || req.destroyed || onFinished.isFinished(req)) callback()
  else { onFinished(req, callback); req.resume() }
}
