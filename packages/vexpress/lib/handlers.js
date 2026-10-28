'use strict'

// Flatten and validate before touching a router or route. An active-path set
// distinguishes cycles from the same handler array used more than once.
module.exports = function handlers (args, offset = 0) {
  const result = []
  const frames = [{ array: args, index: offset, length: args.length }]
  const active = new Set([args])
  while (frames.length) {
    const frame = frames[frames.length - 1]
    if (frame.index === frame.length) {
      active.delete(frame.array)
      frames.pop()
      continue
    }
    const index = frame.index++
    if (!(index in frame.array)) continue
    const value = frame.array[index]
    if (Array.isArray(value)) {
      if (active.has(value)) throw new TypeError('cyclic handler array')
      active.add(value)
      frames.push({ array: value, index: 0, length: value.length })
    } else {
      if (typeof value !== 'function') throw new TypeError('argument handler must be a function')
      result.push(value)
    }
  }
  if (result.length === 0) throw new TypeError('argument handler is required')
  return result
}
