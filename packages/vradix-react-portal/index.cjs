'use client';
'use strict';
const React = require('react');
const ReactDOM = require('react-dom');
const { Primitive } = require('vradix-react-primitive');
const { useIsHydrated } = require('vradix-react-use-is-hydrated');

const Portal = React.forwardRef(function Portal({ container, ...attributes }, ref) {
  // React chooses the server snapshot separately for each hydrating root.
  // A fresh client root can portal on its first commit without a mount effect.
  // Even an explicit DOM container must wait during SSR: React cannot serialize
  // portals, and returning null keeps server and first hydration output aligned.
  const client = useIsHydrated();
  if (!client) return null;
  const destination = container ?? globalThis.document?.body;
  return destination ? ReactDOM.createPortal(React.createElement(Primitive.div, { ...attributes, ref }), destination) : null;
});
Portal.displayName = 'Portal';
module.exports = { Portal, Root: Portal };
