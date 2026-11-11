/** Object styles used by Notistack. Numbers are emitted without implicit units. */
export interface CSSObject { [propertyOrSelector: string]: string | number | null | undefined | false | CSSObject; }
export type StyleInput = CSSObject | readonly StyleInput[] | null | undefined | false;
export type StyleTarget = HTMLElement | ShadowRoot | Document | { data: string };
export declare function css(this: { target?: StyleTarget } | void, ...styles: StyleInput[]): string;
/** Return and clear the target's stylesheet. Later css calls reinsert their rules. */
export declare function extractCss(target?: StyleTarget): string;
