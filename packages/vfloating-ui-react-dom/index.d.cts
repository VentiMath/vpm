// Public declarations adapted from Floating UI 2.1.9 (MIT; see LICENSE).
import { AlignedPlacement } from 'vfloating-ui-dom';
import { Alignment } from 'vfloating-ui-dom';
import { AutoPlacementOptions } from 'vfloating-ui-dom';
import { autoUpdate } from 'vfloating-ui-dom';
import { AutoUpdateOptions } from 'vfloating-ui-dom';
import { Axis } from 'vfloating-ui-dom';
import { Boundary } from 'vfloating-ui-dom';
import { ClientRectObject } from 'vfloating-ui-dom';
import { computePosition } from 'vfloating-ui-dom';
import { ComputePositionConfig } from 'vfloating-ui-dom';
import { ComputePositionReturn } from 'vfloating-ui-dom';
import { Coords } from 'vfloating-ui-dom';
import { Derivable } from 'vfloating-ui-dom';
import { detectOverflow } from 'vfloating-ui-dom';
import { DetectOverflowOptions } from 'vfloating-ui-dom';
import { Dimensions } from 'vfloating-ui-dom';
import { ElementContext } from 'vfloating-ui-dom';
import { ElementRects } from 'vfloating-ui-dom';
import { Elements } from 'vfloating-ui-dom';
import { FlipOptions } from 'vfloating-ui-dom';
import { FloatingElement } from 'vfloating-ui-dom';
import { getOverflowAncestors } from 'vfloating-ui-dom';
import { HideOptions } from 'vfloating-ui-dom';
import { InlineOptions } from 'vfloating-ui-dom';
import { Length } from 'vfloating-ui-dom';
import { LimitShiftOptions } from 'vfloating-ui-dom';
import { Middleware } from 'vfloating-ui-dom';
import { MiddlewareArguments } from 'vfloating-ui-dom';
import { MiddlewareData } from 'vfloating-ui-dom';
import { MiddlewareReturn } from 'vfloating-ui-dom';
import { MiddlewareState } from 'vfloating-ui-dom';
import { NodeScroll } from 'vfloating-ui-dom';
import { OffsetOptions } from 'vfloating-ui-dom';
import { Padding } from 'vfloating-ui-dom';
import { Placement } from 'vfloating-ui-dom';
import { Platform } from 'vfloating-ui-dom';
import { platform } from 'vfloating-ui-dom';
import type * as React from 'react';
import { Rect } from 'vfloating-ui-dom';
import { ReferenceElement } from 'vfloating-ui-dom';
import { RootBoundary } from 'vfloating-ui-dom';
import { ShiftOptions } from 'vfloating-ui-dom';
import { Side } from 'vfloating-ui-dom';
import { SideObject } from 'vfloating-ui-dom';
import { SizeOptions } from 'vfloating-ui-dom';
import { Strategy } from 'vfloating-ui-dom';
import { VirtualElement } from 'vfloating-ui-dom';

export { AlignedPlacement }

export { Alignment }

/**
 * Provides data to position an inner element of the floating element so that it
 * appears centered to the reference element.
 * This wraps the core `arrow` middleware to allow React refs as the element.
 * @see https://floating-ui.com/docs/arrow
 */
export declare const arrow: (options: ArrowOptions | Derivable<ArrowOptions>, deps?: React.DependencyList) => Middleware;

export declare interface ArrowOptions {
    /**
     * The arrow element to be positioned.
     * @default undefined
     */
    element: React.MutableRefObject<Element | null> | Element | null;
    /**
     * The padding between the arrow element and the floating element edges.
     * Useful when the floating element has rounded corners.
     * @default 0
     */
    padding?: Padding | undefined;
}

/**
 * Optimizes the visibility of the floating element by choosing the placement
 * that has the most space available automatically, without needing to specify a
 * preferred placement. Alternative to `flip`.
 * @see https://floating-ui.com/docs/autoPlacement
 */
export declare const autoPlacement: (options?: AutoPlacementOptions | Derivable<AutoPlacementOptions>, deps?: React.DependencyList) => Middleware;

export { AutoPlacementOptions }

export { autoUpdate }

export { AutoUpdateOptions }

export { Axis }

export { Boundary }

export { ClientRectObject }

export { computePosition }

export { ComputePositionConfig }

export { ComputePositionReturn }

export { Coords }

export { Derivable }

export { detectOverflow }

export { DetectOverflowOptions }

export { Dimensions }

export { ElementContext }

export { ElementRects }

export { Elements }

/**
 * Optimizes the visibility of the floating element by flipping the `placement`
 * in order to keep it in view when the preferred placement(s) will overflow the
 * clipping boundary. Alternative to `autoPlacement`.
 * @see https://floating-ui.com/docs/flip
 */
export declare const flip: (options?: FlipOptions | Derivable<FlipOptions>, deps?: React.DependencyList) => Middleware;

export { FlipOptions }

export { FloatingElement }

export { getOverflowAncestors }

/**
 * Provides data to hide the floating element in applicable situations, such as
 * when it is not in the same clipping context as the reference element.
 * @see https://floating-ui.com/docs/hide
 */
export declare const hide: (options?: HideOptions | Derivable<HideOptions>, deps?: React.DependencyList) => Middleware;

export { HideOptions }

/**
 * Provides improved positioning for inline reference elements that can span
 * over multiple lines, such as hyperlinks or range selections.
 * @see https://floating-ui.com/docs/inline
 */
export declare const inline: (options?: InlineOptions | Derivable<InlineOptions>, deps?: React.DependencyList) => Middleware;

export { InlineOptions }

export { Length }

/**
 * Built-in `limiter` that will stop `shift()` at a certain point.
 */
export declare const limitShift: (options?: LimitShiftOptions | Derivable<LimitShiftOptions>, deps?: React.DependencyList) => {
    fn: (state: MiddlewareState) => Coords;
    options: any;
};

export { Middleware }

export { MiddlewareArguments }

export { MiddlewareData }

export { MiddlewareReturn }

export { MiddlewareState }

export { NodeScroll }

/**
 * Modifies the placement by translating the floating element along the
 * specified axes.
 * A number (shorthand for `mainAxis` or distance), or an axes configuration
 * object may be passed.
 * @see https://floating-ui.com/docs/offset
 */
export declare const offset: (options?: OffsetOptions, deps?: React.DependencyList) => Middleware;

export { OffsetOptions }

export { Padding }

export { Placement }

export { Platform }

export { platform }

declare type Prettify<T> = {
    [K in keyof T]: T[K];
} & {};

export { Rect }

export { ReferenceElement }

export declare type ReferenceType = Element | VirtualElement;

export { RootBoundary }

/**
 * Optimizes the visibility of the floating element by shifting it in order to
 * keep it in view when it will overflow the clipping boundary.
 * @see https://floating-ui.com/docs/shift
 */
export declare const shift: (options?: ShiftOptions | Derivable<ShiftOptions>, deps?: React.DependencyList) => Middleware;

export { ShiftOptions }

export { Side }

export { SideObject }

/**
 * Provides data that allows you to change the size of the floating element —
 * for instance, prevent it from overflowing the clipping boundary or match the
 * width of the reference element.
 * @see https://floating-ui.com/docs/size
 */
export declare const size: (options?: SizeOptions | Derivable<SizeOptions>, deps?: React.DependencyList) => Middleware;

export { SizeOptions }

export { Strategy }

/**
 * Provides data to position a floating element.
 * @see https://floating-ui.com/docs/useFloating
 */
export declare function useFloating<RT extends ReferenceType = ReferenceType>(options?: UseFloatingOptions): UseFloatingReturn<RT>;

export declare type UseFloatingData = Prettify<ComputePositionReturn & {
    isPositioned: boolean;
}>;

export declare type UseFloatingOptions<RT extends ReferenceType = ReferenceType> = Prettify<Partial<ComputePositionConfig> & {
    /**
     * A callback invoked when both the reference and floating elements are
     * mounted, and cleaned up when either is unmounted. This is useful for
     * setting up event listeners (e.g. pass `autoUpdate`).
     */
    whileElementsMounted?: ((reference: RT, floating: HTMLElement, update: () => void) => () => void) | undefined;
    /**
     * Object containing the reference and floating elements.
     */
    elements?: {
        reference?: RT | null | undefined;
        floating?: HTMLElement | null | undefined;
    } | undefined;
    /**
     * The `open` state of the floating element to synchronize with the
     * `isPositioned` value.
     * @default false
     */
    open?: boolean | undefined;
    /**
     * Whether to use `transform` for positioning instead of `top` and `left`
     * (layout) in the `floatingStyles` object.
     * @default true
     */
    transform?: boolean | undefined;
}>;

export declare type UseFloatingReturn<RT extends ReferenceType = ReferenceType> = Prettify<UseFloatingData & {
    /**
     * Update the position of the floating element, re-rendering the component
     * if required.
     */
    update: () => void;
    /**
     * Pre-configured positioning styles to apply to the floating element.
     */
    floatingStyles: React.CSSProperties;
    /**
     * Object containing the reference and floating refs and reactive setters.
     */
    refs: {
        /**
         * A React ref to the reference element.
         */
        reference: React.MutableRefObject<RT | null>;
        /**
         * A React ref to the floating element.
         */
        floating: React.MutableRefObject<HTMLElement | null>;
        /**
         * A callback to set the reference element (reactive).
         */
        setReference: (node: RT | null) => void;
        /**
         * A callback to set the floating element (reactive).
         */
        setFloating: (node: HTMLElement | null) => void;
    };
    /**
     * Object containing the reference and floating elements.
     */
    elements: {
        reference: RT | null;
        floating: HTMLElement | null;
    };
}>;

export { VirtualElement }

export { }
