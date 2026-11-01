'use strict';
const options = require('../v2/options.js');
const manifest = require('./manifest.js');
const {convertInvoker} = require('../common/encoding.js');

// A function's deployment declaration is assembled independently of its
// invocation pipeline. Providers contribute only their trigger-specific fields.
class FunctionDefinition {
  constructor(local, kind) {
    this.local = local;
    this.kind = kind;
  }
  endpoint(trigger) {
    const global = options.getGlobalOptions();
    const layers = [options.optionsToEndpoint(global), options.optionsToEndpoint(this.local, this.kind)];
    return {...manifest.initV2Endpoint(global, this.local), platform: 'gcfv2', ...layers[0], ...layers[1],
      labels: {...layers[0].labels, ...layers[1].labels}, ...trigger};
  }
  annotations(trigger, labels) {
    const layers = [options.optionsToTriggerAnnotations(options.getGlobalOptions()), options.optionsToTriggerAnnotations(this.local, this.kind)];
    return {platform: 'gcfv2', ...layers[0], ...layers[1],
      labels: {...layers[0].labels, ...layers[1].labels, ...labels}, ...trigger};
  }
  httpTrigger(legacy = false) {
    const trigger = legacy ? {allowInsecure: false} : {};
    for (const layer of [options.getGlobalOptions(), this.local]) {
      if (Object.hasOwn(layer, 'invoker')) trigger.invoker = convertInvoker(layer.invoker);
    }
    return trigger;
  }
  attach(fn, trigger, legacy) {
    fn.__endpoint = this.endpoint(trigger);
    if (legacy) Object.defineProperty(fn, '__trigger', {get: legacy});
    return fn;
  }
}
module.exports = {FunctionDefinition};
