import React from 'react';
import { renderToString } from 'react-dom/server';
import { createContextScope } from 'vradix-react-context';
const [create, scope] = createContextScope('Example');
const [Provider, read] = create('Example');
const useScope = scope();
function Child({ value }) { return React.createElement('b', null, read('Child', value).answer); }
function App() { const value = useScope().__scopeExample; return React.createElement(Provider, { scope: value, answer: 42 }, React.createElement(Child, { value })); }
globalThis.vpmContextMarkup = renderToString(React.createElement(App));
