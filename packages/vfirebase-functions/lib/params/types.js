'use strict';
const logger = require('../logger/index.js');
const tag = Symbol.for('firebase-functions:Expression:Tag');
const identity = x => x;
class Expression {
  static [Symbol.hasInstance](value) {return value?.[tag] === true;}
  get [tag]() {return true;}
  value() {
    if (process.env.FUNCTIONS_CONTROL_API === 'true') {
      logger.warn(`${this}.value() invoked during function deployment, instead of during runtime.`);
      logger.warn('This is usually a mistake. In configs, use Params directly without calling .value().');
      logger.warn('example: { memory: memoryParam } not { memory: memoryParam.value() }');
    }
    return this.runtimeValue();
  }
  runtimeValue() {throw new Error('Not implemented');}
  toCEL() {return `{{ ${this} }}`;}
  toJSON() {return this.toString();}
}
const valueOf = x => x instanceof Expression ? x.runtimeValue() : x;
const celOf = x => x instanceof Expression ? x.toCEL() : x;
const reference = x => x instanceof Expression ? x.toString() : typeof x === 'string' || Array.isArray(x) ? JSON.stringify(x) : String(x);
class InterpolationExpression extends Expression {
  constructor(strings, values) {super(); this.strings = strings; this.values = values;}
  runtimeValue() {return this.strings.map((s,i) => s + (i < this.values.length ? String(valueOf(this.values[i])) : '')).join('');}
  toCEL(convert = identity) {
    // Reserve placeholders absent from literal text; a literal that resembles
    // an earlier placeholder must never acquire expression semantics.
    const text = this.strings.join('') + this.values.filter(v => !(v instanceof Expression)).join('');
    let marker = '🤿🐙'; while (text.includes(marker)) marker += '🐙';
    const expressions = [];
    const raw = this.strings.map((s,i) => {
      if (i >= this.values.length) return s;
      const value = this.values[i];
      if (!(value instanceof Expression)) return s + String(value);
      const token = `${marker}${expressions.length}${marker}`;
      expressions.push([token, value.toCEL()]); return s + token;
    }).join('');
    let result = convert(raw);
    for (const [token, value] of expressions) result = result.split(token).join(value);
    return result;
  }
}
class TransformedStringExpression extends Expression {
  constructor(source, transformer) {super(); Object.assign(this, {source, transformer});}
  runtimeValue() {return this.transformer(valueOf(this.source));}
  toCEL() {return this.source instanceof Expression ? this.source.toCEL(this.transformer) : this.transformer(this.source);}
}
const transform = (source, transformer) => new TransformedStringExpression(source, transformer);
class TernaryExpression extends Expression {
  constructor(test, ifTrue, ifFalse) {super(); Object.assign(this, {test, ifTrue, ifFalse});}
  runtimeValue() {return valueOf(valueOf(this.test) ? this.ifTrue : this.ifFalse);}
  toString() {return `${this.test} ? ${reference(this.ifTrue)} : ${reference(this.ifFalse)}`;}
}
const equal = (a,b) => Array.isArray(a) ? Array.isArray(b) && a.every(x => b.includes(x)) && b.every(x => a.includes(x)) : a === b;
const comparisons = new Map([['==',equal],['!=',(a,b)=>!equal(a,b)],['>',(a,b)=>a>b],['>=',(a,b)=>a>=b],['<',(a,b)=>a<b],['<=',(a,b)=>a<=b]]);
class CompareExpression extends Expression {
  constructor(cmp,lhs,rhs) {super(); Object.assign(this,{cmp,lhs,rhs});}
  runtimeValue() {const op=comparisons.get(this.cmp); if (!op) throw new Error(`Unknown comparator ${this.cmp}`); return op(valueOf(this.lhs),valueOf(this.rhs));}
  arrayEquals(a,b) {return equal(a,b);}
  toString() {return `${reference(this.lhs)} ${this.cmp} ${reference(this.rhs)}`;}
  thenElse(a,b) {return new TernaryExpression(this,a,b);}
}
class Param extends Expression {
  static type = 'string';
  constructor(name, options = {}) {super(); Object.assign(this,{name,options});}
  cmp(operator, rhs) {
    if (this.constructor.type === 'list' && operator !== '==' && operator !== '!=') throw new Error('>/< comparison operators not supported on params of type List');
    return new CompareExpression(operator,this,rhs);
  }
  toString() {return `params.${this.name}`;}
  toSpec() {
    const {default: fallback,...options} = this.options;
    const result = {name:this.name,...options,type:this.constructor.type};
    if (fallback !== undefined) result.default = celOf(fallback);
    if (result.input?.text?.validationRegex instanceof RegExp) result.input = {...result.input,text:{...result.input.text,validationRegex:result.input.text.validationRegex.source}};
    return result;
  }
}
for (const [method,op] of Object.entries({equals:'==',notEquals:'!=',greaterThan:'>',greaterThanOrEqualTo:'>=',lessThan:'<',lessThanOrEqualTo:'<=',lessThanorEqualTo:'<='})) {
  Object.defineProperty(Param.prototype,method,{value:function(rhs){return this.cmp(op,rhs)},writable:true,configurable:true});
}
class StringParam extends Param {runtimeValue(){return process.env[this.name] || '';}}
class IntParam extends Param {static type='int'; runtimeValue(){return parseInt(process.env[this.name] || '0',10) || 0;}}
class FloatParam extends Param {static type='float'; runtimeValue(){return parseFloat(process.env[this.name] || '0') || 0;}}
class BooleanParam extends Param {
  static type='boolean'; runtimeValue(){return process.env[this.name] === 'true';}
  then(a,b){return this.thenElse(a,b)} thenElse(a,b){return new TernaryExpression(this,a,b)}
}
class ListParam extends Param {
  static type='list'; runtimeValue(){const value=JSON.parse(process.env[this.name]); return Array.isArray(value)&&value.every(v=>typeof v==='string') ? value : [];}
}
class InternalExpression extends Param {
  constructor(name,getter){super(name);this.getter=getter;}
  runtimeValue(){return this.getter(process.env) || '';}
  toSpec(){throw new Error('An InternalExpression should never be marshalled for wire transmission.');}
}
const choice = (kind,options) => ({[kind]:{options:Array.isArray(options)?options.map(value=>({value})):Object.entries(options).map(([label,value])=>({label,value}))}});
const select = options=>choice('select',options), multiSelect = options=>choice('multiSelect',options);
const BUCKET_PICKER={resource:{type:'storage.googleapis.com/Bucket'}};
module.exports={Expression,InterpolationExpression,TransformedStringExpression,TernaryExpression,CompareExpression,Param,StringParam,IntParam,FloatParam,BooleanParam,ListParam,InternalExpression,valueOf,celOf,transform,select,multiSelect,BUCKET_PICKER,...require('../runtime/secret-parameter.js')};
