declare function balanced(open: string | RegExp, close: string | RegExp, source: string): balanced.Match | undefined;
declare namespace balanced {
 interface Match { start: number; end: number; pre: string; body: string; post: string; }
 const balanced: (open: string | RegExp, close: string | RegExp, source: string) => Match | undefined;
 function range(open: string, close: string, source: string): [number, number] | undefined;
}
export = balanced;
