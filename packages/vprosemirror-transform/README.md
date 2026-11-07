# vprosemirror-transform

Independent rich-text edit steps and position mapping targeting
**prosemirror-transform 1.12.5**. Its runtime dependency is
`vprosemirror-model` 1.25.12.

```js
const {Transform} = require('vprosemirror-transform');
const edit = new Transform(document).insert(3, document.type.schema.text('hello'));
const newCursor = edit.mapping.map(oldCursor);
const undo = edit.steps[0].invert(edit.docs[0]);
```

## Implementation and compatibility

The runtime is independently written. Edits retain persistent document subtrees;
paste fitting processes boundary events against the schema's content automata.
Wrapping, filler content and surviving suffixes are fitted without copying the
upstream runtime. Step maps track changed token ranges and recover positions
through mirrored edits. Mapping slices use copy-on-write arrays.

Exports cover `Transform`, `Step`, `StepResult`, `StepMap`, `Mapping`, `MapResult`,
replacement, mark, node-mark and attribute steps, and the public split, join,
lift, wrapping, insertion, drop and replacement helpers. CommonJS and ESM share
class identity. JSON steps include current upstream's composite mark inverses:
undo restores formatting that existed before a potentially overlapping edit.

Deliberate differences: serialized step positions must be nonnegative safe
integers, and step registration uses a `Map` rather than inherited object keys.
Join discovery rejects an incompatible empty textblock after a container;
upstream can report that boundary as joinable even though its own join throws.
Error-message wording is not guaranteed. Objects follow ProseMirror's immutable
contract; callers must not mutate document content, map ranges or schema specs.
The supported development runtimes are Node 24 and Bun 1.4.4.

## Verification and scope

[Conformance fixtures](../../scripts/prosemirror-transform-conformance/README.md)
retain 248 upstream tests unchanged, including deterministic runs of their
randomized inversion checks. Original tests compare 3,000 editor operations,
selection mapping, undo, mirrored rebasing, composite mark JSON and 18 cross-list
deletion cases against the current baseline. Real Tiptap extension/command fixtures compare thirteen JSON,
HTML and selection snapshots against current upstream and VentiMath's installed
transform 1.11.0. Packed npm/Bun installs, TypeScript 7 consumers and Chrome run
against the complete VPM transform/model/ordered-map closure.

[Core measurements](bench/results/README.md) and a separate
[closed-block paste measurement](bench/fitting-results/README.md) use isolated
processes, balanced order and identical-source controls. They measure individual
operations and the model closure, not an editor-wide speedup. The final reports
retain the faster, slower and inconclusive cases on both runtimes, including
Bun mapping and wrap/lift overhead. All raw samples and source hashes are kept.
The cross-list deletion path closes surviving ancestors with a validated edit
step before falling back to general fitting; it preserves the schema checks.

This completes the documented source-package scope. A public release and
VentiMath adoption are separate. Native IME, system clipboard, browser input
handling and collaborative-server integration belong to the editor cutover.
All ProseMirror callers must resolve the same model and transform instances.
