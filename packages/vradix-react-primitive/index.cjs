'use client';
'use strict';
const React = require('react');
const JSX = require('react/jsx-runtime');
const {createSlot} = require('vradix-react-slot');
const Primitive = {};
const marker = Symbol.for('radix-ui');
for (const tag of ['a','button','div','form','h2','h3','img','input','label','li','nav','ol','p','select','span','svg','ul']) {
  let slot;
  const component = React.forwardRef(function RenderPrimitive(props, ref) {
    const {asChild, ...attributes} = props;
    attributes.ref = ref;
    if (typeof window !== 'undefined') window[marker] = true;
    // Each tag's wrapper is initialized once, only if it uses asChild. The
    // cached component identity survives updates and StrictMode renders.
    const type = asChild ? (slot ??= createSlot(`Primitive.${tag}`)) : tag;
    return JSX.jsx(type, attributes);
  });
  component.displayName = `Primitive.${tag}`;
  Primitive[tag] = component;
}
function dispatchDiscreteCustomEvent(target, event) {
  if (target) require('react-dom').flushSync(() => target.dispatchEvent(event));
}
module.exports = {Primitive, Root:Primitive, dispatchDiscreteCustomEvent};
