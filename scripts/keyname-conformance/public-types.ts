import { keyName, base, shift, type KeyboardEventLike } from "vw3c-keyname";
const native: string = keyName(new KeyboardEvent("keydown", { key: "λ" }));
const generic: string = keyName(new Event("keydown"));
const structural: KeyboardEventLike = { keyCode: 65, shiftKey: true };
const result: string = keyName(structural);
const code: string = base[65];
shift[250] = "Custom";
// @ts-expect-error keyboard codes are numeric
keyName({ keyCode: "65" });
// @ts-expect-error names are strings
keyName({ key: 3 });
// @ts-expect-error event argument is required
keyName();
