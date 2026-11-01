import type * as React from 'react';
/** Copies a component's own statics (other than React's) onto a wrapper. */
export default function hoistNonReactStatics<T extends React.ComponentType<any>, S extends React.ComponentType<any>>(targetComponent: T, sourceComponent: S): T;
