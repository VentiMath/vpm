'use strict'

// The RegExp constructor has already checked syntax. Count only capturing
// groups, skipping escaped characters and character classes (nested in /v).
module.exports = function captureNames (regexp) {
  const source = regexp.source
  const names = []
  let unnamed = 0
  let classDepth = 0
  for (let i = 0; i < source.length; i++) {
    const char = source[i]
    if (char === '\\') { i++; continue }
    if (char === '[' && (!classDepth || regexp.unicodeSets)) { classDepth++; continue }
    if (char === ']' && classDepth) { classDepth--; continue }
    if (classDepth || char !== '(') continue
    if (source[i + 1] !== '?') {
      names.push(String(unnamed++))
    } else if (source[i + 2] === '<' && source[i + 3] !== '=' && source[i + 3] !== '!') {
      const end = source.indexOf('>', i + 3)
      names.push(source.slice(i + 3, end).replace(/\\u(?:\{([\da-f]+)\}|([\da-f]{4}))/gi,
        (_, braced, fixed) => String.fromCodePoint(parseInt(braced || fixed, 16))))
      i = end
    }
  }
  return names
}
