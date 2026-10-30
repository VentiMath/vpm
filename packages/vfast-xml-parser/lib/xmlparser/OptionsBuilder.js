const { DANGEROUS_PROPERTY_NAMES, criticalProperties } = require("../util.js");

const defaultOnDangerousProperty = (name) => {
  if (DANGEROUS_PROPERTY_NAMES.includes(name)) {
    return "__" + name;
  }
  return name;
};


const defaultOptions = {
  preserveOrder: false,
  attributeNamePrefix: '@_',
  attributesGroupName: false,
  textNodeName: '#text',
  ignoreAttributes: true,
  removeNSPrefix: false, // remove NS from tag name or attribute name if true
  allowBooleanAttributes: false, //a tag can have attributes without any value
  //ignoreRootElement : false,
  parseTagValue: true,
  parseAttributeValue: false,
  trimValues: true, //Trim string values of tag and attributes
  cdataPropName: false,
  numberParseOptions: {
    hex: true,
    leadingZeros: true,
    eNotation: true,
    unicode: false
  },
  tagValueProcessor: function (tagName, val) {
    return val;
  },
  attributeValueProcessor: function (attrName, val) {
    return val;
  },
  stopNodes: [], //nested tags will not be parsed even for errors
  alwaysCreateTextNode: false,
  isArray: () => false,
  commentPropName: false,
  unpairedTags: [],
  processEntities: true,
  htmlEntities: false,
  entityDecoder: null,
  ignoreDeclaration: false,
  ignorePiTags: false,
  transformTagName: false,
  transformAttributeName: false,
  updateTag: function (tagName, jPath, attrs) {
    return tagName
  },
  // skipEmptyListItem: false
  captureMetaData: false,
  maxNestedTags: 100,
  strictReservedNames: true,
  jPath: true, // if true, pass jPath string to callbacks; if false, pass matcher instance
  onDangerousProperty: defaultOnDangerousProperty
};


/**
 * Validates that a property name is safe to use
 * @param {string} propertyName - The property name to validate
 * @param {string} optionName - The option field name (for error message)
 * @throws {Error} If property name is dangerous
 */
const reservedProperties = new Set([...DANGEROUS_PROPERTY_NAMES, ...criticalProperties].map(name => name.toLowerCase()));
function validatePropertyName(propertyName, optionName) {
  if (typeof propertyName !== 'string') {
    return; // Only validate string property names
  }

  if (reservedProperties.has(propertyName.toLowerCase())) {
    throw new Error(`[SECURITY] Invalid ${optionName}: "${propertyName}" is a reserved JavaScript keyword that could cause prototype pollution`);
  }
}

/**
 * Normalizes processEntities option for backward compatibility
 * @param {boolean|object} value
 * @returns {object} Always returns normalized object
 */
const enabledEntities = Object.freeze({enabled:true,maxEntitySize:10000,maxExpansionDepth:10000,maxTotalExpansions:Infinity,maxExpandedLength:100000,maxEntityCount:1000,allowedTags:null,tagFilter:null,appliesTo:'all'});
const disabledEntities = Object.freeze({...enabledEntities,enabled:false});
const propertyNameOptions = ['attributeNamePrefix','attributesGroupName','textNodeName','cdataPropName','commentPropName'];
Object.freeze(defaultOptions.numberParseOptions);
Object.freeze(defaultOptions.unpairedTags);
Object.freeze(defaultOptions.stopNodes);
function normalizeProcessEntities(value, htmlEntities) {
  if (typeof value === 'boolean') return value ? enabledEntities : disabledEntities;

  // Object config - merge with defaults
  if (typeof value === 'object' && value !== null) {
    return {
      enabled: value.enabled !== false,
      maxEntitySize: entityLimit(value.maxEntitySize ?? 10000, "maxEntitySize"),
      maxExpansionDepth: entityLimit(value.maxExpansionDepth ?? 10000, "maxExpansionDepth"),
      maxTotalExpansions: entityLimit(value.maxTotalExpansions ?? Infinity, "maxTotalExpansions"),
      maxExpandedLength: entityLimit(value.maxExpandedLength ?? 100000, "maxExpandedLength"),
      maxEntityCount: entityLimit(value.maxEntityCount ?? 1000, "maxEntityCount"),
      allowedTags: value.allowedTags ?? null,
      tagFilter: value.tagFilter ?? null,
      appliesTo: value.appliesTo ?? "all",
    };
  }

  // Default to enabled with limits
  return normalizeProcessEntities(true);
}

let standardOptions;
const buildOptions = function (options) {
  if (options === undefined && standardOptions) return standardOptions;
  const built = {...defaultOptions, ...options};

  // Validate property names to prevent prototype pollution
  for (const name of propertyNameOptions) {
    if (built[name]) validatePropertyName(built[name], name);
  }

  if (built.onDangerousProperty === null) {
    built.onDangerousProperty = defaultOnDangerousProperty;
  }

  // Always normalize processEntities for backward compatibility and validation
  built.processEntities = normalizeProcessEntities(built.processEntities, built.htmlEntities);

  // Convert old-style stopNodes for backward compatibility
  if (built.stopNodes !== defaultOptions.stopNodes && Array.isArray(built.stopNodes)) {
    built.stopNodes = built.stopNodes.map(node => {
      if (typeof node === 'string' && node.startsWith('*.')) {
        // Old syntax: *.tagname meant "tagname anywhere"
        // Convert to new syntax: ..tagname
        return '..' + node.substring(2);
      }
      return node;
    });
  }
  //console.debug(built.processEntities)
  if (!Number.isSafeInteger(built.maxNestedTags) || built.maxNestedTags < 0) throw new RangeError('maxNestedTags must be a nonnegative safe integer');
  built.stopNodes = Object.freeze(built.stopNodes);
  if (built.unpairedTags !== defaultOptions.unpairedTags) built.unpairedTags = Object.freeze([...built.unpairedTags]);
  if (Array.isArray(built.ignoreAttributes)) built.ignoreAttributes = Object.freeze(built.ignoreAttributes.map(value => value instanceof RegExp ? new RegExp(value.source, value.flags) : value));
  if (built.numberParseOptions !== defaultOptions.numberParseOptions) built.numberParseOptions = Object.freeze({...built.numberParseOptions, ...(built.numberParseOptions?.skipLike instanceof RegExp ? {skipLike:new RegExp(built.numberParseOptions.skipLike.source,built.numberParseOptions.skipLike.flags)} : {})});
  if (built.htmlEntities && typeof built.htmlEntities === 'object') built.htmlEntities = Object.freeze(Object.fromEntries(Object.entries(built.htmlEntities).map(([name,value])=>[name,value && typeof value === 'object' ? Object.freeze({...value}) : value])));
  if (Array.isArray(built.processEntities.allowedTags)) built.processEntities.allowedTags = Object.freeze([...built.processEntities.allowedTags]);
  if (Array.isArray(built.processEntities.appliesTo)) built.processEntities.appliesTo = Object.freeze([...built.processEntities.appliesTo]);
  built.processEntities = Object.freeze(built.processEntities);
  Object.freeze(built);
  if (options === undefined) standardOptions = built;
  return built;
};

exports.defaultOptions = defaultOptions;
exports.buildOptions = buildOptions;

function entityLimit(value, name) {
  if (value !== Infinity && (!Number.isSafeInteger(value) || value < 1)) throw new RangeError(name + ' must be a positive safe integer or Infinity');
  return value;
}
