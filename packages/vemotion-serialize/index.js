import hashString from 'vemotion-hash';
import memoize from 'vemotion-memoize';
import unitless from 'vemotion-unitless';
import isDevelopment from '#is-development';

// Serializes Emotion's style arguments (template literals, objects, arrays,
// functions of props, other serialized styles, keyframes and component
// selectors) to a CSS string, a class name and the keyframes they use.

const ILLEGAL_ESCAPE_SEQUENCE_ERROR = `You have illegal escape sequence in your template literal, most likely inside content's property value.
Because you write your CSS inside a JavaScript string you actually have to do double escaping, so for example "content: '\\00d7';" should become "content: '\\\\00d7';".
You can read more about this here:
https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#ES2018_revision_of_illegal_escape_sequences`;
const UNDEFINED_AS_OBJECT_KEY_ERROR = "You have passed in falsy value as style object's key (can happen when in example you pass unexported component as computed key).";
const NO_COMPONENT_SELECTOR_MESSAGE = 'Component selectors can only be used in conjunction with @emotion/babel-plugin, the swc Emotion plugin, or another Emotion-aware compiler transform.';
const FUNCTION_IN_CSS_MESSAGE =
  'Functions that are interpolated in css calls will be stringified.\n' +
  'If you want to have a css call based on props, create a function that returns a css call like this\n' +
  'let dynamicStyle = (props) => css`color: ${props.color}`\n' +
  'It can be called directly with props or interpolated in a styled call like this\n' +
  "let SomeComponent = styled('div')`${dynamicStyle}`";
const STRINGIFIED_STYLES_MESSAGE = "You have tried to stringify object returned from `css` function. It isn't supposed to be used directly (e.g. as value of the `className` prop), but rather handed to emotion so it can handle it (e.g. as value of `css` prop).";

/** Keyframes embedded in strings by keyframes() in string interpolations. */
const EMBEDDED_KEYFRAMES = /_EMO_([^_]+?)_([^]*?)_EMO_/g;
const LABEL = /label:\s*([^\s;{]+)\s*(;|$)/g;

const isCustomProperty = key => key.startsWith('--');
const isProcessableValue = value => value != null && typeof value !== 'boolean';

/** CSS property names: camelCase keys become kebab-case (msX becomes -ms-x). */
const processStyleName = memoize(key => (isCustomProperty(key) ? key : key.replace(/[A-Z]|^ms/g, '-$&').toLowerCase()));
/** The style object key for a property written in kebab-case. */
const camelize = memoize(key => key.replace(/^-ms-/, 'ms-').replace(/-(.)/g, (_, character) => character.toUpperCase()));

/**
 * One serialization: the registered styles and props it resolves against and
 * the keyframes it collects (a list, most recent first).
 */
class Serialization {
  constructor(registered, props) {
    this.registered = registered;
    this.props = props;
    this.keyframes = undefined;
  }

  addKeyframes(name, styles) {
    this.keyframes = {name, styles, next: this.keyframes};
  }

  value(key, value) {
    if (isDevelopment && key === 'content') checkContent(value);
    let processed = value;
    if ((key === 'animation' || key === 'animationName') && typeof value === 'string') {
      processed = value.replace(EMBEDDED_KEYFRAMES, (_, name, styles) => {
        this.addKeyframes(name, styles);
        return name;
      });
    } else if (typeof value === 'number' && value !== 0 && !isCustomProperty(key)) {
      // Numbers take px, except for unitless properties, whether the key is
      // written in camelCase or (unsupported, but seen) kebab-case.
      if (unitless[key.includes('-') ? camelize(key) : key] !== 1) processed = value + 'px';
    }
    if (isDevelopment && processed !== '' && !isCustomProperty(key) && key.includes('-')) warnKebabCase(key);
    return processed;
  }

  declaration(key, value) {
    return `${processStyleName(key)}:${this.value(key, value)};`;
  }

  interpolate(interpolation) {
    if (interpolation == null) return '';
    if (interpolation.__emotion_styles !== undefined) {
      // A styled component used as a selector (its toString is its class).
      if (isDevelopment && String(interpolation) === 'NO_COMPONENT_SELECTOR') throw new Error(NO_COMPONENT_SELECTOR_MESSAGE);
      return interpolation;
    }
    switch (typeof interpolation) {
      case 'boolean':
        return '';
      case 'object': {
        if (interpolation.anim === 1) {
          this.addKeyframes(interpolation.name, interpolation.styles);
          return interpolation.name;
        }
        if (interpolation.styles !== undefined) {
          for (let next = interpolation.next; next !== undefined; next = next.next) this.addKeyframes(next.name, next.styles);
          return `${interpolation.styles};`;
        }
        return this.object(interpolation);
      }
      case 'function':
        if (this.props !== undefined) return this.interpolate(interpolation(this.props));
        if (isDevelopment) console.error(FUNCTION_IN_CSS_MESSAGE);
        break;
      case 'string':
        if (isDevelopment) warnEmbeddedKeyframes(interpolation);
        break;
    }
    // A string (or a function stringified in a css call): a registered class
    // name stands for its styles.
    const registered = this.registered?.[interpolation];
    return registered !== undefined ? registered : interpolation;
  }

  object(styles) {
    let css = '';
    if (Array.isArray(styles)) {
      for (const item of styles) css += `${this.interpolate(item)};`;
      return css;
    }
    for (const key in styles) {
      const value = styles[key];
      if (typeof value !== 'object') {
        const registered = this.registered?.[value];
        if (registered !== undefined) css += `${key}{${registered}}`;
        else if (isProcessableValue(value)) css += this.declaration(key, value);
        continue;
      }
      if (isDevelopment && key === 'NO_COMPONENT_SELECTOR') throw new Error(NO_COMPONENT_SELECTOR_MESSAGE);
      if (Array.isArray(value) && isFallbackList(value, this.registered)) {
        // Fallback values: one declaration each.
        for (const item of value) if (isProcessableValue(item)) css += this.declaration(key, item);
        continue;
      }
      const interpolated = this.interpolate(value);
      if (key === 'animation' || key === 'animationName') {
        css += `${processStyleName(key)}:${interpolated};`;
      } else {
        if (isDevelopment && key === 'undefined') console.error(UNDEFINED_AS_OBJECT_KEY_ERROR);
        css += `${key}{${interpolated}}`;
      }
    }
    return css;
  }
}

/**
 * An array value is a list of fallback values when it holds strings or
 * numbers (not a registered class name, and not style objects for a nested
 * selector).
 */
function isFallbackList(values, registered) {
  const first = values[0];
  if (typeof first === 'number') return true;
  return typeof first === 'string' && registered?.[first] === undefined;
}

const CONTENT_FUNCTION = /(var|attr|counters?|url|element|(((repeating-)?(linear|radial))|conic)-gradient)\(|(no-)?(open|close)-quote/;
const CONTENT_KEYWORDS = ['normal', 'none', 'initial', 'inherit', 'unset'];
function checkContent(value) {
  const quoted = typeof value === 'string' && value.length > 0 && value[0] === value[value.length - 1] && (value[0] === '"' || value[0] === "'");
  if (typeof value !== 'string' || (!CONTENT_KEYWORDS.includes(value) && !CONTENT_FUNCTION.test(value) && !quoted)) {
    throw new Error(`You seem to be using a value for 'content' without quotes, try replacing it with \`content: '"${value}"'\``);
  }
}

const warnedKebabCase = new Set();
function warnKebabCase(key) {
  if (warnedKebabCase.has(key)) return;
  warnedKebabCase.add(key);
  console.error(`Using kebab-case for css properties in objects is not supported. Did you mean ${camelize(key)}?`);
}

function warnEmbeddedKeyframes(value) {
  const declarations = [];
  const replaced = value.replace(EMBEDDED_KEYFRAMES, (_, _name, styles) => {
    const variable = `animation${declarations.length}`;
    declarations.push(`const ${variable} = keyframes\`${styles.replace(/^@keyframes animation-\w+/, '')}\``);
    return `\${${variable}}`;
  });
  if (!declarations.length) return;
  console.error(`\`keyframes\` output got interpolated into plain string, please wrap it with \`css\`.

Instead of doing this:

${[...declarations, `\`${replaced}\``].join('\n')}

You should wrap it with \`css\` like this:

css\`${replaced}\``);
}

/**
 * Serializes style arguments: a tagged template's strings and values, or
 * interpolations. Returns the styles, their name (the hash of the styles and
 * any `label:` values) and the keyframes they use.
 * @param {Array<unknown>} args
 * @param {Record<string, string | undefined>} [registered]
 * @param {unknown} [mergedProps]
 */
export function serializeStyles(args, registered, mergedProps) {
  if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null && args[0].styles !== undefined) return args[0];
  const serialization = new Serialization(registered, mergedProps);
  const strings = args[0];
  const template = strings != null && strings.raw !== undefined;
  let styles = '';
  if (template) {
    if (isDevelopment && strings[0] === undefined) console.error(ILLEGAL_ESCAPE_SEQUENCE_ERROR);
    styles += strings[0];
  } else {
    styles += serialization.interpolate(strings);
  }
  for (let i = 1; i < args.length; i++) {
    styles += serialization.interpolate(args[i]);
    if (template) {
      if (isDevelopment && strings[i] === undefined) console.error(ILLEGAL_ESCAPE_SEQUENCE_ERROR);
      styles += strings[i];
    }
  }

  let identifierName = '';
  for (const match of styles.matchAll(LABEL)) identifierName += '-' + match[1];
  const name = hashString(styles) + identifierName;
  const serialized = {name, styles, next: serialization.keyframes};
  if (isDevelopment) serialized.toString = () => STRINGIFIED_STYLES_MESSAGE;
  return serialized;
}
