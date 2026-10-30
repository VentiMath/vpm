'use strict';

var crypto = require('node:crypto');

/**
 * Exported function
 *
 * Options:
 *
 *  - `algorithm` hash algo to be used by this instance: *'sha1', 'md5'
 *  - `excludeValues` {true|*false} hash object keys, values ignored
 *  - `encoding` hash encoding, supports 'buffer', '*hex', 'binary', 'base64'
 *  - `ignoreUnknown` {true|*false} ignore unknown object types
 *  - `replacer` optional function that replaces values before hashing
 *  - `respectFunctionProperties` {*true|false} consider function properties when hashing
 *  - `respectFunctionNames` {*true|false} consider 'name' property of functions for hashing
 *  - `respectType` {*true|false} Respect special properties (prototype, constructor)
 *    when hashing to distinguish between types
 *  - `unorderedArrays` {true|*false} Sort all arrays before hashing
 *  - `unorderedSets` {*true|false} Sort `Set` and `Map` instances before hashing
 *  * = default
 *
 * @param {object} object value to hash
 * @param {object} options hashing options
 * @return {string} hash value
 * @api public
 */
exports = module.exports = objectHash;

function objectHash(object, options){
  // gax passes JSON strings. Preserve the exact upstream serialization while
  // avoiding a per-call options record and the generic object visitor.
  if (options == null && typeof object === 'string') {
    const digest = crypto.createHash('sha1');
    digest.update('string:' + object.length + ':');
    digest.update(object);
    return digest.digest('hex');
  }
  options = applyDefaults(object, options);
  return hash(object, options);
}

/**
 * Exported sugar methods
 *
 * @param {object} object value to hash
 * @return {string} hash value
 * @api public
 */
exports.sha1 = function(object){
  return objectHash(object);
};
exports.keys = function(object){
  return objectHash(object, {excludeValues: true, algorithm: 'sha1', encoding: 'hex'});
};
exports.MD5 = function(object){
  return objectHash(object, {algorithm: 'md5', encoding: 'hex'});
};
exports.keysMD5 = function(object){
  return objectHash(object, {algorithm: 'md5', encoding: 'hex', excludeValues: true});
};

// Internals
var hashes = crypto.getHashes ? crypto.getHashes().slice() : ['sha1', 'md5'];
hashes.push('passthrough');
var encodings = ['buffer', 'hex', 'binary', 'base64'];

const algorithms = new Map(hashes.map(name => [name.toLowerCase(), name]));
const defaults = Object.freeze({algorithm:'sha1',encoding:'hex',excludeValues:false,
  ignoreUnknown:false,respectType:true,respectFunctionNames:true,
  respectFunctionProperties:true,unorderedArrays:false,unorderedSets:true,
  unorderedObjects:true,replacer:undefined,excludeKeys:undefined});
function applyDefaults(object, source) {
  if (object === undefined) throw new Error('Object argument required.');
  if (source == null) return defaults;
  if (typeof source !== 'object' || Array.isArray(source)) throw new TypeError('Options must be an object');
  const options = {...defaults};
  for (const key of Object.keys(defaults)) {
    if (!Object.hasOwn(source, key)) continue;
    const value = source[key];
    if (value === undefined) continue;
    if (key === 'algorithm' || key === 'encoding') {
      if (typeof value !== 'string') throw new TypeError(key + ' must be a string');
      options[key] = value.toLowerCase();
    } else if (key === 'replacer' || key === 'excludeKeys') {
      if (typeof value !== 'function') throw new TypeError(key + ' must be a function');
      options[key] = value;
    } else {
      if (typeof value !== 'boolean') throw new TypeError(key + ' must be a boolean');
      options[key] = value;
    }
  }
  const algorithm = algorithms.get(options.algorithm);
  if (!algorithm) throw new Error('Algorithm "' + options.algorithm + '" not supported');
  options.algorithm = algorithm;
  if (!encodings.includes(options.encoding) && options.algorithm !== 'passthrough') {
    throw new Error('Encoding "' + options.encoding + '" not supported');
  }
  return options;
}

/** Check if the given function is a native function */
function isNativeFunction(f) {
  if ((typeof f) !== 'function') {
    return false;
  }
  var exp = /^function\s+\w*\s*\(\s*\)\s*{\s+\[native code\]\s+}$/i;
  return exp.exec(Function.prototype.toString.call(f)) != null;
}

function hash(object, options) {
  var hashingStream;

  if (options.algorithm !== 'passthrough') {
    hashingStream = crypto.createHash(options.algorithm);
  } else {
    hashingStream = new PassThrough();
  }

  if (typeof hashingStream.write === 'undefined') {
    hashingStream.write = hashingStream.update;
    hashingStream.end   = hashingStream.update;
  }

  var hasher = typeHasher(options, hashingStream);
  hasher.dispatch(object);
  if (!hashingStream.update) {
    hashingStream.end('');
  }

  if (hashingStream.digest) {
    return hashingStream.digest(options.encoding === 'buffer' ? undefined : options.encoding);
  }

  var buf = hashingStream.read();
  if (options.encoding === 'buffer') return Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  // Passthrough historically returns the serialization text, not a hex digest.
  return typeof buf === 'string' ? buf : buf.toString('utf8');
}

/**
 * Expose streaming API
 *
 * @param {object} object  Value to serialize
 * @param {object} options  Options, as for hash()
 * @param {object} stream  A stream to write the serializiation to
 * @api public
 */
exports.writeToStream = function(object, options, stream) {
  if (typeof stream === 'undefined') {
    stream = options;
    options = {};
  }

  options = applyDefaults(object, options);

  return typeHasher(options, stream).dispatch(object);
};

function typeHasher(options, writeTo, context){
  context = context || [];
  var write = function(str) {
    if (writeTo.update) {
      return writeTo.update(str, 'utf8');
    } else {
      return writeTo.write(str, 'utf8');
    }
  };

  return {
    dispatch: function(value, orderedArray){
      if (options.replacer) {
        value = options.replacer(value);
      }

      var type = typeof value;
      if (value === null) {
        type = 'null';
      }

      //console.log("[DEBUG] Dispatch: ", value, "->", type, " -> ", "_" + type);

      return this['_' + type](value, orderedArray);
    },
    _object: function(object, orderedArray) {
      var pattern = (/\[object (.*)\]/i);
      var objString = Object.prototype.toString.call(object);
      var objType = pattern.exec(objString);
      if (!objType) { // object type did not match [object ...]
        objType = 'unknown:[' + objString + ']';
      } else {
        objType = objType[1]; // take only the class name
      }

      objType = objType.toLowerCase();
      // Bun currently brands native File values as Blob.
      if (objType === 'blob' && typeof File !== 'undefined' && object instanceof File) objType = 'file';

      var objectNumber = null;

      if ((objectNumber = context.indexOf(object)) >= 0) {
        return this.dispatch('[CIRCULAR:' + objectNumber + ']');
      } else {
        context.push(object);
      }

      if (typeof Buffer !== 'undefined' && Buffer.isBuffer && Buffer.isBuffer(object)) {
        write('buffer:' + object.length + ':');
        return write(object);
      }

      if(objType !== 'object' && objType !== 'function' && objType !== 'asyncfunction') {
        if(Object.hasOwn(this, '_' + objType)) {
          this['_' + objType](object, orderedArray ? false : undefined);
        } else if (options.ignoreUnknown) {
          return write('[' + objType + ']');
        } else {
          throw new Error('Unknown object type "' + objType + '"');
        }
      }else{
        var keys = Object.keys(object);
        if (options.unorderedObjects) {
          keys = keys.sort();
        }
        // Make sure to incorporate special properties, so
        // Types with different prototypes will produce
        // a different hash and objects derived from
        // different functions (`new Foo`, `new Bar`) will
        // produce different hashes.
        // We never do this for native functions since some
        // seem to break because of that.
        if (options.respectType !== false && !isNativeFunction(object)) {
          keys.splice(0, 0, 'prototype', '__proto__', 'constructor');
        }

        if (options.excludeKeys) {
          keys = keys.filter(function(key) { return !options.excludeKeys(key); });
        }

        write('object:' + keys.length + ':');
        var self = this;
        return keys.forEach(function(key){
          self.dispatch(key);
          write(':');
          if(!options.excludeValues) {
            self.dispatch(object[key]);
          }
          write(',');
        });
      }
    },
    _array: function(arr, unordered, orderedEntries){
      unordered = typeof unordered !== 'undefined' ? unordered :
        options.unorderedArrays !== false; // default to options.unorderedArrays

      var self = this;
      write('array:' + arr.length + ':');
      if (!unordered || arr.length <= 1) {
        for (let i = 0; i < arr.length; i++) {
          if (Object.hasOwn(arr, i)) self.dispatch(arr[i], orderedEntries);
          else write('hole:');
        }
        return;
      }

      // the unordered case is a little more complicated:
      // since there is no canonical ordering on objects,
      // i.e. {a:1} < {a:2} and {a:1} > {a:2} are both false,
      // we first serialize each entry using a PassThrough stream
      // before sorting.
      // also: we can’t use the same context array for all entries
      // since the order of hashing should *not* matter. instead,
      // we keep track of the additions to a copy of the context array
      // and add all of them to the global context array when we’re done
      const contextAdditions = [];
      const entries = [];
      let holes = 0;
      for (let i = 0; i < arr.length; i++) {
        if (!Object.hasOwn(arr, i)) { holes++; continue; }
        const strm = new PassThrough();
        const localContext = context.slice();
        const hasher = typeHasher(options, strm, localContext);
        hasher.dispatch(arr[i], orderedEntries);
        for (let j = context.length; j < localContext.length; j++) contextAdditions.push(localContext[j]);
        entries.push(strm.read());
      }
      context = context.concat(contextAdditions);
      // Text-only collections keep upstream's UTF-16 sort and framing. Binary
      // entries sort as bytes and retain their bytes, never replacement characters.
      entries.sort((a, b) => {
        const ab = Buffer.isBuffer(a), bb = Buffer.isBuffer(b);
        if (ab !== bb) return ab ? 1 : -1;
        return ab ? Buffer.compare(a, b) : a < b ? -1 : a > b ? 1 : 0;
      });
      write('array:' + arr.length + ':');
      for (let i = 0; i < holes; i++) write('hole:');
      for (const entry of entries) {
        if (Buffer.isBuffer(entry)) { write('binary-entry:' + entry.length + ':'); write(entry); }
        else this.dispatch(entry);
      }
    },
    _date: function(date){
      return write('date:' + date.toJSON());
    },
    _symbol: function(sym){
      return write('symbol:' + sym.toString());
    },
    _error: function(err){
      return write('error:' + err.toString());
    },
    _boolean: function(bool){
      return write('bool:' + bool.toString());
    },
    _string: function(string){
      write('string:' + string.length + ':');
      write(string.toString());
    },
    _function: function(fn){
      write('fn:');
      if (isNativeFunction(fn)) {
        this.dispatch('[native]');
      } else {
        this.dispatch(fn.toString());
      }

      if (options.respectFunctionNames !== false) {
        // Make sure we can still distinguish native functions
        // by their name, otherwise String and Function will
        // have the same hash
        this.dispatch("function-name:" + String(fn.name));
      }

      if (options.respectFunctionProperties) {
        this._object(fn);
      }
    },
    _number: function(number){
      return write('number:' + number.toString());
    },
    _xml: function(xml){
      return write('xml:' + xml.toString());
    },
    _null: function() {
      return write('Null');
    },
    _undefined: function() {
      return write('Undefined');
    },
    _regexp: function(regex){
      return write('regex:' + regex.toString());
    },
    _uint8array: function(arr){
      write('uint8array:');
      return this.dispatch(Array.prototype.slice.call(arr));
    },
    _uint8clampedarray: function(arr){
      write('uint8clampedarray:');
      return this.dispatch(Array.prototype.slice.call(arr));
    },
    _int8array: function(arr){
      write('int8array:');
      return this.dispatch(Array.prototype.slice.call(arr));
    },
    _uint16array: function(arr){
      write('uint16array:');
      return this.dispatch(Array.prototype.slice.call(arr));
    },
    _int16array: function(arr){
      write('int16array:');
      return this.dispatch(Array.prototype.slice.call(arr));
    },
    _uint32array: function(arr){
      write('uint32array:');
      return this.dispatch(Array.prototype.slice.call(arr));
    },
    _int32array: function(arr){
      write('int32array:');
      return this.dispatch(Array.prototype.slice.call(arr));
    },
    _float32array: function(arr){
      write('float32array:');
      return this.dispatch(Array.prototype.slice.call(arr));
    },
    _float64array: function(arr){
      write('float64array:');
      return this.dispatch(Array.prototype.slice.call(arr));
    },
    _arraybuffer: function(arr){
      write('arraybuffer:');
      return this.dispatch(new Uint8Array(arr));
    },
    _url: function(url) {
      return write('url:' + url.toString(), 'utf8');
    },
    _map: function(map) {
      write('map:');
      var arr = Array.from(map);
      return this._array(arr, options.unorderedSets !== false, true);
    },
    _set: function(set) {
      write('set:');
      var arr = Array.from(set);
      return this._array(arr, options.unorderedSets !== false);
    },
    _file: function(file) {
      write('file:');
      return this.dispatch([file.name, file.size, file.type, file.lastModified], true);
    },
    _blob: function() {
      if (options.ignoreUnknown) {
        return write('[blob]');
      }

      throw Error('Hashing Blob objects is currently not supported\n' +
        '(see https://github.com/puleos/object-hash/issues/26)\n' +
        'Use "options.replacer" or "options.ignoreUnknown"\n');
    },
    _domwindow: function() { return write('domwindow'); },
    _bigint: function(number){
      return write('bigint:' + number.toString());
    },
    /* Node.js standard native objects */
    _process: function() { return write('process'); },
    _timer: function() { return write('timer'); },
    _timeout: function() { return write('timer'); },
    _pipe: function() { return write('pipe'); },
    _tcp: function() { return write('tcp'); },
    _udp: function() { return write('udp'); },
    _tty: function() { return write('tty'); },
    _statwatcher: function() { return write('statwatcher'); },
    _securecontext: function() { return write('securecontext'); },
    _connection: function() { return write('connection'); },
    _zlib: function() { return write('zlib'); },
    _context: function() { return write('context'); },
    _nodescript: function() { return write('nodescript'); },
    _httpparser: function() { return write('httpparser'); },
    _dataview: function(view) {
      const bytes = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
      write('dataview:' + bytes.byteLength + ':');
      return write(Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength));
    },
    _bigint64array: function(arr) { write('bigint64array:'); return this.dispatch(Array.from(arr)); },
    _biguint64array: function(arr) { write('biguint64array:'); return this.dispatch(Array.from(arr)); },
    _signal: function() { return write('signal'); },
    _fsevent: function() { return write('fsevent'); },
    _tlswrap: function() { return write('tlswrap'); },
  };
}

// Keep text-only serialization allocation-light; switch to byte chunks when
// binary data appears. The collected bytes match writes to a crypto Hash.
function PassThrough() {
  let text = '', chunks;
  return {
    write(value) {
      if (typeof value === 'string') {
        if (chunks) chunks.push(Buffer.from(value));
        else text += value;
      } else {
        if (!chunks) { chunks = [Buffer.from(text)]; text = ''; }
        chunks.push(Buffer.from(value));
      }
    },
    end(value) { this.write(value); },
    read() { return chunks ? Buffer.concat(chunks) : text; }
  };
}
