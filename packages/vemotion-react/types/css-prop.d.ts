import type {} from 'react';
import type {Interpolation} from 'vemotion-serialize';
import type {Theme} from 'vemotion-react';

// The css prop on every element and component, for the classic runtime
// without jsxImportSource (import 'vemotion-react/types/css-prop').
declare module 'react' {
  interface Attributes {
    css?: Interpolation<Theme>;
  }
}
