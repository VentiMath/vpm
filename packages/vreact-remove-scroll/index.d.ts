import type {
  ComponentType,
  ElementType,
  ForwardRefExoticComponent,
  HTMLAttributes,
  ReactElement,
  ReactNode,
  RefAttributes,
  RefObject,
} from "react";
export type GapMode = "margin" | "padding";
export interface IRemoveScrollSelfProps extends HTMLAttributes<HTMLElement> {
  enabled?: boolean;
  removeScrollBar?: boolean;
  noRelative?: boolean;
  noIsolation?: boolean;
  inert?: boolean;
  allowPinchZoom?: boolean;
  gapMode?: GapMode;
  as?: ElementType;
  shards?: Array<HTMLElement | RefObject<HTMLElement | null>>;
}
export type IRemoveScrollProps = IRemoveScrollSelfProps &
  (
    | { forwardProps?: false; children: ReactNode }
    | { forwardProps: true; children: ReactElement }
  );
export type RemoveScrollType = ForwardRefExoticComponent<
  IRemoveScrollProps & RefAttributes<HTMLElement>
> & {
  classNames: { fullWidth: string; zeroRight: string };
};
export type IRemoveScrollUIProps = IRemoveScrollProps & {
  sideCar: ComponentType<any>;
};
export type RemoveScrollUIType = ForwardRefExoticComponent<
  IRemoveScrollUIProps & RefAttributes<HTMLElement>
> & { classNames: RemoveScrollType["classNames"] };
export declare const RemoveScroll: RemoveScrollType;
