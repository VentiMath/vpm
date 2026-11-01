# vemotion-is-prop-valid

Which props `styled()` forwards to DOM elements, targeting
**@emotion/is-prop-valid 1.4.0**, the latest release checked November 1, 2026.
On [vemotion-memoize](../vemotion-memoize); an ES module for browsers, Node.js
24+ and Bun.

```js
import isPropValid from 'vemotion-is-prop-valid';
isPropValid('href'); // true
isPropValid('onClick'); // true (event handlers)
isPropValid('aria-label'); // true (data-, aria- and x- attributes)
isPropValid('variant'); // false: kept for the component
```

The attribute names are the HTML and SVG props React renders, every name
@emotion/is-prop-valid accepts, plus 17 it rejects, so a styled element dropped
them: invoker commands (`command`, `commandFor`), `closedBy` on dialogs, shadow
parts (`part`, `exportParts`), declarative shadow roots (`shadowRootMode`,
`shadowRootDelegatesFocus`, `shadowRootClonable`, `shadowRootSerializable`),
`<link>` image candidates (`imageSrcSet`, `imageSizes`), `noModule`, `blocking`,
React 19's `precedence`, SVG's `transformOrigin`, `writingSuggestions` and
`elementTiming`. `as` is not forwarded: it is styled's own prop.

Emotion's suite passes with this package in place of the original; see the
[conformance record](../../scripts/emotion-conformance/README.md).
