# vprosemirror-model

Independent rich-text document model targeting **prosemirror-model 1.25.12**.
Schemas describe valid content and marks; persistent nodes, fragments and slices
represent documents and edits. DOM parsing and serialization bridge those values
to an editor. Its only runtime dependency is `vorderedmap` 2.1.1.

```js
const {Schema} = require('vprosemirror-model');
const schema = new Schema({nodes: {
  doc: {content: 'paragraph+'},
  paragraph: {content: 'text*'},
  text: {}
}});
const document = schema.node('doc', null, [
  schema.node('paragraph', null, schema.text('Hello'))
]);
console.log(document.resolve(2).parent.textContent);
```

## Implementation and behavior

The runtime is independently written. Content expressions compile through a
small NFA into deterministic content states; breadth-first searches find filler
nodes and wrappers. Replacement emits complete untouched subtrees and the open
and close boundaries crossed by an edit, then reconstructs only those containers.
Positions use a bounded, document-keyed weak cache. Serialization creates DOM
nodes directly and shares adjacent mark wrappers.

The public exports match the model's core and DOM API: `Schema`, `NodeType`,
`MarkType`, `Node`, `Mark`, `Fragment`, `Slice`, `ResolvedPos`, `NodeRange`,
`ContentMatch`, `ReplaceError`, `DOMParser` and `DOMSerializer`. CommonJS and ESM
share class identity. Types include browser DOM APIs; core operations do not
require a DOM at runtime. The development baseline is Node 24 and Bun 1.4.4.

Deliberate differences:

- Resolved positions must be integers; serialized slice depths must be
  nonnegative integers. Invalid input fails early.
- Attribute values come from own properties only, with null-prototype output
  records. Inherited values cannot override defaults.
- DOM source-position mapping follows collapsed and trimmed whitespace instead of subtracting the original text length, which can yield negative positions upstream.
- Content-expression repeat counts above 10,000 are rejected. Error-message
  wording is not a compatibility promise.

Schemas and documents follow ProseMirror's immutable-by-contract model. Do not
mutate their arrays, attributes or specs after construction. This package is not
an HTML sanitizer: applications still control allowed elements and URL attributes
through their schema and extensions. Attribute-originated DOM-spec arrays are
rejected, preserving the upstream injection defense.

## Verification and scope

[Compatibility checks](../../scripts/prosemirror-model-conformance/README.md)
retain all 311 upstream tests unchanged, with source hashes and MIT attribution.
They cover content expressions, documents, marks, positions, slices, replacement,
DOM recovery and serialization. Original checks add 2,000 deterministic slice
edits, persistent subtree identity, strict positions/depths and attribute handling.

The real Tiptap 2.11.7 caller fixture covers the application's StarterKit,
task lists/items, images, links, highlight, underline, alignment, subscript and
superscript extensions. Thirteen command snapshots compare document JSON, HTML
and selections against both current upstream and VentiMath's installed 1.25.4.
Tests cover formatting, split/join, lists, undo/redo, cross-block deletion, paste
and the trailing-paragraph pattern.

This does not mark the complete Tiptap editor or VentiMath adoption finished.
Native IME, system clipboard, pointer interaction, screen-reader acceptance and
custom upload/network behavior need application-level verification before cutover.
A consumer release must pin the internal dependency archive and ensure every
ProseMirror caller uses this model instance; mixing model copies is unsupported.
No public release is claimed by this source package.

[Isolated Node/Bun measurements](bench/results/README.md) report each operation
and control spread. The current recordings have large identical-source control
variation, so none of their timing directions is established. They are retained
without selecting favorable samples and do not support an editor-wide speed claim.
