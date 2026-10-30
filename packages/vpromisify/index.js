'use strict';
const apply=Reflect.apply, slice=Array.prototype.slice;
function options(value) {
  if (value == null) return {};
  if (typeof value !== 'object' || Array.isArray(value)) throw new TypeError('Options must be an object');
  return value;
}
function marked(method,marker) {
  if (typeof method !== 'function') throw new TypeError('Expected a function');
  return Object.hasOwn(method,marker) && Object.getOwnPropertyDescriptor(method,marker)?.value === true;
}
function mark(wrapper,marker) {
  if (marker in wrapper) Object.defineProperty(wrapper,marker,{value:true,writable:true,configurable:true,enumerable:true});
  else wrapper[marker]=true;
  return wrapper;
}
function promisify(originalMethod,config) {
  if (marked(originalMethod,'promisified_')) return originalMethod;
  const singular=config == null ? undefined : options(config).singular;
  if (singular !== undefined && typeof singular !== 'boolean') throw new TypeError('singular must be a boolean');
  return mark(function() {
    let last=arguments.length-1;
    while (last >= 0 && arguments[last] === undefined) last--;
    if (last >= 0 && typeof arguments[last] === 'function') return apply(originalMethod,this,arguments);
    const args=slice.call(arguments,0,last+1), PromiseCtor=this?.Promise || Promise;
    return new PromiseCtor((resolve,reject)=>{
      let settled=false;
      args.push((error,...values)=>{
        if (settled) return; settled=true;
        if (error) reject(error);
        else resolve(singular && values.length===1 ? values[0] : values);
      });
      apply(originalMethod,this,args);
    });
  },'promisified_');
}
function rejection(reason) {
  if (reason) return reason;
  const error=new Error('Promise rejected with a falsy value');
  error.code='ERR_FALSY_VALUE_REJECTION'; error.reason=reason;
  return error;
}
function callbackify(originalMethod) {
  if (marked(originalMethod,'callbackified_')) return originalMethod;
  return mark(function() {
    let last=arguments.length-1;
    while (last >= 0 && arguments[last] === undefined) last--;
    if (last < 0 || typeof arguments[last] !== 'function') return apply(originalMethod,this,arguments);
    const callback=arguments[last], args=slice.call(arguments,0,last);
    let result;
    try {result=apply(originalMethod,this,args);} catch(error) {result=Promise.reject(error);}
    Promise.resolve(result).then(
      value=>Array.isArray(value) ? callback(null,...value) : callback(null,value),
      error=>callback(rejection(error))
    );
  },'callbackified_');
}
function wrapAll(Class,config,kind) {
  if (typeof Class !== 'function' || !Class.prototype) throw new TypeError('Expected a class with a prototype');
  config=options(config);
  const exclude=config.exclude;
  if (exclude !== undefined && (!Array.isArray(exclude) || exclude.some(name=>typeof name !== 'string'))) throw new TypeError('exclude must be an array of method names');
  const omitted=new Set(exclude), prototype=Class.prototype, plans=[];
  const privateName=kind==='promisify' ? /(^_|(Stream|_)|promise$)|^constructor$/ : /^_|(Stream|_)|^constructor$/;
  const marker=kind==='promisify'?'promisified_':'callbackified_';
  for (const name of Object.getOwnPropertyNames(prototype)) {
    if (omitted.has(name) || privateName.test(name)) continue;
    const descriptor=Object.getOwnPropertyDescriptor(prototype,name);
    // Inspect data descriptors; never invoke a prototype accessor to find methods.
    if (!descriptor || typeof descriptor.value !== 'function' || marked(descriptor.value,marker)) continue;
    if (!descriptor.configurable && !descriptor.writable) throw new TypeError('Cannot wrap method: '+name);
    plans.push({name,descriptor});
  }
  const wrap=exports[kind];
  for (const plan of plans) plan.wrapper=kind==='promisify'?wrap(plan.descriptor.value,config):wrap(plan.descriptor.value);
  for (const {name,descriptor,wrapper} of plans) Object.defineProperty(prototype,name,{...descriptor,value:wrapper});
}
function promisifyAll(Class,config) {wrapAll(Class,config,'promisify');}
function callbackifyAll(Class,config) {wrapAll(Class,config,'callbackify');}
exports.promisify=promisify;
exports.promisifyAll=promisifyAll;
exports.callbackify=callbackify;
exports.callbackifyAll=callbackifyAll;
