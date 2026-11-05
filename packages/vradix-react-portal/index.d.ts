import type * as React from 'react';
import type {Primitive} from 'vradix-react-primitive';
export interface PortalProps extends React.ComponentPropsWithoutRef<typeof Primitive.div> {
  container?: Element | DocumentFragment | null | undefined;
}
export declare const Portal: React.ForwardRefExoticComponent<PortalProps & React.RefAttributes<HTMLDivElement>>;
export {Portal as Root};
