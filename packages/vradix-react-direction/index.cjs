'use client';
'use strict';
const React = require('react');
const directionContext = React.createContext(undefined);

function DirectionProvider({dir, children}) {
  return React.createElement(directionContext, {value: dir}, children);
}

function useDirection(localDirection) {
  const inheritedDirection = React.useContext(directionContext);
  return localDirection || inheritedDirection || 'ltr';
}

exports.DirectionProvider = DirectionProvider;
exports.Provider = DirectionProvider;
exports.useDirection = useDirection;
