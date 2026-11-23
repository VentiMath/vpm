export interface Match { start: number; end: number; pre: string; body: string; post: string; }
export function balanced(open: string | RegExp, close: string | RegExp, source: string): Match | undefined;
export function range(open: string, close: string, source: string): [number, number] | undefined;
export default balanced;
