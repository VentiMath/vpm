"use strict";
const CHUNK = 128;
function leaf(items) {
  return { items, length: items.length, height: 0 };
}
function branch(left, right) {
  return {
    left,
    right,
    length: left.length + right.length,
    height: Math.max(left.height, right.height) + 1,
  };
}
function balance(left, right) {
  if (left.height > right.height + 1) {
    if (left.left.height >= left.right.height)
      return branch(left.left, branch(left.right, right));
    const middle = left.right;
    return branch(branch(left.left, middle.left), branch(middle.right, right));
  }
  if (right.height > left.height + 1) {
    if (right.right.height >= right.left.height)
      return branch(branch(left, right.left), right.right);
    const middle = right.left;
    return branch(branch(left, middle.left), branch(middle.right, right.right));
  }
  return branch(left, right);
}
function join(left, right) {
  if (!left) return right;
  if (!right) return left;
  if (!left.height && !right.height && left.length + right.length <= CHUNK)
    return leaf(left.items.concat(right.items));
  if (left.height > right.height + 1)
    return balance(left.left, join(left.right, right));
  if (right.height > left.height + 1)
    return balance(join(left, right.left), right.right);
  return branch(left, right);
}
function build(values, from, to) {
  if (to - from <= CHUNK) {
    const items = new Array(to - from);
    for (let i = 0; i < items.length; i++) items[i] = values[from + i];
    return leaf(items);
  }
  const middle = from + Math.floor((to - from) / 2);
  return branch(build(values, from, middle), build(values, middle, to));
}
function cut(node, from, to) {
  if (from === 0 && to === node.length) return node;
  if (node.items) return leaf(node.items.slice(from, to));
  const split = node.left.length;
  if (to <= split) return cut(node.left, from, to);
  if (from >= split) return cut(node.right, from - split, to - split);
  return join(cut(node.left, from, split), cut(node.right, 0, to - split));
}
function visit(node, offset, low, high, reverse, fn) {
  if (!node || low >= offset + node.length || high <= offset) return true;
  if (node.items) {
    const start = Math.max(0, low - offset),
      end = Math.min(node.length, high - offset);
    if (reverse) {
      for (let i = end - 1; i >= start; i--)
        if (fn(node.items[i], offset + i) === false) return false;
    } else {
      for (let i = start; i < end; i++)
        if (fn(node.items[i], offset + i) === false) return false;
    }
    return true;
  }
  const split = offset + node.left.length;
  return reverse
    ? visit(node.right, split, low, high, true, fn) &&
        visit(node.left, offset, low, high, true, fn)
    : visit(node.left, offset, low, high, false, fn) &&
        visit(node.right, split, low, high, false, fn);
}
function copy(node, output, offset) {
  if (node.items) {
    for (let i = 0; i < node.length; i++) output[offset + i] = node.items[i];
  } else {
    copy(node.left, output, offset);
    copy(node.right, output, offset + node.left.length);
  }
}
function boundary(value) {
  if (
    typeof value !== "number" ||
    Number.isNaN(value) ||
    (Number.isFinite(value) && !Number.isInteger(value))
  )
    throw new RangeError("Sequence boundaries must be integers");
}
class RopeSequence {
  #root = null;
  static #wrap(root) {
    if (!root) return RopeSequence.empty;
    const value = new RopeSequence();
    value.#root = root;
    return value;
  }
  static from(values) {
    if (values instanceof RopeSequence) return values;
    if (values == null) return RopeSequence.empty;
    if (!Array.isArray(values))
      throw new TypeError("Expected an array or RopeSequence");
    return values.length
      ? RopeSequence.#wrap(build(values, 0, values.length))
      : RopeSequence.empty;
  }
  get length() {
    return this.#root?.length || 0;
  }
  append(values) {
    const other = RopeSequence.from(values);
    return !other.length
      ? this
      : !this.length
        ? other
        : RopeSequence.#wrap(join(this.#root, other.#root));
  }
  prepend(values) {
    return RopeSequence.from(values).append(this);
  }
  slice(from = 0, to = this.length) {
    boundary(from);
    boundary(to);
    from = Math.max(0, Math.min(this.length, from));
    to = Math.max(0, Math.min(this.length, to));
    if (from >= to) return RopeSequence.empty;
    if (from === 0 && to === this.length) return this;
    return RopeSequence.#wrap(cut(this.#root, from, to));
  }
  get(index) {
    if (!Number.isInteger(index) || index < 0 || index >= this.length)
      return undefined;
    let node = this.#root;
    while (!node.items) {
      if (index < node.left.length) node = node.left;
      else {
        index -= node.left.length;
        node = node.right;
      }
    }
    return node.items[index];
  }
  forEach(fn, from = 0, to = this.length) {
    boundary(from);
    boundary(to);
    if (from < 0 || from > this.length || to < 0 || to > this.length)
      throw new RangeError("Iteration bounds are outside the sequence");
    visit(this.#root, 0, Math.min(from, to), Math.max(from, to), from > to, fn);
  }
  map(fn, from = 0, to = this.length) {
    const result = [];
    this.forEach(
      (value, index) => {
        result.push(fn(value, index));
      },
      from,
      to,
    );
    return result;
  }
  flatten() {
    const result = new Array(this.length);
    if (this.#root) copy(this.#root, result, 0);
    return result;
  }
}
Object.defineProperty(RopeSequence, "empty", {
  value: new RopeSequence(),
  enumerable: true,
});
module.exports = RopeSequence;
