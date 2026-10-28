'use strict';
// Upstream 8.4.2 sequence lowering and backtracking guards (MIT).
// See LICENSE and PROVENANCE.json.
module.exports = function lower(tokens, delimiter, keys, originalPath, PathError) {
  let source = '';
  let first = true;
  flatten(tokens, 0, [], sequence => {
    if (!first) source += '|';
    first = false;
    source += toRegExpSource(sequence, delimiter, keys, originalPath);
  });
  return source;
function flatten(tokens, index, result, callback) {
    while (index < tokens.length) {
        const token = tokens[index++];
        if (token.type === "group") {
            const len = result.length;
            flatten(token.tokens, 0, result, (seq) => flatten(tokens, index, seq, callback));
            result.length = len;
            continue;
        }
        result.push(token);
    }
    callback(result);
}
/**
 * Transform a flat sequence of tokens into a regular expression.
 */
function toRegExpSource(tokens, delimiter, keys, originalPath) {
    let result = "";
    let backtrack = "";
    let wildcardBacktrack = "";
    let prevCaptureType = 0;
    let hasSegmentCapture = 0;
    let index = 0;
    function hasInSegment(index, type) {
        while (index < tokens.length) {
            const token = tokens[index++];
            if (token.type === type)
                return true;
            if (token.type === "text") {
                if (token.value.includes(delimiter))
                    break;
            }
        }
        return false;
    }
    function peekText(index) {
        let result = "";
        while (index < tokens.length) {
            const token = tokens[index++];
            if (token.type !== "text")
                break;
            result += token.value;
        }
        return result;
    }
    while (index < tokens.length) {
        const token = tokens[index++];
        if (token.type === "text") {
            result += escape(token.value);
            backtrack += token.value;
            if (prevCaptureType === 2)
                wildcardBacktrack += token.value;
            if (token.value.includes(delimiter))
                hasSegmentCapture = 0;
            continue;
        }
        if (token.type === "param" || token.type === "wildcard") {
            if (prevCaptureType && !backtrack) {
                throw new PathError(`Missing text before "${token.name}" ${token.type}`, originalPath);
            }
            if (token.type === "param") {
                result +=
                    hasSegmentCapture & 2 // Seen wildcard in segment.
                        ? `(${negate(delimiter, backtrack)}+)`
                        : hasInSegment(index, "wildcard") // See wildcard later in segment.
                            ? `(${negate(delimiter, peekText(index))}+)`
                            : hasSegmentCapture & 1 // Seen parameter in segment.
                                ? `(${negate(delimiter, backtrack)}+|${escape(backtrack)})`
                                : `(${negate(delimiter, "")}+)`;
                hasSegmentCapture |= prevCaptureType = 1;
            }
            else {
                result +=
                    hasSegmentCapture & 2 // Seen wildcard in segment.
                        ? `(${negate(backtrack, "")}+)`
                        : wildcardBacktrack // No capture in segment, seen wildcard in path.
                            ? `(${negate(wildcardBacktrack, "")}+|${negate(delimiter, "")}+)`
                            : `([^]+)`;
                wildcardBacktrack = "";
                hasSegmentCapture |= prevCaptureType = 2;
            }
            keys.push(token);
            backtrack = "";
            continue;
        }
        throw new TypeError(`Unknown token type: ${token.type}`);
    }
    return result;
}
/**
 * Block backtracking on previous text/delimiter.
 */
function negate(a, b) {
    if (b.length > a.length)
        return negate(b, a); // Longest string first.
    if (a === b)
        b = ""; // Cleaner regex strings, no duplication.
    if (b.length > 1)
        return `(?:(?!${escape(a)}|${escape(b)})[^])`;
    if (a.length > 1)
        return `(?:(?!${escape(a)})[^${escape(b)}])`;
    return `[^${escape(a + b)}]`;
}

function escape(str) { return str.replace(/[.+*?^${}()[\]|/\\]/g, '\\$&'); }
};
