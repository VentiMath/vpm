import * as React from 'react';
type Handler<E> = { bivarianceHack(event: E): void }['bivarianceHack'];
type PointerOutside = CustomEvent<{ originalEvent: PointerEvent }>;
type FocusOutside = CustomEvent<{ originalEvent: FocusEvent }>;
export interface DismissableLayerProps extends React.ComponentPropsWithoutRef<'div'> {
  asChild?: boolean | undefined;
  disableOutsidePointerEvents?: boolean | undefined;
  deferPointerDownOutside?: boolean | undefined;
  onEscapeKeyDown?: Handler<KeyboardEvent> | undefined;
  onPointerDownOutside?: Handler<PointerOutside> | undefined;
  onFocusOutside?: Handler<FocusOutside> | undefined;
  onInteractOutside?: Handler<PointerOutside | FocusOutside> | undefined;
  onDismiss?: (() => void) | undefined;
}
export declare const DismissableLayer: React.ForwardRefExoticComponent<DismissableLayerProps & React.RefAttributes<HTMLDivElement>>;
export declare const DismissableLayerBranch: React.ForwardRefExoticComponent<React.ComponentPropsWithoutRef<'div'> & { asChild?: boolean | undefined } & React.RefAttributes<HTMLDivElement>>;
export declare function useDismissableLayerSurface(): React.RefCallback<HTMLDivElement>;
export { DismissableLayer as Root, DismissableLayerBranch as Branch };
