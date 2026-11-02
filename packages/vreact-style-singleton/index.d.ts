import type { FC } from "react";
export declare function stylesheetSingleton(): {
  add(styles: string): void;
  remove(): void;
};
export declare function styleHookSingleton(): (
  styles: string,
  dynamic?: boolean,
) => void;
export declare function styleSingleton(): FC<{
  styles: string;
  dynamic?: boolean;
}>;
