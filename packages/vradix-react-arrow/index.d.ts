import type { ComponentPropsWithoutRef, ForwardRefExoticComponent, RefAttributes } from 'react';

export interface ArrowProps extends ComponentPropsWithoutRef<'svg'> {
  asChild?: boolean | undefined;
}

export declare const Arrow: ForwardRefExoticComponent<ArrowProps & RefAttributes<SVGSVGElement>>;
export { Arrow as Root };
