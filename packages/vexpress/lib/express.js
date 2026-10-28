/*!
 * express
 * Copyright(c) 2009-2013 TJ Holowaychuk
 * Copyright(c) 2013 Roman Shtylman
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * MIT Licensed
 */

'use strict';

/**
 * Module dependencies.
 */

var bodyParser = require('vbody-parser')
var EventEmitter = require('node:events').EventEmitter;
var mixin = require('vmerge-descriptors');
var isProxy = require('node:util').types.isProxy;
var proto = require('./application');
var Router = require('vrouter');
var req = require('./request');
var res = require('./response');

/**
 * Expose `createApplication()`.
 */

exports = module.exports = createApplication;

/**
 * Create an express application.
 *
 * @return {Function}
 * @api public
 */

function createApplication() {
  var app = function(req, res, next) {
    app.handle(req, res, next);
  };

  mixinApplication(app, EventEmitter.prototype);
  mixinApplication(app, proto);

  // expose the prototype that will get set on requests
  app.request = Object.create(req, {
    app: { configurable: true, enumerable: true, writable: true, value: app }
  })

  // expose the prototype that will get set on responses
  app.response = Object.create(res, {
    app: { configurable: true, enumerable: true, writable: true, value: app }
  })

  app.init();
  return app;
}

// This destination is a fresh ordinary function. A missing property can be
// assigned with exactly the attributes of an ordinary writable data descriptor.
// Check live descriptors on every creation so prototype customizations still
// apply, without invoking getters or sharing an application method snapshot.
function mixinApplication(app, source) {
  // Proxy traps or a custom function prototype chain could intercept assignment
  // (including a misleading `has` trap). Keep the general descriptor path there.
  if (source === null || (typeof source !== 'object' && typeof source !== 'function') ||
      isProxy(source) || Object.getPrototypeOf(Function.prototype) !== Object.prototype) {
    return mixin(app, source, false);
  }

  var keys = Object.getOwnPropertyNames(source);
  var symbols = Object.getOwnPropertySymbols(source);
  for (var s = 0; s < symbols.length; s++) keys.push(symbols[s]);

  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var exists = key in app;
    if (exists && Object.hasOwn(app, key)) continue;
    var descriptor = Object.getOwnPropertyDescriptor(source, key);
    if (!exists && descriptor.writable && descriptor.enumerable && descriptor.configurable) {
      app[key] = descriptor.value;
    } else {
      Object.defineProperty(app, key, descriptor);
    }
  }
  return app;
}

/**
 * Expose the prototypes.
 */

exports.application = proto;
exports.request = req;
exports.response = res;

/**
 * Expose constructors.
 */

exports.Route = Router.Route;
exports.Router = Router;

/**
 * Expose middleware
 */

exports.json = bodyParser.json
exports.raw = bodyParser.raw
exports.static = require('vserve-static');
exports.text = bodyParser.text
exports.urlencoded = bodyParser.urlencoded
