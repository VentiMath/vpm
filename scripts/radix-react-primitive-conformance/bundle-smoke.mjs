import React from 'react';
import { renderToString } from 'react-dom/server';
import { Primitive } from 'vradix-react-primitive';

// A successful bundle alone does not prove that React imports survived linking.
// Render the slotted path to exercise forwardRef, jsx and useMemo in the bundle.
globalThis.vpmPrimitiveMarkup = renderToString(React.createElement(
  Primitive.svg,
  { asChild: true, className: 'outer', ref: () => {} },
  React.createElement('svg', { className: 'inner' }, React.createElement('path', { d: 'M0 0L1 1' })),
));
