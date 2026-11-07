import type { Command, Plugin } from "vprosemirror-state";
export type KeyBindings = Readonly<{ [key: string]: Command }>;
export declare function keymap(bindings: KeyBindings): Plugin;
export declare function keydownHandler(
  bindings: KeyBindings,
): (view: NonNullable<Parameters<Command>[2]>, event: KeyboardEvent) => boolean;
