declare function minimatch(path: string, pattern: string, options?: minimatch.MinimatchOptions): boolean;
type MinimatchAPI = typeof minimatch;
declare namespace minimatch {
 interface MinimatchOptions {
  nobrace?: boolean; nocomment?: boolean; nonegate?: boolean; noglobstar?: boolean; noext?: boolean; nonull?: boolean;
  windowsPathsNoEscape?: boolean; allowWindowsEscape?: boolean; partial?: boolean; dot?: boolean; nocase?: boolean;
  nocaseMagicOnly?: boolean; normalize?: boolean | 'NFC' | 'NFD' | 'NFKC' | 'NFKD'; magicalBraces?: boolean;
  matchBase?: boolean; flipNegate?: boolean; preserveMultipleSlashes?: boolean; optimizationLevel?: number;
  platform?: 'aix' | 'android' | 'darwin' | 'freebsd' | 'haiku' | 'linux' | 'openbsd' | 'sunos' | 'win32' | 'cygwin' | 'netbsd';
  windowsNoMagicRoot?: boolean; braceExpandMax?: number; maxGlobstarRecursion?: number;
 }
 interface SegmentMatcher extends RegExp { readonly pattern: string; readonly _glob: string; readonly options: Readonly<MinimatchOptions>; testUnchecked(path: string): boolean; }
 const GLOBSTAR: unique symbol;
 type ParseReturnFiltered = string | SegmentMatcher | typeof GLOBSTAR;
 type ParseReturn = ParseReturnFiltered;
 class Minimatch {
  constructor(pattern: string, options?: MinimatchOptions);
  readonly options: MinimatchOptions; pattern: string; set: ParseReturnFiltered[][]; globSet: string[]; globParts: string[][];
  negate: boolean; comment: boolean; empty: boolean; partial: boolean; nocase: boolean; nonegate: boolean;
  isWindows: boolean; platform: NonNullable<MinimatchOptions['platform']>; windowsPathsNoEscape: boolean;
  windowsNoMagicRoot: boolean; preserveMultipleSlashes: boolean; maxGlobstarRecursion: number;
  match(path: string, partial?: boolean): boolean; matchOne(path: string[], pattern: ParseReturnFiltered[], partial?: boolean): boolean;
  hasMagic(): boolean; braceExpand(): string[]; parse(pattern: string): ParseReturn; make(): void; parseNegate(): void;
  makeRe(): RegExp | false;
  static defaults(options: MinimatchOptions): typeof Minimatch;
 }
 const minimatch: MinimatchAPI;
 function filter(pattern: string, options?: MinimatchOptions): (path: string) => boolean;
 function match(paths: string[], pattern: string, options?: MinimatchOptions): string[];
 function braceExpand(pattern: string, options?: MinimatchOptions): string[];
 function escape(value: string, options?: Pick<MinimatchOptions, 'windowsPathsNoEscape' | 'magicalBraces'>): string;
 function unescape(value: string, options?: Pick<MinimatchOptions, 'windowsPathsNoEscape' | 'magicalBraces'>): string;
 function defaults(options?: MinimatchOptions): MinimatchAPI;
 function makeRe(pattern: string, options?: MinimatchOptions): RegExp | false;
 const sep: '/' | '\\';
}
export = minimatch;
