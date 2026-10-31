'use strict';
// Derived from functional-red-black-tree 1.0.1 (MIT, Mikola Lysenko); see LICENSE
// and PROVENANCE.json. Nodes keep upstream's public layout (key, value, left,
// right, _color, _count) because callers and upstream's own tests inspect it.

const RED = 0;
const BLACK = 1;

function RBNode(color, key, value, left, right, count) {
  this._color = color;
  this.key = key;
  this.value = value;
  this.left = left;
  this.right = right;
  this._count = count;
}

function cloneNode(node) {
  return new RBNode(node._color, node.key, node.value, node.left, node.right, node._count);
}

function repaint(color, node) {
  return new RBNode(color, node.key, node.value, node.left, node.right, node._count);
}

function recount(node) {
  node._count = 1 + (node.left ? node.left._count : 0) + (node.right ? node.right._count : 0);
}

function defaultCompare(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

// In-order traversal without recursion. A truthy visitor result stops the walk
// and is returned, as upstream's recursive visitors do.
function visitRange(tree, visit, hasLo, lo, hasHi, hi) {
  const compare = tree._compare;
  const stack = [];
  let node = tree.root;
  while (node || stack.length) {
    while (node) {
      // Skip left subtrees entirely below the lower bound.
      if (hasLo && compare(lo, node.key) > 0) {
        node = node.right;
        continue;
      }
      stack.push(node);
      node = node.left;
    }
    if (!stack.length) break;
    node = stack.pop();
    if (hasHi && compare(hi, node.key) <= 0) return;
    const result = visit(node.key, node.value);
    if (result) return result;
    node = node.right;
  }
}

function RedBlackTree(compare, root) {
  this._compare = compare;
  this.root = root;
}
const proto = RedBlackTree.prototype;

Object.defineProperty(proto, 'keys', {
  get() {
    return collect(this.root, 'key');
  },
});

Object.defineProperty(proto, 'values', {
  get() {
    return collect(this.root, 'value');
  },
});

Object.defineProperty(proto, 'length', {
  get() {
    return this.root ? this.root._count : 0;
  },
});

proto.insert = function (key, value) {
  const cmp = this._compare;
  // Find the insertion point, recording the path and branch directions.
  let n = this.root;
  const nStack = [];
  const dStack = [];
  while (n) {
    const d = cmp(key, n.key);
    nStack.push(n);
    dStack.push(d);
    n = d <= 0 ? n.left : n.right;
  }
  // Copy the path to the new leaf so earlier trees remain unchanged.
  nStack.push(new RBNode(RED, key, value, null, null, 1));
  for (let s = nStack.length - 2; s >= 0; --s) {
    n = nStack[s];
    nStack[s] = dStack[s] <= 0
      ? new RBNode(n._color, n.key, n.value, nStack[s + 1], n.right, n._count + 1)
      : new RBNode(n._color, n.key, n.value, n.left, nStack[s + 1], n._count + 1);
  }
  // Rebalance the copied path.
  for (let s = nStack.length - 1; s > 1; --s) {
    const p = nStack[s - 1];
    n = nStack[s];
    if (p._color === BLACK || n._color === BLACK) break;
    const pp = nStack[s - 2];
    if (pp.left === p) {
      const y = pp.right;
      if (y && y._color === RED) {
        p._color = BLACK;
        pp.right = repaint(BLACK, y);
        pp._color = RED;
        s -= 1;
        continue;
      }
      if (p.left === n) {
        pp._color = RED;
        pp.left = p.right;
        p._color = BLACK;
        p.right = pp;
        nStack[s - 2] = p;
        nStack[s - 1] = n;
        recount(pp);
        recount(p);
        if (s >= 3) relink(nStack[s - 3], pp, p);
      } else {
        p.right = n.left;
        pp._color = RED;
        pp.left = n.right;
        n._color = BLACK;
        n.left = p;
        n.right = pp;
        nStack[s - 2] = n;
        nStack[s - 1] = p;
        recount(pp);
        recount(p);
        recount(n);
        if (s >= 3) relink(nStack[s - 3], pp, n);
      }
      break;
    }
    const y = pp.left;
    if (y && y._color === RED) {
      p._color = BLACK;
      pp.left = repaint(BLACK, y);
      pp._color = RED;
      s -= 1;
      continue;
    }
    if (p.right === n) {
      pp._color = RED;
      pp.right = p.left;
      p._color = BLACK;
      p.left = pp;
      nStack[s - 2] = p;
      nStack[s - 1] = n;
      recount(pp);
      recount(p);
      if (s >= 3) relink(nStack[s - 3], pp, p);
    } else {
      p.left = n.right;
      pp._color = RED;
      pp.right = n.left;
      n._color = BLACK;
      n.right = p;
      n.left = pp;
      nStack[s - 2] = n;
      nStack[s - 1] = p;
      recount(pp);
      recount(p);
      recount(n);
      if (s >= 3) relink(nStack[s - 3], pp, n);
    }
    break;
  }
  nStack[0]._color = BLACK;
  return new RedBlackTree(cmp, nStack[0]);
};

// Upstream distinguishes the bounds by argument count: an explicitly passed
// undefined bound is still a bound.
proto.forEach = function (visit, lo, hi) {
  if (!this.root) return;
  switch (arguments.length) {
    case 1: return visitRange(this, visit, false, undefined, false, undefined);
    case 2: return visitRange(this, visit, true, lo, false, undefined);
    default:
      if (this._compare(lo, hi) >= 0) return;
      return visitRange(this, visit, true, lo, true, hi);
  }
};

Object.defineProperty(proto, 'begin', {
  get() {
    const stack = [];
    for (let n = this.root; n; n = n.left) stack.push(n);
    return new RedBlackTreeIterator(this, stack);
  },
});

Object.defineProperty(proto, 'end', {
  get() {
    const stack = [];
    for (let n = this.root; n; n = n.right) stack.push(n);
    return new RedBlackTreeIterator(this, stack);
  },
});

// Upstream throws on an empty tree and treats NaN as index 0. Any index that
// is not an in-range integer yields an invalid iterator instead.
proto.at = function (idx) {
  if (!this.root || !Number.isInteger(idx) || idx < 0 || idx >= this.root._count) {
    return new RedBlackTreeIterator(this, []);
  }
  let n = this.root;
  const stack = [];
  for (;;) {
    stack.push(n);
    if (n.left) {
      if (idx < n.left._count) {
        n = n.left;
        continue;
      }
      idx -= n.left._count;
    }
    if (!idx) return new RedBlackTreeIterator(this, stack);
    idx -= 1;
    n = n.right;
  }
};

proto.ge = function (key) { return bound(this, key, atMost, atMost); };
proto.gt = function (key) { return bound(this, key, below, below); };
proto.lt = function (key) { return bound(this, key, above, atMost); };
proto.le = function (key) { return bound(this, key, atLeast, below); };

proto.find = function (key) {
  const cmp = this._compare;
  const stack = [];
  for (let n = this.root; n;) {
    const d = cmp(key, n.key);
    stack.push(n);
    if (d === 0) return new RedBlackTreeIterator(this, stack);
    n = d <= 0 ? n.left : n.right;
  }
  return new RedBlackTreeIterator(this, []);
};

proto.remove = function (key) {
  return this.find(key).remove();
};

proto.get = function (key) {
  const cmp = this._compare;
  for (let n = this.root; n;) {
    const d = cmp(key, n.key);
    if (d === 0) return n.value;
    n = d <= 0 ? n.left : n.right;
  }
};

// The last node satisfying `keep` on the search path for `key`. `goLeft` picks
// the descent direction, as in upstream's four range lookups.
const atMost = d => d <= 0;
const below = d => d < 0;
const above = d => d > 0;
const atLeast = d => d >= 0;
function bound(tree, key, keep, goLeft) {
  const cmp = tree._compare;
  const stack = [];
  let last = 0;
  for (let n = tree.root; n;) {
    const d = cmp(key, n.key);
    stack.push(n);
    if (keep(d)) last = stack.length;
    n = goLeft(d) ? n.left : n.right;
  }
  stack.length = last;
  return new RedBlackTreeIterator(tree, stack);
}

// In-order field collection with an explicit stack.
function collect(root, field) {
  const result = [];
  const stack = [];
  let n = root;
  while (n || stack.length) {
    while (n) {
      stack.push(n);
      n = n.left;
    }
    n = stack.pop();
    result.push(n[field]);
    n = n.right;
  }
  return result;
}

function relink(parent, from, to) {
  if (parent.left === from) parent.left = to;
  else parent.right = to;
}

// Replace a double-black node on a copied path. Siblings come from the shared
// tree, so they are cloned before modification.
function fixDoubleBlack(stack) {
  let n, p, s, z;
  for (let i = stack.length - 1; i >= 0; --i) {
    n = stack[i];
    if (i === 0) {
      n._color = BLACK;
      return;
    }
    p = stack[i - 1];
    if (p.left === n) {
      s = p.right;
      if (s.right && s.right._color === RED) {
        s = p.right = cloneNode(s);
        z = s.right = cloneNode(s.right);
        p.right = s.left;
        s.left = p;
        s.right = z;
        s._color = p._color;
        n._color = BLACK;
        p._color = BLACK;
        z._color = BLACK;
        recount(p);
        recount(s);
        if (i > 1) relink(stack[i - 2], p, s);
        stack[i - 1] = s;
        return;
      } else if (s.left && s.left._color === RED) {
        s = p.right = cloneNode(s);
        z = s.left = cloneNode(s.left);
        p.right = z.left;
        s.left = z.right;
        z.left = p;
        z.right = s;
        z._color = p._color;
        p._color = BLACK;
        s._color = BLACK;
        n._color = BLACK;
        recount(p);
        recount(s);
        recount(z);
        if (i > 1) relink(stack[i - 2], p, z);
        stack[i - 1] = z;
        return;
      }
      if (s._color === BLACK) {
        if (p._color === RED) {
          p._color = BLACK;
          p.right = repaint(RED, s);
          return;
        }
        p.right = repaint(RED, s);
        continue;
      }
      s = cloneNode(s);
      p.right = s.left;
      s.left = p;
      s._color = p._color;
      p._color = RED;
      recount(p);
      recount(s);
      if (i > 1) relink(stack[i - 2], p, s);
      stack[i - 1] = s;
      stack[i] = p;
      if (i + 1 < stack.length) stack[i + 1] = n;
      else stack.push(n);
      i = i + 2;
    } else {
      s = p.left;
      if (s.left && s.left._color === RED) {
        s = p.left = cloneNode(s);
        z = s.left = cloneNode(s.left);
        p.left = s.right;
        s.right = p;
        s.left = z;
        s._color = p._color;
        n._color = BLACK;
        p._color = BLACK;
        z._color = BLACK;
        recount(p);
        recount(s);
        if (i > 1) relink(stack[i - 2], p, s);
        stack[i - 1] = s;
        return;
      } else if (s.right && s.right._color === RED) {
        s = p.left = cloneNode(s);
        z = s.right = cloneNode(s.right);
        p.left = z.right;
        s.right = z.left;
        z.right = p;
        z.left = s;
        z._color = p._color;
        p._color = BLACK;
        s._color = BLACK;
        n._color = BLACK;
        recount(p);
        recount(s);
        recount(z);
        if (i > 1) relink(stack[i - 2], p, z);
        stack[i - 1] = z;
        return;
      }
      if (s._color === BLACK) {
        if (p._color === RED) {
          p._color = BLACK;
          p.left = repaint(RED, s);
          return;
        }
        p.left = repaint(RED, s);
        continue;
      }
      s = cloneNode(s);
      p.left = s.right;
      s.right = p;
      s._color = p._color;
      p._color = RED;
      recount(p);
      recount(s);
      if (i > 1) relink(stack[i - 2], p, s);
      stack[i - 1] = s;
      stack[i] = p;
      if (i + 1 < stack.length) stack[i + 1] = n;
      else stack.push(n);
      i = i + 2;
    }
  }
}

// Overwrite a copied node with a child's contents.
function swapNode(n, v) {
  n.key = v.key;
  n.value = v.value;
  n.left = v.left;
  n.right = v.right;
  n._color = v._color;
  n._count = v._count;
}

function RedBlackTreeIterator(tree, stack) {
  this.tree = tree;
  this._stack = stack;
}
const iproto = RedBlackTreeIterator.prototype;

Object.defineProperty(iproto, 'valid', {
  get() {
    return this._stack.length > 0;
  },
});

Object.defineProperty(iproto, 'node', {
  enumerable: true,
  get() {
    const stack = this._stack;
    return stack.length > 0 ? stack[stack.length - 1] : null;
  },
});

iproto.clone = function () {
  return new RedBlackTreeIterator(this.tree, this._stack.slice());
};

iproto.remove = function () {
  const stack = this._stack;
  if (stack.length === 0) return this.tree;
  // Copy the path to the node so the source tree is unchanged.
  const cstack = new Array(stack.length);
  let n = stack[stack.length - 1];
  cstack[cstack.length - 1] = new RBNode(n._color, n.key, n.value, n.left, n.right, n._count);
  for (let i = stack.length - 2; i >= 0; --i) {
    n = stack[i];
    cstack[i] = n.left === stack[i + 1]
      ? new RBNode(n._color, n.key, n.value, cstack[i + 1], n.right, n._count)
      : new RBNode(n._color, n.key, n.value, n.left, cstack[i + 1], n._count);
  }
  n = cstack[cstack.length - 1];

  // A node with two children swaps with its in-order predecessor leaf.
  if (n.left && n.right) {
    const split = cstack.length;
    n = n.left;
    while (n.right) {
      cstack.push(n);
      n = n.right;
    }
    const v = cstack[split - 1];
    cstack.push(new RBNode(n._color, v.key, v.value, n.left, n.right, n._count));
    cstack[split - 1].key = n.key;
    cstack[split - 1].value = n.value;
    for (let i = cstack.length - 2; i >= split; --i) {
      n = cstack[i];
      cstack[i] = new RBNode(n._color, n.key, n.value, n.left, cstack[i + 1], n._count);
    }
    cstack[split - 1].left = cstack[split];
  }

  n = cstack[cstack.length - 1];
  if (n._color === RED) {
    // A red leaf is removed directly.
    const p = cstack[cstack.length - 2];
    if (p.left === n) p.left = null;
    else if (p.right === n) p.right = null;
    cstack.pop();
    for (let i = 0; i < cstack.length; ++i) cstack[i]._count--;
    return new RedBlackTree(this.tree._compare, cstack[0]);
  }
  if (n.left || n.right) {
    // A black node with one child: that child is red, so lift and repaint it.
    swapNode(n, n.left || n.right);
    n._color = BLACK;
    for (let i = 0; i < cstack.length - 1; ++i) cstack[i]._count--;
    return new RedBlackTree(this.tree._compare, cstack[0]);
  }
  if (cstack.length === 1) return new RedBlackTree(this.tree._compare, null);
  for (let i = 0; i < cstack.length; ++i) cstack[i]._count--;
  const parent = cstack[cstack.length - 2];
  fixDoubleBlack(cstack);
  if (parent.left === n) parent.left = null;
  else parent.right = null;
  return new RedBlackTree(this.tree._compare, cstack[0]);
};

Object.defineProperty(iproto, 'key', {
  enumerable: true,
  get() {
    const stack = this._stack;
    if (stack.length > 0) return stack[stack.length - 1].key;
  },
});

Object.defineProperty(iproto, 'value', {
  enumerable: true,
  get() {
    const stack = this._stack;
    if (stack.length > 0) return stack[stack.length - 1].value;
  },
});

// An invalid iterator reports the end position, as upstream does.
Object.defineProperty(iproto, 'index', {
  enumerable: true,
  get() {
    const stack = this._stack;
    if (stack.length === 0) return this.tree.root ? this.tree.root._count : 0;
    let idx = stack[stack.length - 1].left ? stack[stack.length - 1].left._count : 0;
    for (let s = stack.length - 2; s >= 0; --s) {
      if (stack[s + 1] === stack[s].right) {
        ++idx;
        if (stack[s].left) idx += stack[s].left._count;
      }
    }
    return idx;
  },
});

iproto.next = function () {
  const stack = this._stack;
  if (stack.length === 0) return;
  let n = stack[stack.length - 1];
  if (n.right) {
    for (n = n.right; n; n = n.left) stack.push(n);
  } else {
    stack.pop();
    while (stack.length > 0 && stack[stack.length - 1].right === n) n = stack.pop();
  }
};

Object.defineProperty(iproto, 'hasNext', {
  get() {
    const stack = this._stack;
    if (stack.length === 0) return false;
    if (stack[stack.length - 1].right) return true;
    for (let s = stack.length - 1; s > 0; --s) if (stack[s - 1].left === stack[s]) return true;
    return false;
  },
});

iproto.update = function (value) {
  const stack = this._stack;
  if (stack.length === 0) throw new Error("Can't update empty node!");
  const cstack = new Array(stack.length);
  let n = stack[stack.length - 1];
  cstack[cstack.length - 1] = new RBNode(n._color, n.key, value, n.left, n.right, n._count);
  for (let i = stack.length - 2; i >= 0; --i) {
    n = stack[i];
    cstack[i] = n.left === stack[i + 1]
      ? new RBNode(n._color, n.key, n.value, cstack[i + 1], n.right, n._count)
      : new RBNode(n._color, n.key, n.value, n.left, cstack[i + 1], n._count);
  }
  return new RedBlackTree(this.tree._compare, cstack[0]);
};

iproto.prev = function () {
  const stack = this._stack;
  if (stack.length === 0) return;
  let n = stack[stack.length - 1];
  if (n.left) {
    for (n = n.left; n; n = n.right) stack.push(n);
  } else {
    stack.pop();
    while (stack.length > 0 && stack[stack.length - 1].left === n) n = stack.pop();
  }
};

Object.defineProperty(iproto, 'hasPrev', {
  get() {
    const stack = this._stack;
    if (stack.length === 0) return false;
    if (stack[stack.length - 1].left) return true;
    for (let s = stack.length - 1; s > 0; --s) if (stack[s - 1].right === stack[s]) return true;
    return false;
  },
});


function createRBTree(compare) {
  // A falsy comparator selects the default, as upstream does. Anything else
  // must be callable; upstream accepted it and failed on the second insert.
  if (compare && typeof compare !== 'function') throw new TypeError('compare must be a function');
  return new RedBlackTree(compare || defaultCompare, null);
}

module.exports = createRBTree;
