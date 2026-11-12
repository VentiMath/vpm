import type { ReactNode, Ref, CSSProperties } from "react";
export type Placement =
  `${"top" | "bottom" | "left" | "right"}${"" | "-start" | "-end"}`;
export type Strategy = "absolute" | "fixed";
export interface VirtualElement {
  getBoundingClientRect():
    | DOMRect
    | {
        x: number;
        y: number;
        top: number;
        left: number;
        bottom: number;
        right: number;
        width: number;
        height: number;
      };
  contextElement?: Element;
}
export interface PositionResult {
  placement: Placement;
  styles: { popper: CSSProperties; arrow: CSSProperties };
  attributes: Record<string, Record<string, string>>;
  isReferenceHidden: boolean;
  hasPopperEscaped: boolean;
}
export interface PopperChildrenProps {
  ref: Ref<HTMLElement>;
  style: CSSProperties;
  placement: Placement;
  arrowProps: { ref: Ref<HTMLElement>; style: CSSProperties };
  update(): Promise<PositionResult | null>;
  isReferenceHidden: boolean;
  hasPopperEscaped: boolean;
}
export type Padding =
  | number
  | Partial<Record<"top" | "left" | "bottom" | "right", number>>;
export type Boundary = "clippingParents" | Element | Element[];
export interface OverflowOptions {
  padding?: Padding;
  boundary?: Boundary;
  rootBoundary?: "viewport" | "document";
  mainAxis?: boolean;
  altAxis?: boolean;
}
export type Modifier =
  | {
      name: "offset";
      enabled?: boolean;
      options?: {
        offset?:
          | [number, number]
          | ((state: {
              placement: Placement;
              reference: {
                x: number;
                y: number;
                width: number;
                height: number;
              };
              popper: { x: number; y: number; width: number; height: number };
            }) => [number, number]);
      };
    }
  | {
      name: "flip";
      enabled?: boolean;
      options?: OverflowOptions & {
        fallbackPlacements?: Placement[];
        flipVariations?: boolean;
      };
    }
  | {
      name: "preventOverflow";
      enabled?: boolean;
      options?: OverflowOptions & { tether?: boolean };
    }
  | { name: "arrow"; enabled?: boolean; options?: { padding?: Padding } }
  | { name: "hide"; enabled?: boolean }
  | {
      name: "eventListeners";
      enabled?: boolean;
      options?: { scroll?: boolean; resize?: boolean };
    }
  | {
      name: "computeStyles";
      enabled?: true;
      options?: {
        gpuAcceleration?: boolean;
        roundOffsets?:
          | boolean
          | ((point: { x: number; y: number }) => { x: number; y: number });
      };
    };
export interface PopperProps {
  children: (props: PopperChildrenProps) => ReactNode;
  innerRef?: Ref<HTMLElement>;
  referenceElement?: HTMLElement | VirtualElement;
  placement?: Placement;
  strategy?: Strategy;
  modifiers?: readonly Modifier[];
  onFirstUpdate?: (state: PositionResult) => void;
}
export declare function Manager(props: { children?: ReactNode }): ReactNode;
export declare function Reference(props: {
  children: (props: { ref: Ref<HTMLElement> }) => ReactNode;
  innerRef?: Ref<HTMLElement>;
}): ReactNode;
export declare function Popper(props: PopperProps): ReactNode;
