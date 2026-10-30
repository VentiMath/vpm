'use strict';
const extend = require('vextend');
const {ResourceStream, limit, streamOptions} = require('./resource-stream');
const registrations = new WeakMap();
class Paginator {
  extend(Class, methodNames) {
    const prototype = Class?.prototype;
    if (typeof Class !== 'function' || !prototype) throw new TypeError('Expected a class with a prototype');
    if (typeof methodNames === 'string') methodNames = [methodNames];
    if (!Array.isArray(methodNames)) throw new TypeError('Expected method names');
    const previous = registrations.get(prototype), plans = [], seen = new Set();
    for (const name of methodNames) {
      if (typeof name !== 'string' || !name || ['constructor','__proto__','prototype'].includes(name)) throw new TypeError('Invalid pagination method name');
      if (seen.has(name)) continue; seen.add(name);
      const original = prototype[name];
      if (typeof original !== 'function') throw new TypeError('Expected a pagination method: ' + name);
      if (previous?.get(name)?.wrapper === original) continue;
      for (const key of [name, name + '_']) {
        const descriptor = Object.getOwnPropertyDescriptor(prototype,key);
        if (descriptor && (!('value' in descriptor) || !descriptor.configurable && !descriptor.writable)) throw new TypeError('Cannot replace pagination method: ' + key);
        if (!descriptor && !Object.isExtensible(prototype)) throw new TypeError('Cannot extend a non-extensible prototype');
      }
      if (Object.hasOwn(prototype,name + '_') && prototype[name + '_'] !== original && !previous?.has(name)) throw new TypeError('Pagination backup already exists: ' + name + '_');
      const paginator = this;
      function wrapper(...args) {return paginator.run_(paginator.parseArguments_(args),original.bind(this));}
      plans.push({name, original, wrapper});
    }
    const registry = previous || new Map();
    for (const plan of plans) {
      for (const [key,value] of [[plan.name + '_',plan.original],[plan.name,plan.wrapper]]) {
        const old = Object.getOwnPropertyDescriptor(prototype,key);
        Object.defineProperty(prototype,key,old ? {...old,value} : {value,writable:true,enumerable:true,configurable:true});
      }
      registry.set(plan.name,plan);
    }
    registrations.set(prototype,registry);
  }
  streamify(methodName) {
    if (typeof methodName !== 'string' || !methodName) throw new TypeError('Expected a method name');
    const paginator = this;
    return function(...args) {
      const method = this[methodName + '_'] || this[methodName];
      if (typeof method !== 'function') throw new TypeError('Expected a pagination method: ' + methodName);
      return paginator.runAsStream_(paginator.parseArguments_(args),method.bind(this));
    };
  }
  parseArguments_(args) {
    let query = args[0], callback, autoPaginate = true, maxApiCalls = -1, maxResults = -1;
    if (typeof query === 'function') {callback = query; query = undefined;}
    if (typeof args[args.length-1] === 'function') callback = args[args.length-1];
    if (query == null) query = {};
    else if (typeof query === 'object' && !Array.isArray(query)) query = extend(true,{},query);
    else if (typeof query !== 'string') throw new TypeError('Query must be an object or string');
    if (typeof query === 'object') {
      if (query.maxResults !== undefined) maxResults = limit(query.maxResults,'maxResults',-1);
      else if (query.pageSize !== undefined) maxResults = limit(query.pageSize,'pageSize',-1);
      if (query.maxApiCalls !== undefined) maxApiCalls = limit(query.maxApiCalls,'maxApiCalls',-1);
      delete query.maxApiCalls;
      if (query.autoPaginate !== undefined && typeof query.autoPaginate !== 'boolean') throw new TypeError('autoPaginate must be a boolean');
      if (maxResults !== -1 || query.autoPaginate === false) autoPaginate = false;
    }
    return {query,callback,autoPaginate,maxApiCalls,maxResults,streamOptions:streamOptions(query)};
  }
  run_(args, originalMethod) {
    if (!args.autoPaginate) return originalMethod(args.query,args.callback);
    const results = [], stream = this.runAsStream_(args,originalMethod);
    const promise = new Promise((resolve,reject) => {
      let settled = false;
      const settle = (error,value) => {if (settled) return; settled = true; if (error) reject(error); else resolve(value);};
      stream.on('data',value=>results.push(value));
      stream.on('error',error=>settle(error));
      stream.on('end',()=>settle(null,[results,args.query,...(stream._otherArgs || [])]));
      stream.on('close',()=>{if (!settled) settle(Object.assign(new Error('Pagination stream closed before completion'),{code:'ERR_STREAM_PREMATURE_CLOSE'}));});
    });
    if (!args.callback) return promise;
    promise.then(values=>args.callback(null,...values),error=>args.callback(error));
  }
  runAsStream_(args, originalMethod) {return new ResourceStream(args,originalMethod);}
}
exports.Paginator = Paginator;
exports.paginator = new Paginator();
exports.ResourceStream = ResourceStream;
