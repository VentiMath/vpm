'use strict';

// Links preserve live iterator behavior even when the queue is cleared or drained.
class Queue {
  #head;
  #tail;
  #size = 0;

  enqueue(value) {
    const node = { value, next: undefined };
    if (this.#tail) this.#tail.next = node;
    else this.#head = node;
    this.#tail = node;
    this.#size++;
  }

  dequeue() {
    const node = this.#head;
    if (!node) return;
    this.#head = node.next;
    if (!this.#head) this.#tail = undefined;
    this.#size--;
    return node.value;
  }

  peek() { return this.#head?.value; }
  get size() { return this.#size; }

  clear() {
    this.#head = this.#tail = undefined;
    this.#size = 0;
  }

  *[Symbol.iterator]() {
    let node = this.#head;
    while (node) {
      yield node.value;
      node = node.next;
    }
  }

  *drain() {
    while (this.#head) yield this.dequeue();
  }
}
module.exports = Queue;
