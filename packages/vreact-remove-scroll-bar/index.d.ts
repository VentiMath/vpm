import type { FC } from "react";
export * from "./constants";
export type GapMode = "margin" | "padding";
export interface GapOffset {
  left: number;
  top: number;
  right: number;
  gap: number;
}
export interface BodyScroll {
  noRelative?: boolean;
  noImportant?: boolean;
  gapMode?: GapMode;
}
export declare const RemoveScrollBar: FC<BodyScroll>;
export declare function getGapWidth(mode?: GapMode): GapOffset;
