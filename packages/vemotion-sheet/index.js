import isDevelopment from '#is-development';

// Style elements for CSS-in-JS. In production (speedy) rules are added with
// insertRule, up to 65,000 per element; in development each rule gets an
// element of its own, so a source map can point at it.

const RULES_PER_ELEMENT = 65000;
// Vendor-prefixed selectors a browser is expected to reject.
const EXPECTED_REJECTIONS = /:(-moz-placeholder|-moz-focus-inner|-moz-focusring|-ms-input-placeholder|-moz-read-write|-moz-read-only|-ms-clear|-ms-expand|-ms-reveal){/;

/** The CSSStyleSheet of a connected style element. */
function sheetOf(element) {
  if (element.sheet) return element.sheet;
  // Older Firefox exposes it only through document.styleSheets.
  for (const sheet of element.ownerDocument.styleSheets) if (sheet.ownerNode === element) return sheet;
  return undefined;
}

export class StyleSheet {
  #importAfterRules = false;

  /**
   * @param {{key: string, container: Node, nonce?: string, speedy?: boolean, prepend?: boolean, insertionPoint?: HTMLElement}} options
   */
  constructor(options) {
    this.isSpeedy = options.speedy === undefined ? !isDevelopment : options.speedy;
    this.tags = [];
    this.ctr = 0;
    this.nonce = options.nonce;
    /** The data-emotion attribute of this sheet's elements. */
    this.key = options.key;
    this.container = options.container;
    this.prepend = options.prepend;
    this.insertionPoint = options.insertionPoint;
    /** The node the first element is inserted before (when neither insertionPoint nor prepend applies). */
    this.before = null;
  }

  /** Adds existing style elements (rendered by the server) to the sheet. */
  hydrate(nodes) {
    for (const node of nodes) this.#insertTag(node);
  }

  /** Adds a rule. */
  insert(rule) {
    if (this.ctr % (this.isSpeedy ? RULES_PER_ELEMENT : 1) === 0) this.#insertTag(this.#createTag());
    const tag = this.tags[this.tags.length - 1];

    if (isDevelopment) {
      const isImport = rule.charCodeAt(0) === 64 && rule.charCodeAt(1) === 105; // @i(mport)
      if (isImport && this.#importAfterRules) {
        console.error(
          `You're attempting to insert the following rule:\n` +
            rule +
            '\n\n`@import` rules must be before all other types of rules in a stylesheet but other rules have already been inserted. Please ensure that `@import` rules are before all other rules.',
        );
      }
      this.#importAfterRules ||= !isImport;
    }

    if (this.isSpeedy) {
      const sheet = sheetOf(tag);
      try {
        sheet.insertRule(rule, sheet.cssRules.length);
      } catch (error) {
        if (isDevelopment && !EXPECTED_REJECTIONS.test(rule)) console.error(`There was a problem inserting the following rule: "${rule}"`, error);
      }
    } else {
      tag.appendChild(tag.ownerDocument.createTextNode(rule));
    }
    this.ctr++;
  }

  /** Removes the sheet's elements. */
  flush() {
    for (const tag of this.tags) tag.parentNode?.removeChild(tag);
    this.tags = [];
    this.ctr = 0;
    if (isDevelopment) this.#importAfterRules = false;
  }

  #createTag() {
    const tag = (this.container.ownerDocument ?? document).createElement('style');
    tag.setAttribute('data-emotion', this.key);
    if (this.nonce !== undefined) tag.setAttribute('nonce', this.nonce);
    tag.appendChild(tag.ownerDocument.createTextNode(''));
    tag.setAttribute('data-s', '');
    return tag;
  }

  #insertTag(tag) {
    let before;
    if (this.tags.length === 0) {
      if (this.insertionPoint) before = this.insertionPoint.nextSibling;
      else if (this.prepend) before = this.container.firstChild;
      else before = this.before;
    } else {
      before = this.tags[this.tags.length - 1].nextSibling;
    }
    this.container.insertBefore(tag, before);
    this.tags.push(tag);
  }
}
