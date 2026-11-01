'use strict';
const logger = require('../logger/index.js');
const missing = name => `No value found for secret parameter "${name}". A function can only access a secret if you include the secret in the function's dependency array.`;
class SecretParameter {
  static type = 'secret';
  constructor(name, options = {}) {this.name = name; this.options = options;}
  value() {
    if (process.env.FUNCTIONS_CONTROL_API === 'true') throw new Error(`Cannot access the value of secret "${this.name}" during function deployment. Secret values are only available at runtime.`);
    return this.runtimeValue();
  }
  toSpec() {return {type: 'secret', name: this.name, ...this.options};}
}
class SecretParam extends SecretParameter {
  runtimeValue() {
    const value = process.env[this.name];
    if (value === undefined) logger.warn(missing(this.name));
    return value || '';
  }
}
class JsonSecretParam extends SecretParameter {
  toSpec() {return {...super.toSpec(), format: 'json'};}
  runtimeValue() {
    const value = process.env[this.name];
    if (value === undefined) throw new Error(missing(this.name));
    try {return JSON.parse(value);}
    catch {
      // JSON parser diagnostics can quote the credential itself. Identify the
      // parameter, but never attach the parser message or secret as a cause.
      throw new Error(`"${this.name}" could not be parsed as JSON. Please verify its value in Secret Manager.`);
    }
  }
}
module.exports = {SecretParam, JsonSecretParam};
