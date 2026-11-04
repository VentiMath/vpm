'use client';
'use strict';

const React = require('react');
const JSX = require('react/jsx-runtime');
const { Primitive } = require('vradix-react-primitive');

// The default geometry never changes. React elements are immutable and can be
// shared between instances; each mounted SVG still gets its own polygon node.
const triangle = JSX.jsx('polygon', { points: '0,0 30,0 15,10' });

const Arrow = React.forwardRef(function Arrow(props, ref) {
  const { children, width = 10, height = 5, ...svg } = props;
  svg.ref = ref;
  svg.width = width;
  svg.height = height;
  svg.viewBox = '0 0 30 10';
  svg.preserveAspectRatio = 'none';
  svg.children = props.asChild ? children : triangle;
  return JSX.jsx(Primitive.svg, svg);
});

module.exports = { Arrow, Root: Arrow };
