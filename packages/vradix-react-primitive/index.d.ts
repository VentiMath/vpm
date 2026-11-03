import type {ComponentPropsWithRef, ElementType, ForwardRefExoticComponent} from 'react';
export type PrimitivePropsWithRef<E extends ElementType> = ComponentPropsWithRef<E> & {asChild?: boolean | undefined};
type Tag = 'a' | 'button' | 'div' | 'form' | 'h2' | 'h3' | 'img' | 'input' | 'label' | 'li' | 'nav' | 'ol' | 'p' | 'select' | 'span' | 'svg' | 'ul';
export declare const Primitive: {[E in Tag]: ForwardRefExoticComponent<PrimitivePropsWithRef<E>>};
export {Primitive as Root};
/** Dispatch inside React's synchronous update boundary; null targets are ignored. */
export declare function dispatchDiscreteCustomEvent<E extends CustomEvent>(target: E['target'], event: E): void;
