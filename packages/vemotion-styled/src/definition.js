import isPropValid from 'vemotion-is-prop-valid';
import isDevelopment from '#is-development';

const componentProp = name => name !== 'theme';
const escapeError = `You have illegal escape sequence in your template literal, most likely inside content's property value.
Because you write your CSS inside a JavaScript string you actually have to do double escaping, so for example "content: '\\00d7';" should become "content: '\\\\00d7';".
You can read more about this here:
https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#ES2018_revision_of_illegal_escape_sequences`;

export function elementFilter(element) {
  return typeof element === 'string' && element.charCodeAt(0) > 96 ? isPropValid : componentProp;
}

// A predicate is an intersection when both the parent and the caller supply
// one. Defaults depend on the rendered element and must not be inherited as
// explicit predicates (otherwise `as={CustomComponent}` drops custom props).
function intersect(parent, supplied) {
  if (parent && supplied) return name => parent(name) && supplied(name);
  return supplied;
}

export class StyleDefinition {
  constructor(source, options) {
    this.source = source;
    this.options = options && {...options};
    this.flatten = source.__emotion_real === source;
    this.element = this.flatten && source.__emotion_base || source;
    const predicate = options ? intersect(source.__emotion_forwardProp, options.shouldForwardProp) : undefined;
    this.filter = typeof predicate === 'function' ? predicate : this.flatten ? source.__emotion_forwardProp : predicate;
    this.forward = this.filter || elementFilter(this.element);
    this.consumeAs = !this.forward('as');
  }

  collect(arguments_) {
    // Read the facade at component construction, after any MUI processing.
    const collected = this.flatten && this.source.__emotion_styles !== undefined ? this.source.__emotion_styles.slice() : [];
    if (this.options?.label !== undefined) collected.push(`label:${this.options.label};`);
    const template = arguments_[0];
    if (template?.raw === undefined) {
      collected.push(...arguments_);
      return collected;
    }
    for (let index = 0; index < arguments_.length; index++) {
      if (index) collected.push(arguments_[index]);
      if (isDevelopment && template[index] === undefined) console.error(escapeError);
      collected.push(template[index]);
    }
    return collected;
  }

  retarget(element, options) {
    // Retargeting keeps explicit filtering, labels and targets, but computes
    // default DOM filtering from the new element rather than the old one.
    const predicate = options && intersect(this.filter, options.shouldForwardProp);
    return new StyleDefinition(element, {...this.options, ...options,
      shouldForwardProp: typeof predicate === 'function' ? predicate : this.filter});
  }

  destination(props) {
    const element = this.consumeAs && props.as || this.element;
    const filter = this.consumeAs && this.filter === undefined ? elementFilter(element) : this.forward;
    const forwarded = {};
    for (const name in props) {
      if (this.consumeAs && name === 'as') continue;
      if (filter(name)) forwarded[name] = props[name];
    }
    return {element, forwarded};
  }
}
