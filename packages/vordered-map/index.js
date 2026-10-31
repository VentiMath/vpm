'use strict';
// Red-black tree derived from js-sdsl 4.4.2 (MIT); see PROVENANCE.json.
"use strict";
class ContainerIterator {
    constructor(iteratorType = 0) {
        this.iteratorType = iteratorType;
    }
    equals(iter) {
        return this._node === iter._node;
    }
}
class Base {
    constructor() {
        this._length = 0;
    }
    get length() {
        return this._length;
    }
    size() {
        return this._length;
    }
    empty() {
        return this._length === 0;
    }
}
class Container extends Base {
}
class TreeNode {
    constructor(key, value, color = 1) {
        this._left = undefined;
        this._right = undefined;
        this._parent = undefined;
        this._key = key;
        this._value = value;
        this._color = color;
    }
    _pre() {
        let preNode = this;
        const isRootOrHeader = preNode._parent._parent === preNode;
        if (isRootOrHeader && preNode._color === 1) {
            preNode = preNode._right;
        }
        else if (preNode._left) {
            preNode = preNode._left;
            while (preNode._right) {
                preNode = preNode._right;
            }
        }
        else {
            if (isRootOrHeader) {
                return preNode._parent;
            }
            let pre = preNode._parent;
            while (pre._left === preNode) {
                preNode = pre;
                pre = preNode._parent;
            }
            preNode = pre;
        }
        return preNode;
    }
    _next() {
        let nextNode = this;
        if (nextNode._right) {
            nextNode = nextNode._right;
            while (nextNode._left) {
                nextNode = nextNode._left;
            }
            return nextNode;
        }
        else {
            let pre = nextNode._parent;
            while (pre._right === nextNode) {
                nextNode = pre;
                pre = nextNode._parent;
            }
            if (nextNode._right !== pre) {
                return pre;
            }
            else
                return nextNode;
        }
    }
    _rotateLeft() {
        const PP = this._parent;
        const V = this._right;
        const R = V._left;
        if (PP._parent === this)
            PP._parent = V;
        else if (PP._left === this)
            PP._left = V;
        else
            PP._right = V;
        V._parent = PP;
        V._left = this;
        this._parent = V;
        this._right = R;
        if (R)
            R._parent = this;
        return V;
    }
    _rotateRight() {
        const PP = this._parent;
        const F = this._left;
        const K = F._right;
        if (PP._parent === this)
            PP._parent = F;
        else if (PP._left === this)
            PP._left = F;
        else
            PP._right = F;
        F._parent = PP;
        F._right = this;
        this._parent = F;
        this._left = K;
        if (K)
            K._parent = this;
        return F;
    }
}
class TreeNodeEnableIndex extends TreeNode {
    constructor() {
        super(...arguments);
        this._subTreeSize = 1;
    }
    _rotateLeft() {
        const parent = super._rotateLeft();
        this._recount();
        parent._recount();
        return parent;
    }
    _rotateRight() {
        const parent = super._rotateRight();
        this._recount();
        parent._recount();
        return parent;
    }
    _recount() {
        this._subTreeSize = 1;
        if (this._left) {
            this._subTreeSize += this._left._subTreeSize;
        }
        if (this._right) {
            this._subTreeSize += this._right._subTreeSize;
        }
    }
}
function throwIteratorAccessError() {
    throw new RangeError('Iterator access denied!');
}
class TreeContainer extends Container {
    constructor(cmp = function (x, y) {
        if (x < y)
            return -1;
        if (x > y)
            return 1;
        return 0;
    }, enableIndex = false) {
        super();
        this._root = undefined;
        this._cmp = cmp;
        this.enableIndex = enableIndex;
        this._TreeNodeClass = enableIndex ? TreeNodeEnableIndex : TreeNode;
        this._header = new this._TreeNodeClass();
        this._generation = 0;
    }
    _lowerBound(curNode, key) {
        let resNode = this._header;
        while (curNode) {
            const cmpResult = this._cmp(curNode._key, key);
            if (cmpResult < 0) {
                curNode = curNode._right;
            }
            else if (cmpResult > 0) {
                resNode = curNode;
                curNode = curNode._left;
            }
            else
                return curNode;
        }
        return resNode;
    }
    _upperBound(curNode, key) {
        let resNode = this._header;
        while (curNode) {
            const cmpResult = this._cmp(curNode._key, key);
            if (cmpResult <= 0) {
                curNode = curNode._right;
            }
            else {
                resNode = curNode;
                curNode = curNode._left;
            }
        }
        return resNode;
    }
    _reverseLowerBound(curNode, key) {
        let resNode = this._header;
        while (curNode) {
            const cmpResult = this._cmp(curNode._key, key);
            if (cmpResult < 0) {
                resNode = curNode;
                curNode = curNode._right;
            }
            else if (cmpResult > 0) {
                curNode = curNode._left;
            }
            else
                return curNode;
        }
        return resNode;
    }
    _reverseUpperBound(curNode, key) {
        let resNode = this._header;
        while (curNode) {
            const cmpResult = this._cmp(curNode._key, key);
            if (cmpResult < 0) {
                resNode = curNode;
                curNode = curNode._right;
            }
            else {
                curNode = curNode._left;
            }
        }
        return resNode;
    }
    _eraseNodeSelfBalance(curNode) {
        while (true) {
            const parentNode = curNode._parent;
            if (parentNode === this._header)
                return;
            if (curNode._color === 1) {
                curNode._color = 0;
                return;
            }
            if (curNode === parentNode._left) {
                const brother = parentNode._right;
                if (brother._color === 1) {
                    brother._color = 0;
                    parentNode._color = 1;
                    if (parentNode === this._root) {
                        this._root = parentNode._rotateLeft();
                    }
                    else
                        parentNode._rotateLeft();
                }
                else {
                    if (brother._right && brother._right._color === 1) {
                        brother._color = parentNode._color;
                        parentNode._color = 0;
                        brother._right._color = 0;
                        if (parentNode === this._root) {
                            this._root = parentNode._rotateLeft();
                        }
                        else
                            parentNode._rotateLeft();
                        return;
                    }
                    else if (brother._left && brother._left._color === 1) {
                        brother._color = 1;
                        brother._left._color = 0;
                        brother._rotateRight();
                    }
                    else {
                        brother._color = 1;
                        curNode = parentNode;
                    }
                }
            }
            else {
                const brother = parentNode._left;
                if (brother._color === 1) {
                    brother._color = 0;
                    parentNode._color = 1;
                    if (parentNode === this._root) {
                        this._root = parentNode._rotateRight();
                    }
                    else
                        parentNode._rotateRight();
                }
                else {
                    if (brother._left && brother._left._color === 1) {
                        brother._color = parentNode._color;
                        parentNode._color = 0;
                        brother._left._color = 0;
                        if (parentNode === this._root) {
                            this._root = parentNode._rotateRight();
                        }
                        else
                            parentNode._rotateRight();
                        return;
                    }
                    else if (brother._right && brother._right._color === 1) {
                        brother._color = 1;
                        brother._right._color = 0;
                        brother._rotateLeft();
                    }
                    else {
                        brother._color = 1;
                        curNode = parentNode;
                    }
                }
            }
        }
    }
    _eraseNode(curNode) {
        if (this._length === 1) {
            this.clear();
            return;
        }
        let swapNode = curNode;
        while (swapNode._left || swapNode._right) {
            if (swapNode._right) {
                swapNode = swapNode._right;
                while (swapNode._left)
                    swapNode = swapNode._left;
            }
            else {
                swapNode = swapNode._left;
            }
            const key = curNode._key;
            curNode._key = swapNode._key;
            swapNode._key = key;
            const value = curNode._value;
            curNode._value = swapNode._value;
            swapNode._value = value;
            curNode = swapNode;
        }
        if (this._header._left === swapNode) {
            this._header._left = swapNode._parent;
        }
        else if (this._header._right === swapNode) {
            this._header._right = swapNode._parent;
        }
        this._eraseNodeSelfBalance(swapNode);
        let _parent = swapNode._parent;
        if (swapNode === _parent._left) {
            _parent._left = undefined;
        }
        else
            _parent._right = undefined;
        // A detached node must never be accepted as a live iterator again.
        curNode._parent = undefined;
        this._length -= 1;
        this._root._color = 0;
        if (this.enableIndex) {
            while (_parent !== this._header) {
                _parent._subTreeSize -= 1;
                _parent = _parent._parent;
            }
        }
    }
    _inOrderTraversal(param) {
        const pos = typeof param === 'number' ? param : undefined;
        const callback = typeof param === 'function' ? param : undefined;
        const nodeList = typeof param === 'undefined' ? [] : undefined;
        let index = 0;
        let curNode = this._root;
        const stack = [];
        while (stack.length || curNode) {
            if (curNode) {
                stack.push(curNode);
                curNode = curNode._left;
            }
            else {
                curNode = stack.pop();
                if (index === pos)
                    return curNode;
                nodeList && nodeList.push(curNode);
                callback && callback(curNode, index, this);
                index += 1;
                curNode = curNode._right;
            }
        }
        return nodeList;
    }
    _insertNodeSelfBalance(curNode) {
        while (true) {
            const parentNode = curNode._parent;
            if (parentNode._color === 0)
                return;
            const grandParent = parentNode._parent;
            if (parentNode === grandParent._left) {
                const uncle = grandParent._right;
                if (uncle && uncle._color === 1) {
                    uncle._color = parentNode._color = 0;
                    if (grandParent === this._root)
                        return;
                    grandParent._color = 1;
                    curNode = grandParent;
                    continue;
                }
                else if (curNode === parentNode._right) {
                    curNode._color = 0;
                    if (curNode._left) {
                        curNode._left._parent = parentNode;
                    }
                    if (curNode._right) {
                        curNode._right._parent = grandParent;
                    }
                    parentNode._right = curNode._left;
                    grandParent._left = curNode._right;
                    curNode._left = parentNode;
                    curNode._right = grandParent;
                    if (grandParent === this._root) {
                        this._root = curNode;
                        this._header._parent = curNode;
                    }
                    else {
                        const GP = grandParent._parent;
                        if (GP._left === grandParent) {
                            GP._left = curNode;
                        }
                        else
                            GP._right = curNode;
                    }
                    curNode._parent = grandParent._parent;
                    parentNode._parent = curNode;
                    grandParent._parent = curNode;
                    grandParent._color = 1;
                }
                else {
                    parentNode._color = 0;
                    if (grandParent === this._root) {
                        this._root = grandParent._rotateRight();
                    }
                    else
                        grandParent._rotateRight();
                    grandParent._color = 1;
                    return;
                }
            }
            else {
                const uncle = grandParent._left;
                if (uncle && uncle._color === 1) {
                    uncle._color = parentNode._color = 0;
                    if (grandParent === this._root)
                        return;
                    grandParent._color = 1;
                    curNode = grandParent;
                    continue;
                }
                else if (curNode === parentNode._left) {
                    curNode._color = 0;
                    if (curNode._left) {
                        curNode._left._parent = grandParent;
                    }
                    if (curNode._right) {
                        curNode._right._parent = parentNode;
                    }
                    grandParent._right = curNode._left;
                    parentNode._left = curNode._right;
                    curNode._left = grandParent;
                    curNode._right = parentNode;
                    if (grandParent === this._root) {
                        this._root = curNode;
                        this._header._parent = curNode;
                    }
                    else {
                        const GP = grandParent._parent;
                        if (GP._left === grandParent) {
                            GP._left = curNode;
                        }
                        else
                            GP._right = curNode;
                    }
                    curNode._parent = grandParent._parent;
                    parentNode._parent = curNode;
                    grandParent._parent = curNode;
                    grandParent._color = 1;
                }
                else {
                    parentNode._color = 0;
                    if (grandParent === this._root) {
                        this._root = grandParent._rotateLeft();
                    }
                    else
                        grandParent._rotateLeft();
                    grandParent._color = 1;
                    return;
                }
            }
            if (this.enableIndex) {
                parentNode._recount();
                grandParent._recount();
                curNode._recount();
            }
            return;
        }
    }
    _set(key, value, hint) {
        if (this._root === undefined) {
            this._length += 1;
            this._root = new this._TreeNodeClass(key, value, 0);
            this._root._parent = this._header;
            this._header._parent = this._header._left = this._header._right = this._root;
            return this._length;
        }
        let curNode;
        const minNode = this._header._left;
        const compareToMin = this._cmp(minNode._key, key);
        if (compareToMin === 0) {
            minNode._value = value;
            return this._length;
        }
        else if (compareToMin > 0) {
            minNode._left = new this._TreeNodeClass(key, value);
            minNode._left._parent = minNode;
            curNode = minNode._left;
            this._header._left = curNode;
        }
        else {
            const maxNode = this._header._right;
            const compareToMax = this._cmp(maxNode._key, key);
            if (compareToMax === 0) {
                maxNode._value = value;
                return this._length;
            }
            else if (compareToMax < 0) {
                maxNode._right = new this._TreeNodeClass(key, value);
                maxNode._right._parent = maxNode;
                curNode = maxNode._right;
                this._header._right = curNode;
            }
            else {
                if (hint !== undefined) {
                    const iterNode = hint._node;
                    if (iterNode !== this._header) {
                        const iterCmpRes = this._cmp(iterNode._key, key);
                        if (iterCmpRes === 0) {
                            iterNode._value = value;
                            return this._length;
                        }
                        else if (iterCmpRes > 0) {
                            const preNode = iterNode._pre();
                            const preCmpRes = this._cmp(preNode._key, key);
                            if (preCmpRes === 0) {
                                preNode._value = value;
                                return this._length;
                            }
                            else if (preCmpRes < 0) {
                                curNode = new this._TreeNodeClass(key, value);
                                if (preNode._right === undefined) {
                                    preNode._right = curNode;
                                    curNode._parent = preNode;
                                }
                                else {
                                    iterNode._left = curNode;
                                    curNode._parent = iterNode;
                                }
                            }
                        }
                    }
                }
                if (curNode === undefined) {
                    curNode = this._root;
                    while (true) {
                        const cmpResult = this._cmp(curNode._key, key);
                        if (cmpResult > 0) {
                            if (curNode._left === undefined) {
                                curNode._left = new this._TreeNodeClass(key, value);
                                curNode._left._parent = curNode;
                                curNode = curNode._left;
                                break;
                            }
                            curNode = curNode._left;
                        }
                        else if (cmpResult < 0) {
                            if (curNode._right === undefined) {
                                curNode._right = new this._TreeNodeClass(key, value);
                                curNode._right._parent = curNode;
                                curNode = curNode._right;
                                break;
                            }
                            curNode = curNode._right;
                        }
                        else {
                            curNode._value = value;
                            return this._length;
                        }
                    }
                }
            }
        }
        if (this.enableIndex) {
            let parent = curNode._parent;
            while (parent !== this._header) {
                parent._subTreeSize += 1;
                parent = parent._parent;
            }
        }
        this._insertNodeSelfBalance(curNode);
        this._length += 1;
        return this._length;
    }
    _getTreeNodeByKey(curNode, key) {
        while (curNode) {
            const cmpResult = this._cmp(curNode._key, key);
            if (cmpResult < 0) {
                curNode = curNode._right;
            }
            else if (cmpResult > 0) {
                curNode = curNode._left;
            }
            else
                return curNode;
        }
        return curNode || this._header;
    }
    _checkIterator(iter, allowEnd) {
        if (!(iter instanceof OrderedMapIterator) || iter.container !== this) {
            throw new TypeError('Iterator belongs to another map');
        }
        iter._check(allowEnd);
    }
    _nodeAt(pos) {
        if (!Number.isInteger(pos) || pos < 0 || pos >= this._length) throw new RangeError('Invalid position');
        if (!this.enableIndex) return this._inOrderTraversal(pos);
        // Indexed nodes already maintain subtree sizes during balancing.
        // Select by rank in O(log n), without a linear traversal prefix.
        let node = this._root;
        for (;;) {
            const leftSize = node._left ? node._left._subTreeSize : 0;
            if (pos === leftSize) return node;
            if (pos < leftSize) node = node._left;
            else { pos -= leftSize + 1; node = node._right; }
        }
    }
    clear() {
        this._generation += 1;
        this._length = 0;
        this._root = undefined;
        this._header._parent = undefined;
        this._header._left = this._header._right = undefined;
    }
    updateKeyByIterator(iter, key) {
        this._checkIterator(iter, false);
        const node = iter._node;
        if (node === this._header) {
            throwIteratorAccessError();
        }
        if (this._length === 1) {
            node._key = key;
            return true;
        }
        const nextKey = node._next()._key;
        if (node === this._header._left) {
            if (this._cmp(nextKey, key) > 0) {
                node._key = key;
                return true;
            }
            return false;
        }
        const preKey = node._pre()._key;
        if (node === this._header._right) {
            if (this._cmp(preKey, key) < 0) {
                node._key = key;
                return true;
            }
            return false;
        }
        if (this._cmp(preKey, key) >= 0 ||
            this._cmp(nextKey, key) <= 0)
            return false;
        node._key = key;
        return true;
    }
    eraseElementByPos(pos) {
        const node = this._nodeAt(pos);
        this._eraseNode(node);
        return this._length;
    }
    eraseElementByKey(key) {
        if (this._length === 0)
            return false;
        const curNode = this._getTreeNodeByKey(this._root, key);
        if (curNode === this._header)
            return false;
        this._eraseNode(curNode);
        return true;
    }
    eraseElementByIterator(iter) {
        this._checkIterator(iter, false);
        const node = iter._node;
        if (node === this._header) {
            throwIteratorAccessError();
        }
        const hasNoRight = node._right === undefined;
        const isNormal = iter.iteratorType === 0;
        if (isNormal) {
            if (hasNoRight)
                iter.next();
        }
        else {
            if (!hasNoRight || node._left === undefined)
                iter.next();
        }
        this._eraseNode(node);
        iter._generation = this._generation;
        return iter;
    }
    getHeight() {
        if (this._length === 0)
            return 0;
        function traversal(curNode) {
            if (!curNode)
                return 0;
            return Math.max(traversal(curNode._left), traversal(curNode._right)) + 1;
        }
        return traversal(this._root);
    }
}
class TreeIterator extends ContainerIterator {
    constructor(node, header, iteratorType) {
        super(iteratorType);
        this._node = node;
        this._header = header;
    }
    _check(allowEnd = false) {
        if (this._generation !== this.container._generation ||
            (this._node === this._header ? !allowEnd : this._node._parent === undefined)) {
            throwIteratorAccessError();
        }
    }
    pre() {
        this._check(true);
        const edge = this.iteratorType === 0 ? this._header._left : this._header._right;
        if (!edge || this._node === edge) throwIteratorAccessError();
        this._node = this._node === this._header
            ? (this.iteratorType === 0 ? this._header._right : this._header._left)
            : (this.iteratorType === 0 ? this._node._pre() : this._node._next());
        return this;
    }
    next() {
        this._check();
        this._node = this.iteratorType === 0 ? this._node._next() : this._node._pre();
        return this;
    }
    get index() {
        this._check(true);
        if (!this.container.enableIndex) throw new RangeError('Iterator indexing is disabled');
        let _node = this._node;
        const root = this._header._parent;
        if (_node === this._header) {
            if (root) {
                return root._subTreeSize - 1;
            }
            return 0;
        }
        let index = 0;
        if (_node._left) {
            index += _node._left._subTreeSize;
        }
        while (_node !== root) {
            const _parent = _node._parent;
            if (_node === _parent._right) {
                index += 1;
                if (_parent._left) {
                    index += _parent._left._subTreeSize;
                }
            }
            _node = _parent;
        }
        return index;
    }
    isAccessible() {
        return this._generation === this.container._generation &&
            this._node !== this._header && this._node._parent !== undefined;
    }
}
class OrderedMapIterator extends TreeIterator {
    constructor(node, header, container, iteratorType) {
        super(node, header, iteratorType);
        this.container = container;
        this._generation = container._generation;
        this._pointer = undefined;
    }
    get pointer() {
        this._check();
        if (this._pointer) return this._pointer;
        const self = this;
        // Keep the upstream live pair semantics while allocating at most once
        // per iterator. A retained pair follows next()/pre(), including checks.
        return this._pointer = new Proxy([], {
            get(target, prop) {
                self._check();
                if (prop === '0')
                    return self._node._key;
                else if (prop === '1')
                    return self._node._value;
                target[0] = self._node._key;
                target[1] = self._node._value;
                return target[prop];
            },
            set(_, prop, newValue) {
                self._check();
                if (prop !== '1') {
                    throw new TypeError('prop must be 1');
                }
                self._node._value = newValue;
                return true;
            }
        });
    }
    copy() {
        const copy = new OrderedMapIterator(this._node, this._header, this.container, this.iteratorType);
        copy._generation = this._generation;
        return copy;
    }
}
class OrderedMap extends TreeContainer {
    constructor(container = [], cmp, enableIndex) {
        super(cmp, enableIndex);
        const self = this;
        container.forEach(function (el) {
            self.setElement(el[0], el[1]);
        });
    }
    begin() {
        return new OrderedMapIterator(this._header._left || this._header, this._header, this);
    }
    end() {
        return new OrderedMapIterator(this._header, this._header, this);
    }
    rBegin() {
        return new OrderedMapIterator(this._header._right || this._header, this._header, this, 1);
    }
    rEnd() {
        return new OrderedMapIterator(this._header, this._header, this, 1);
    }
    front() {
        if (this._length === 0)
            return;
        const minNode = this._header._left;
        return [minNode._key, minNode._value];
    }
    back() {
        if (this._length === 0)
            return;
        const maxNode = this._header._right;
        return [maxNode._key, maxNode._value];
    }
    lowerBound(key) {
        const resNode = this._lowerBound(this._root, key);
        return new OrderedMapIterator(resNode, this._header, this);
    }
    upperBound(key) {
        const resNode = this._upperBound(this._root, key);
        return new OrderedMapIterator(resNode, this._header, this);
    }
    reverseLowerBound(key) {
        const resNode = this._reverseLowerBound(this._root, key);
        return new OrderedMapIterator(resNode, this._header, this);
    }
    reverseUpperBound(key) {
        const resNode = this._reverseUpperBound(this._root, key);
        return new OrderedMapIterator(resNode, this._header, this);
    }
    forEach(callback) {
        this._inOrderTraversal(function (node, index, map) {
            callback([node._key, node._value], index, map);
        });
    }
    setElement(key, value, hint) {
        if (hint !== undefined) this._checkIterator(hint, true);
        return this._set(key, value, hint);
    }
    getElementByPos(pos) {
        const node = this._nodeAt(pos);
        return [node._key, node._value];
    }
    find(key) {
        const curNode = this._getTreeNodeByKey(this._root, key);
        return new OrderedMapIterator(curNode, this._header, this);
    }
    getElementByKey(key) {
        const curNode = this._getTreeNodeByKey(this._root, key);
        return curNode._value;
    }
    union(other) {
        const self = this;
        other.forEach(function (el) {
            self.setElement(el[0], el[1]);
        });
        return this._length;
    }
    *[Symbol.iterator]() {
        const length = this._length;
        const nodeList = this._inOrderTraversal();
        for (let i = 0; i < length; ++i) {
            const node = nodeList[i];
            yield [node._key, node._value];
        }
    }
}

exports.OrderedMap = OrderedMap;
