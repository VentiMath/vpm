'use strict';
const { EventEmitter } = require('node:events');

class Request extends EventEmitter {
  constructor(pending = false) {
    super();
    this.url = '/missing?private=query';
    this.method = 'GET';
    this.httpVersionMajor = 1;
    this.complete = !pending;
    this.readable = pending;
    this.socket = new EventEmitter();
    Object.assign(this.socket, { readable: true, writable: true, destroyed: false, destroys: 0 });
    this.socket.destroy = () => { this.socket.destroyed = true; this.socket.destroys++; };
    this.unpipes = 0;
    this.resumes = 0;
  }
  unpipe() { this.unpipes++; return this; }
  resume() { this.resumes++; return this; }
  finish() { this.complete = true; this.readable = false; this.emit('end'); }
}

class Response {
  constructor() {
    this.statusCode = 200;
    this.statusMessage = 'Old message';
    this.headers = Object.create(null);
    this.headersSent = false;
    this.writableEnded = false;
    this.destroyed = false;
    this.ends = 0;
    this.body = '';
  }
  setHeader(name, value) {
    if (this.headersSent) throw new Error('headers already sent');
    this.headers[name.toLowerCase()] = value;
  }
  removeHeader(name) {
    if (this.headersSent) throw new Error('headers already sent');
    delete this.headers[name.toLowerCase()];
  }
  end(body = '') {
    if (this.writableEnded) throw new Error('response already ended');
    this.body = body;
    this.headersSent = this.writableEnded = true;
    this.ends++;
  }
}

function snapshot(response) {
  return { status: response.statusCode, message: response.statusMessage, headers: response.headers,
    body: response.body, ends: response.ends };
}

module.exports = { Request, Response, snapshot };
