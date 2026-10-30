import Queue from 'vyocto-queue';
import QueueCjs = require('vyocto-queue');
const queue = new Queue<string>();
queue.enqueue('ok');
const value: string | undefined = queue.dequeue();
const values: string[] = [...queue.drain()];
const cjs = new QueueCjs<number>(); cjs.enqueue(1);
// @ts-expect-error element type is checked
queue.enqueue(1);
// @ts-expect-error size is read-only
queue.size = 1;
void [value, values];
