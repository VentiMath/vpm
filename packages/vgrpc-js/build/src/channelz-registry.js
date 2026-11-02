'use strict';

// An independent numeric-ID AVL registry. Only Channelz's lookup, reference
// updates and ordered traversal are implemented; there is no general map API.
const height = node => node === null ? 0 : node.height;
function update(node) { node.height = 1 + Math.max(height(node.left), height(node.right)); return node; }
function left(root) {
  const next = root.right;
  root.right = next.left; next.left = update(root);
  return update(next);
}
function right(root) {
  const next = root.left;
  root.left = next.right; next.right = update(root);
  return update(next);
}
function balance(root) {
  update(root);
  const skew = height(root.left) - height(root.right);
  if (skew > 1) {
    if (height(root.left.left) < height(root.left.right)) root.left = left(root.left);
    return right(root);
  }
  if (skew < -1) {
    if (height(root.right.right) < height(root.right.left)) root.right = right(root.right);
    return left(root);
  }
  return root;
}
function removeMinimum(root) {
  if (root.left === null) return root.right;
  root.left = removeMinimum(root.left);
  return balance(root);
}
class ChannelzRegistry {
  #root = null;
  #size = 0;
  #revision = 0;
  #insert(root, id, value) {
    if (root === null) {
      this.#size++; this.#revision++;
      return {id, value, height: 1, left: null, right: null};
    }
    if (id < root.id) root.left = this.#insert(root.left, id, value);
    else if (id > root.id) root.right = this.#insert(root.right, id, value);
    else { root.value = value; return root; }
    return balance(root);
  }
  set(id, value) {
    if (!Number.isSafeInteger(id) || id < 0) throw RangeError('Channelz IDs must be nonnegative safe integers');
    this.#root = this.#insert(this.#root, id, value);
    return this;
  }
  get(id) {
    if (!Number.isSafeInteger(id)) return undefined;
    let node = this.#root;
    while (node !== null) {
      if (id === node.id) return node.value;
      node = id < node.id ? node.left : node.right;
    }
  }
  getElementByKey(id) { return this.get(id); }
  #remove(root, id) {
    if (root === null) return null;
    if (id < root.id) root.left = this.#remove(root.left, id);
    else if (id > root.id) root.right = this.#remove(root.right, id);
    else {
      this.#size--; this.#revision++;
      if (root.left === null) return root.right;
      if (root.right === null) return root.left;
      let successor = root.right;
      while (successor.left !== null) successor = successor.left;
      root.id = successor.id; root.value = successor.value;
      root.right = removeMinimum(root.right);
    }
    return balance(root);
  }
  delete(id) {
    if (!Number.isSafeInteger(id)) return false;
    const before = this.#size;
    this.#root = this.#remove(this.#root, id);
    return before !== this.#size;
  }
  size() { return this.#size; }
  clear() { this.#root = null; this.#size = 0; this.#revision++; }
  #seek(start, strict, stack) {
    stack.length = 0;
    let node = this.#root;
    while (node !== null) {
      if (node.id > start || (!strict && node.id === start)) { stack.push(node); node = node.left; }
      else node = node.right;
    }
  }
  *entriesFrom(id = -Infinity) {
    const stack = [];
    // Preserve the service's historical absent/malformed pagination-start rule.
    this.#seek(Number.isNaN(id) ? -Infinity : id, false, stack);
    let revision = this.#revision;
    while (stack.length) {
      const node = stack.pop(), current = node.id;
      yield [current, node.value];
      if (revision !== this.#revision) {
        this.#seek(current, true, stack); revision = this.#revision;
      } else {
        let next = node.right;
        while (next !== null) { stack.push(next); next = next.left; }
      }
    }
  }
  [Symbol.iterator]() { return this.entriesFrom(); }
  forEach(callback) {
    if (this.#root === null) return;
    let index = 0;
    for (const pair of this) callback(pair, index++, this);
  }
  page(start, limit, project) {
    const values = [], stack = [];
    this.#seek(Number.isNaN(start) ? -Infinity : start, false, stack);
    let revision = this.#revision;
    // Service responses need projected values, not public iterator pairs.
    while (stack.length && values.length < limit) {
      const node = stack.pop(), current = node.id;
      values.push(project(node.value));
      if (revision !== this.#revision) {
        this.#seek(current, true, stack); revision = this.#revision;
      } else {
        let next = node.right;
        while (next !== null) { stack.push(next); next = next.left; }
      }
    }
    return {values, end: stack.length === 0};
  }
}
module.exports = {ChannelzRegistry};
