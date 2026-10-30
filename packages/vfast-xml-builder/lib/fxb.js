'use strict';
//parse Empty Node as self closing node
const buildFromOrderedJs = require('./orderedJs2Xml.js');
const getIgnoreAttributesFn = require('./ignoreAttributes.js');
const {Expression, Matcher} = require('vpath-expression-matcher');
const {safeComment, safeCdata, escapeAttribute, valToStr, replaceEntities, checkDepth, enter, own} = require('./util.js');
const {createValidator} = require('vxml-naming');

const states=new WeakMap();
const normalize=require('./options.js');
const defaultOptions = {
  attributeNamePrefix: '@_',
  attributesGroupName: false,
  textNodeName: '#text',
  ignoreAttributes: true,
  cdataPropName: false,
  format: false,
  indentBy: '  ',
  suppressEmptyNode: false,
  suppressUnpairedNode: true,
  suppressBooleanAttributes: true,
  tagValueProcessor: function (key, a) {
    return a;
  },
  attributeValueProcessor: function (attrName, a) {
    return a;
  },
  preserveOrder: false,
  commentPropName: false,
  unpairedTags: [],
  entities: [
    { regex: new RegExp("&", "g"), val: "&amp;" },//it must be on top
    { regex: new RegExp(">", "g"), val: "&gt;" },
    { regex: new RegExp("<", "g"), val: "&lt;" },
    { regex: new RegExp("\'", "g"), val: "&apos;" },
    { regex: new RegExp("\"", "g"), val: "&quot;" }
  ],
  processEntities: true,
  stopNodes: [],
  // transformTagName: false,
  // transformAttributeName: false,
  oneListGroup: false,
  maxNestedTags: 100,
  jPath: true,  // When true, callbacks receive string jPath; when false, receive Matcher instance
  sanitizeName: false  // false = allow all names as-is (default, backward-compatible).
  // Set to a function (name, { isAttribute, matcher }) => string to
  // validate/sanitize tag and attribute names. Throw inside the function
  // to reject an invalid name.
};

const EMPTY=Object.freeze([]);
const STANDARD=Object.freeze({...defaultOptions,entities:null,stopNodes:EMPTY,unpairedTags:EMPTY});
function noAttribute(){return false;}
function noIndent(){return '';}
function Builder(options) {
  if(!new.target)return new Builder(options);
  // Default and root-array-only configurations can share validated immutable data.
  // No user callbacks or mutable arrays enter this path.
  let simple=options===undefined,arrayName;
  if(options&&typeof options==='object'&&!Array.isArray(options)){
    const keys=Reflect.ownKeys(options);
    if(keys.length===0)simple=true;
    else if(keys.length===1&&keys[0]==='arrayNodeName'&&Object.prototype.propertyIsEnumerable.call(options,'arrayNodeName')){
      arrayName=options.arrayNodeName;
      if(arrayName!==undefined&&(typeof arrayName!=='string'||!arrayName))throw new TypeError('arrayNodeName must be a nonempty string');
      simple=true;
    }
  }
  if(simple){
    Object.defineProperties(this,{
      options:{value:arrayName===undefined?STANDARD:Object.freeze({...STANDARD,arrayNodeName:arrayName}),enumerable:true},
      stopNodeExpressions:{value:EMPTY,enumerable:true}
    });
    return;
  }
  this.options = normalize(defaultOptions, options);

  // Convert old-style stopNodes for backward compatibility
  // Old syntax: "*.tag" meant "tag anywhere in tree"
  // New syntax: "..tag" means "tag anywhere in tree"
  if (this.options.stopNodes && Array.isArray(this.options.stopNodes)) {
    this.options.stopNodes = this.options.stopNodes.map(node => {
      if (typeof node === 'string' && node.startsWith('*.')) {
        // Convert old wildcard syntax to deep wildcard
        return '..' + node.substring(2);
      }
      return node;
    });
  }

  // Pre-compile stopNode expressions for pattern matching
  this.stopNodeExpressions = [];
  if (this.options.stopNodes && Array.isArray(this.options.stopNodes)) {
    for (let i = 0; i < this.options.stopNodes.length; i++) {
      const node = this.options.stopNodes[i];
      if (typeof node === 'string') {
        this.stopNodeExpressions.push(new Expression(node));
      } else if (node instanceof Expression) {
        this.stopNodeExpressions.push(node);
      } else throw new TypeError('stopNodes must contain strings or VPM Expressions');
    }
  }
  Object.freeze(this.stopNodeExpressions);
  Object.freeze(this.options.stopNodes);
  Object.freeze(this.options.unpairedTags);
  Object.freeze(this.options);
  Object.defineProperty(this,'options',{writable:false});
  Object.defineProperty(this,'stopNodeExpressions',{writable:false});
  this.trackPath=!!(this.stopNodeExpressions.length||this.options.sanitizeName||typeof this.options.ignoreAttributes==='function');

  this.ignoreAttributesFn=getIgnoreAttributesFn(this.options.ignoreAttributes);
  this.attrPrefixLen=this.options.attributeNamePrefix.length;
  this.isAttribute=this.options.ignoreAttributes===true||this.options.attributesGroupName?()=>false:isAttribute;

  this.processTextOrObjNode = processTextOrObjNode

  if (this.options.format) {
    this.indentate = indentate;
    this.tagEndChar = '>\n';
    this.newLine = '\n';
  } else {
    this.indentate = function () {
      return '';
    };
    this.tagEndChar = '>';
    this.newLine = '';
  }
}

/**
 * Detect XML version from the ?xml declaration at the root of a plain-object input.
 * Checks both attributesGroupName and flat attribute forms.
 * Returns '1.0' if no declaration is found.
 */
function detectXmlVersionFromObj(jObj, options) {
  const decl = own(jObj,'?xml');
  if (decl && typeof decl === 'object') {
    // attributesGroupName path e.g. { '$$': { '@_version': '1.1' } }
    if (options.attributesGroupName && decl[options.attributesGroupName]) {
      const v = decl[options.attributesGroupName][options.attributeNamePrefix + 'version'];
      if (v) return v;
    }
    // flat attribute path e.g. { '@_version': '1.1' }
    const v = decl[options.attributeNamePrefix + 'version'];
    if (v) return v;
  }
  return '1.0';
}

/**
 * Resolve a tag or attribute name through sanitizeName if configured.
 * Validation via xml-naming's qName is performed first; the sanitizeName
 * callback is invoked only when the name is invalid. If sanitizeName is
 * false (default), no validation occurs and the name is used as-is.
 *
 * @param {string}  name        - raw name from the JS object
 * @param {boolean} isAttribute - true when resolving an attribute name
 * @param {object}  options
 * @param {Matcher} matcher     - current matcher state (readonly from callback perspective)
 * @param {function} qNameValidator - function to validate tag names
 */
function resolveTagName(name, isAttribute, options, matcher, qNameValidator) {
  if (!options.sanitizeName) return name;
  if (qNameValidator(name)) return name;
  const resolved=options.sanitizeName(name, { isAttribute, matcher: matcher.readOnly() });
  if(typeof resolved!=='string'||!qNameValidator(resolved))throw new TypeError('sanitizeName must return a valid XML qualified name');
  return resolved;
}

Builder.prototype.build = function (jObj) {
  if(states.has(this))throw new Error('XMLBuilder cannot be reentered during build');
  if(!jObj||typeof jObj!=='object')throw new TypeError('XML input must be an object or array');
  states.set(this,new WeakSet());
  try {
  if (this.options.preserveOrder) {
    return buildFromOrderedJs(jObj, this.options, this.stopNodeExpressions, this.ignoreAttributesFn, this.trackPath);
  } else {
    if (Array.isArray(jObj) && this.options.arrayNodeName && this.options.arrayNodeName.length > 0) {
      jObj = {
        [this.options.arrayNodeName]: jObj
      }
    }
    // Initialize matcher for path tracking
    const matcher = this.trackPath ? new Matcher() : null;
    const qNameValidator = this.options.sanitizeName ? createValidator('qName', {xmlVersion:detectXmlVersionFromObj(jObj,this.options)}) : null;
    return this.j2x(jObj, 0, matcher, qNameValidator).val;
  }
  } finally {states.delete(this);}
};

Builder.prototype.j2x = function (jObj, level, matcher, qNameValidator) {
  let attrStr = '';
  let val = '';
  const active=states.get(this);enter(active,jObj);
  try {
  // Attribute callbacks receive a string path or a read-only matcher view
  const jPath = matcher ? (this.options.jPath ? matcher.toString() : matcher.readOnly()) : '';

  // Check if current node is a stopNode (will be used for attribute encoding)
  const isCurrentStopNode = this.checkStopNode(matcher);

  for (let key in jObj) {
    if (!Object.prototype.hasOwnProperty.call(jObj, key)) continue;
    const value=jObj[key];
    if(value===undefined||Array.isArray(value)&&value.length===0&&!this.options.oneListGroup)continue;
    // Empty prefixes distinguish nested object tags from primitive attributes.
    const objectTag=value!==null&&typeof value==='object'&&(this.options.attributeNamePrefix===''||!(value instanceof Date));
    const flatAttr=this.options.attributesGroupName||objectTag?false:this.isAttribute(key);
    if(flatAttr!==false){
      if(value!=null&&!this.ignoreAttributesFn(flatAttr,jPath)){
        const name=resolveTagName(flatAttr,true,this.options,matcher,qNameValidator);
        attrStr+=this.buildAttrPairStr(name,valToStr(value),isCurrentStopNode);
      }
      continue;
    }

    // Resolve the key through sanitizeName before any use.
    // Special keys (textNodeName, cdataPropName, commentPropName, attributeNamePrefix,
    // attributesGroupName, "?" PI tags) are exempt — they are builder-internal conventions,
    // not user-supplied XML names.
    const isSpecialKey = key === this.options.textNodeName
      || key === this.options.cdataPropName
      || key === this.options.commentPropName
      || (this.options.attributesGroupName && key === this.options.attributesGroupName)
      || key[0] === '?';

    const resolvedKey = isSpecialKey
      ? key
      : resolveTagName(key, false, this.options, matcher, qNameValidator);

    if(!isSpecialKey)checkDepth(level+1,this.options);
    if (value === null) {
      // null attribute should be ignored by the attribute list, but should not cause the tag closing
      if (this.isAttribute(key)) {
        val += '';
      } else if (resolvedKey === this.options.cdataPropName || resolvedKey === this.options.commentPropName) {
        val += '';
      } else if (resolvedKey[0] === '?') {
        val += this.indentate(level) + '<' + resolvedKey + '?' + this.tagEndChar;
      } else {
        val += this.indentate(level) + '<' + resolvedKey + '/' + this.tagEndChar;
      }
    } else if (value instanceof Date) {
      val += this.buildTextValNode(value, resolvedKey, '', level, matcher);
    } else if (typeof value !== 'object') {
      //premitive type
      const attr = this.isAttribute(key);
      if (attr && !this.ignoreAttributesFn(attr, jPath)) {
        // Resolve the attribute name through sanitizeName
        const resolvedAttr = resolveTagName(attr, true, this.options, matcher, qNameValidator);
        attrStr += this.buildAttrPairStr(resolvedAttr, valToStr(value), isCurrentStopNode);
      } else if (!attr) {
        //tag value
        if (key === this.options.textNodeName) {
          let newval = this.options.tagValueProcessor(key, valToStr(value));
          val += this.replaceEntitiesValue(newval);
        } else {
          // Check if this is a stopNode before building
          matcher?.push(resolvedKey);
          const isStopNode = this.checkStopNode(matcher);
          matcher?.pop();

          if (isStopNode) {
            // Build as raw content without encoding
            const textValue = valToStr(value);
            if (textValue === '') {
              val += this.indentate(level) + '<' + resolvedKey + this.closeTag(resolvedKey) + this.tagEndChar;
            } else {
              val += this.indentate(level) + '<' + resolvedKey + '>' + textValue + '</' + resolvedKey + this.tagEndChar;
            }
          } else {
            val += this.buildTextValNode(value, resolvedKey, '', level, matcher);
          }
        }
      }
    } else if (Array.isArray(value)) {
      //repeated nodes
      const arrLen = value.length;
      let listTagVal = "";
      let listTagAttr = "";
      for (let j = 0; j < arrLen; j++) {
        const item = value[j];
        if (typeof item === 'undefined') {
          // supress undefined node
        } else if (item === null) {
          if (resolvedKey[0] === "?") listTagVal += this.indentate(level) + '<' + resolvedKey + '?' + this.tagEndChar;
          else listTagVal += this.indentate(level) + '<' + resolvedKey + '/' + this.tagEndChar;
        } else if (item instanceof Date) {
          listTagVal += this.buildTextValNode(item,resolvedKey,'',level,matcher);
        } else if (typeof item === 'object') {
          if (this.options.oneListGroup) {
            // Push tag to matcher before recursive call
            matcher?.push(resolvedKey);
            const result = this.j2x(item, level + 1, matcher, qNameValidator);
            // Pop tag from matcher after recursive call
            matcher?.pop();

            listTagVal += result.val;
            if (this.options.attributesGroupName && Object.hasOwn(item,this.options.attributesGroupName)) {
              listTagAttr += result.attrStr
            }
          } else {
            listTagVal += this.processTextOrObjNode(item, resolvedKey, level, matcher, qNameValidator)
          }
        } else {
          if (this.options.oneListGroup) {
            let textValue = this.options.tagValueProcessor(resolvedKey, item);
            textValue = this.replaceEntitiesValue(textValue);
            textValue = valToStr(textValue);
            listTagVal += textValue;
          } else {
            // Check if this is a stopNode before building
            matcher?.push(resolvedKey);
            const isStopNode = this.checkStopNode(matcher);
            matcher?.pop();

            if (isStopNode) {
              // Build as raw content without encoding
              const textValue = valToStr(item);
              if (textValue === '') {
                listTagVal += this.indentate(level) + '<' + resolvedKey + this.closeTag(resolvedKey) + this.tagEndChar;
              } else {
                listTagVal += this.indentate(level) + '<' + resolvedKey + '>' + textValue + '</' + resolvedKey + this.tagEndChar;
              }
            } else {
              listTagVal += this.buildTextValNode(item, resolvedKey, '', level, matcher);
            }
          }
        }
      }
      if (this.options.oneListGroup) {
        listTagVal = this.buildObjectNode(listTagVal, resolvedKey, listTagAttr, level);
      }
      val += listTagVal;
    } else {
      //nested node
      if (this.options.attributesGroupName && key === this.options.attributesGroupName) {
        const Ks = Object.keys(value);
        const L = Ks.length;
        for (let j = 0; j < L; j++) {
          // Resolve attribute names inside attributesGroupName
          const name=Ks[j].startsWith(this.options.attributeNamePrefix)?Ks[j].slice(this.attrPrefixLen):Ks[j];
          const attrValue=value[Ks[j]];
          if(attrValue==null||this.ignoreAttributesFn(name,jPath))continue;
          const resolvedAttr = resolveTagName(name, true, this.options, matcher, qNameValidator);
          attrStr += this.buildAttrPairStr(resolvedAttr, valToStr(attrValue), isCurrentStopNode);
        }
      } else {
        val += this.processTextOrObjNode(value, resolvedKey, level, matcher, qNameValidator)
      }
    }
  }
  return { attrStr: attrStr, val: val };
  } finally {active.delete(jObj);}
};

Builder.prototype.buildAttrPairStr = function (attrName, val, isStopNode) {
  if (!isStopNode) {
    val = this.options.attributeValueProcessor(attrName, valToStr(val));
    val = this.replaceEntitiesValue(val);
  }
  if (this.options.suppressBooleanAttributes && val === "true") {
    return ' ' + attrName;
  } else return ' ' + attrName + '="' + escapeAttribute(val) + '"';
}

function processTextOrObjNode(object, key, level, matcher, qNameValidator) {
  // Extract attributes to pass to matcher
  const attrValues = matcher ? this.extractAttributes(object) : null;

  // Push tag to matcher before recursion WITH attributes
  matcher?.push(key, attrValues);

  // Check if this entire node is a stopNode
  const isStopNode = this.checkStopNode(matcher);

  if (isStopNode) {
    // For stopNodes, build raw content without entity encoding
    const rawContent = this.buildRawContent(object,level+1,matcher);
    const attrStr = this.buildAttributesForStopNode(object,matcher);
    matcher?.pop();
    return this.buildObjectNode(rawContent, key, attrStr, level);
  }

  if(Object.hasOwn(object,this.options.textNodeName)&&Object.keys(object).length===1){
    const text=object[this.options.textNodeName];matcher?.pop();
    return this.buildTextValNode(text,key,'',level,matcher);
  }
  const result = this.j2x(object, level + 1, matcher, qNameValidator);
  // Pop tag from matcher after recursion
  matcher?.pop();

  // PI/XML-declaration tags must never emit text content — route through
  // buildTextValNode which correctly ignores the text node for "?" tags.
  if (key[0] === '?') {
    return this.buildTextValNode('', key, result.attrStr, level, matcher);
  } else {
    return this.buildObjectNode(result.val, key, result.attrStr, level);
  }
}

// Helper method to extract attributes from an object
Builder.prototype.extractAttributes = function (obj) {
  if (!obj || typeof obj !== 'object') return null;

  const attrValues = Object.create(null);
  let hasAttrs = false;

  // Check for attributesGroupName (when attributes are grouped)
  if (this.options.attributesGroupName && own(obj,this.options.attributesGroupName)) {
    const attrGroup = own(obj,this.options.attributesGroupName);
    for (let attrKey in attrGroup) {
      if (!Object.prototype.hasOwnProperty.call(attrGroup, attrKey)) continue;
      // Remove attribute prefix if present
      const cleanKey = attrKey.startsWith(this.options.attributeNamePrefix)
        ? attrKey.substring(this.options.attributeNamePrefix.length)
        : attrKey;
      attrValues[cleanKey] = valToStr(attrGroup[attrKey]);
      hasAttrs = true;
    }
  } else {
    // Look for individual attributes (prefixed with attributeNamePrefix)
    for (let key in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
      const attr = this.isAttribute(key);
      if (attr) {
        attrValues[attr] = valToStr(obj[key]);
        hasAttrs = true;
      }
    }
  }

  return hasAttrs ? attrValues : null;
};

// Build raw content for stopNode without entity encoding
Builder.prototype.buildRawContent = function (obj,depth,matcher) {
  checkDepth(depth,this.options);
  if (typeof obj === 'string') {
    return obj; // Already a string, return as-is
  }

  if (typeof obj !== 'object' || obj === null) {
    return String(obj);
  }

  const active=states.get(this);enter(active,obj);
  try {
  // Check if this is a stopNode data from parser: { "#text": "raw xml", "@_attr": "val" }
  if (own(obj,this.options.textNodeName) !== undefined) {
    return valToStr(obj[this.options.textNodeName]); // Return raw text without encoding
  }

  // Build raw XML from nested structure
  let content = '';

  for (let key in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;

    // Skip attributes
    if (this.isAttribute(key)) continue;
    if (this.options.attributesGroupName && key === this.options.attributesGroupName) continue;

    const value = obj[key];
    checkDepth(depth+1,this.options);

    matcher?.push(key,matcher?this.extractAttributes(value):null);
    try {
    if (key === this.options.textNodeName) {
      content += value; // Raw text
    } else if (Array.isArray(value)) {
      // Array of same tag
      for (let item of value) {
        if (typeof item === 'string' || typeof item === 'number') {
          content += `<${key}>${valToStr(item)}</${key}>`;
        } else if (typeof item === 'object' && item !== null) {
          const nestedContent = this.buildRawContent(item,depth+1,matcher);
          const nestedAttrs = this.buildAttributesForStopNode(item,matcher);
          if (nestedContent === '') {
            content += `<${key}${nestedAttrs}/>`;
          } else {
            content += `<${key}${nestedAttrs}>${nestedContent}</${key}>`;
          }
        }
      }
    } else if (typeof value === 'object' && value !== null) {
      // Nested object
      const nestedContent = this.buildRawContent(value,depth+1,matcher);
      const nestedAttrs = this.buildAttributesForStopNode(value,matcher);
      if (nestedContent === '') {
        content += `<${key}${nestedAttrs}/>`;
      } else {
        content += `<${key}${nestedAttrs}>${nestedContent}</${key}>`;
      }
    } else {
      // Primitive value
      content += `<${key}>${valToStr(value)}</${key}>`;
    }
    }finally{matcher?.pop();}
  }

  return content;
  } finally {active.delete(obj);}
};

// Build attribute string for stopNode (no entity encoding)
Builder.prototype.buildAttributesForStopNode = function (obj,matcher) {
  if (!obj || typeof obj !== 'object'||this.options.ignoreAttributes===true&&!this.options.attributesGroupName) return '';

  let attrStr = '';

  // Check for attributesGroupName (when attributes are grouped)
  if (this.options.attributesGroupName && own(obj,this.options.attributesGroupName)) {
    const attrGroup = own(obj,this.options.attributesGroupName);
    for (let attrKey in attrGroup) {
      if (!Object.prototype.hasOwnProperty.call(attrGroup, attrKey)) continue;
      const cleanKey = attrKey.startsWith(this.options.attributeNamePrefix)
        ? attrKey.substring(this.options.attributeNamePrefix.length)
        : attrKey;
      if(this.ignoreAttributesFn(cleanKey,matcher?(this.options.jPath?matcher.toString():matcher.readOnly()):''))continue;
      const val = attrGroup[attrKey];
      if(val==null)continue;
      if (val === true && this.options.suppressBooleanAttributes) {
        attrStr += ' ' + cleanKey;
      } else {
        // stopNode content is raw, but the quote delimiter is always escaped
        // so a quote in the value cannot break out of the attribute (see orderedJs2Xml attr_to_str)
        attrStr += ' ' + cleanKey + '="' + escapeAttribute(val) + '"';
      }
    }
  } else {
    // Look for individual attributes
    for (let key in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
      const attr = this.isAttribute(key);
      if (attr) {
        if(this.ignoreAttributesFn(attr,matcher?(this.options.jPath?matcher.toString():matcher.readOnly()):''))continue;
        const val = obj[key];
        if(val==null)continue;
        if (val === true && this.options.suppressBooleanAttributes) {
          attrStr += ' ' + attr;
        } else {
          // stopNode content is raw, but the quote delimiter is always escaped
          // so a quote in the value cannot break out of the attribute (see orderedJs2Xml attr_to_str)
          attrStr += ' ' + attr + '="' + escapeAttribute(val) + '"';
        }
      }
    }
  }

  return attrStr;
};

Builder.prototype.buildObjectNode = function (val, key, attrStr, level) {
  if (val === "") {
    if (key[0] === "?") return this.indentate(level) + '<' + key + attrStr + '?' + this.tagEndChar;
    else {
      return this.indentate(level) + '<' + key + attrStr + this.closeTag(key) + this.tagEndChar;
    }
  } else if (key[0] === "?") {
    // PI/XML-declaration tags never have body content — treat them like empty.
    return this.indentate(level) + '<' + key + attrStr + '?' + this.tagEndChar;
  } else {
    const tagEndExp = '</' + key + this.tagEndChar;
    // attrStr is an empty string in case the attribute came as undefined or null
    if ((attrStr || attrStr === '') && val.indexOf('<') === -1) {
      return (this.indentate(level) + '<' + key + attrStr + '>' + val + tagEndExp);
    } else if (this.options.commentPropName !== false && key === this.options.commentPropName) {
      return this.indentate(level) + `<!--${safeComment(val)}-->` + this.newLine;
    } else {
      return (
        this.indentate(level) + '<' + key + attrStr + this.tagEndChar +
        val +
        this.indentate(level) + tagEndExp);
    }
  }
}

Builder.prototype.closeTag = function (key) {
  let closeTag = "";
  if (this.options.unpairedTags.indexOf(key) !== -1) { //unpaired
    if (!this.options.suppressUnpairedNode) closeTag = "/"
  } else if (this.options.suppressEmptyNode) { //empty
    closeTag = "/";
  } else {
    closeTag = `></${key}`
  }
  return closeTag;
}

Builder.prototype.checkStopNode = function (matcher) {
  if (!this.stopNodeExpressions || this.stopNodeExpressions.length === 0) return false;

  for (let i = 0; i < this.stopNodeExpressions.length; i++) {
    if (matcher.matches(this.stopNodeExpressions[i])) {
      return true;
    }
  }
  return false;
}

Builder.prototype.buildTextValNode = function (val, key, attrStr, level, matcher) {
  if (this.options.cdataPropName !== false && key === this.options.cdataPropName) {
    const safeVal = safeCdata(val);
    return this.indentate(level) + `<![CDATA[${safeVal}]]>` + this.newLine;
  } else if (this.options.commentPropName !== false && key === this.options.commentPropName) {
    const safeVal = safeComment(val);
    return this.indentate(level) + `<!--${safeVal}-->` + this.newLine;
  } else if (key[0] === "?") {//PI tag
    return this.indentate(level) + '<' + key + attrStr + '?' + this.tagEndChar;
  } else {
    // Normal processing: apply tagValueProcessor and entity replacement
    let textValue = this.options.tagValueProcessor(key, val);
    textValue = this.replaceEntitiesValue(textValue);
    // tagValueProcessor may return the raw value unchanged (default is identity), and
    // replaceEntitiesValue no-ops on non-strings, so a plain number can still reach here;
    // stringify it now, sign-preserving, before it's implicitly ToString'd below.
    textValue = valToStr(textValue);

    if (textValue === '') {
      return this.indentate(level) + '<' + key + attrStr + this.closeTag(key) + this.tagEndChar;
    } else {
      return this.indentate(level) + '<' + key + attrStr + '>' +
        textValue +
        '</' + key + this.tagEndChar;
    }
  }
}

Builder.prototype.replaceEntitiesValue = function(value){return replaceEntities(value,this.options);};

function indentate(level) {
  return this.options.indentBy.repeat(level);
}

function isAttribute(name /*, options*/) {
  if (name.startsWith(this.options.attributeNamePrefix) && name !== this.options.textNodeName) {
    return name.substr(this.attrPrefixLen);
  } else {
    return false;
  }
}

Object.assign(Builder.prototype,{
  trackPath:false,ignoreAttributesFn:noAttribute,attrPrefixLen:2,isAttribute:noAttribute,
  processTextOrObjNode,indentate:noIndent,tagEndChar:'>',newLine:''
});
module.exports = Builder;
