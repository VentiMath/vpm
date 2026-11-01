# vemotion-sheet

The style element sheet behind Emotion, targeting **@emotion/sheet 1.4.0**, the
latest release checked November 1, 2026. No dependencies; an ES module for
browsers (and server bundles that construct it without inserting rules).

```js
import {StyleSheet} from 'vemotion-sheet';
const sheet = new StyleSheet({key: 'css', container: document.head, nonce: window.cspNonce});
sheet.insert('.css-1x{color:red;}');
sheet.flush();
```

In production builds (`speedy`), rules are added with `insertRule`, up to 65,000
per `<style data-emotion>` element; in development each rule gets an element of
its own, so its source map can point at it, and an `@import` inserted after
other rules is reported. `insertionPoint` (or the deprecated `prepend`) places
the first element; `before` can be set to place it before a node; `hydrate()`
adopts server-rendered elements. The public fields are the original's: MUI
subclasses `StyleSheet`, overriding `insert` and setting `before`.

The `development` export condition (Vite, webpack and Jest set it in
development) selects development behavior. Style elements are created by the
container's own document. Declarations use DOM types. Emotion's suite passes
with this package in place of the original; see the
[conformance record](../../scripts/emotion-conformance/README.md).
