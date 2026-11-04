import type * as React from 'react';
import type { CreateScope } from 'vradix-react-context';
import type { ArrowProps } from 'vradix-react-arrow';

export declare const SIDE_OPTIONS: readonly ['top', 'right', 'bottom', 'left'];
export declare const ALIGN_OPTIONS: readonly ['start', 'center', 'end'];
export declare const createPopperScope: CreateScope;
export interface PopperProps { children?: React.ReactNode | undefined; }
export declare const Popper: React.FC<PopperProps>;
interface DivProps extends React.ComponentPropsWithoutRef<'div'> { asChild?: boolean | undefined; }
export interface PopperAnchorProps extends DivProps {
  virtualRef?: React.RefObject<{ getBoundingClientRect(): DOMRect } | null> | undefined;
}
export interface PopperContentProps extends DivProps {
  side?: typeof SIDE_OPTIONS[number] | undefined;
  align?: typeof ALIGN_OPTIONS[number] | undefined;
  sideOffset?: number | undefined;
  alignOffset?: number | undefined;
  arrowPadding?: number | undefined;
  avoidCollisions?: boolean | undefined;
  collisionBoundary?: Element | null | (Element | null)[] | undefined;
  collisionPadding?: number | Partial<Record<typeof SIDE_OPTIONS[number], number>> | undefined;
  sticky?: 'partial' | 'always' | undefined;
  hideWhenDetached?: boolean | undefined;
  updatePositionStrategy?: 'optimized' | 'always' | undefined;
  onPlaced?: (() => void) | undefined;
}
export interface PopperArrowProps extends ArrowProps {}
export declare const PopperAnchor: React.ForwardRefExoticComponent<PopperAnchorProps & React.RefAttributes<HTMLDivElement>>;
export declare const PopperContent: React.ForwardRefExoticComponent<PopperContentProps & React.RefAttributes<HTMLDivElement>>;
export declare const PopperArrow: React.ForwardRefExoticComponent<PopperArrowProps & React.RefAttributes<SVGSVGElement>>;
export { Popper as Root, PopperAnchor as Anchor, PopperContent as Content, PopperArrow as Arrow };
