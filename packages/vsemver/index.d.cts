declare namespace semver {
  export interface Options {
    loose?: boolean;
    includePrerelease?: boolean;
  }
  export interface CoerceOptions extends Options {
    rtl?: boolean;
  }
  export type OptionInput = Options | boolean;
  export type Version = string | SemVer;
  export type RangeInput = string | Range | Comparator;
  export type ReleaseType =
    | "major"
    | "minor"
    | "patch"
    | "premajor"
    | "preminor"
    | "prepatch"
    | "prerelease";
  export class SemVer {
    constructor(version: Version, options?: OptionInput);
    raw: string;
    version: string;
    major: number;
    minor: number;
    patch: number;
    prerelease: Array<string | number>;
    build: string[];
    loose: boolean;
    includePrerelease: boolean;
    options: Options;
    format(): string;
    toString(): string;
    compare(other: Version): number;
    compareMain(other: Version): number;
    comparePre(other: Version): number;
    compareBuild(other: Version): number;
  }
  export class Comparator {
    static readonly ANY: unique symbol;
    constructor(comp: string | Comparator, options?: OptionInput);
    value: string;
    operator: string;
    semver: SemVer | typeof Comparator.ANY;
    options: Options;
    loose: boolean;
    test(version: Version): boolean;
    intersects(other: Comparator, options?: OptionInput): boolean;
    toString(): string;
  }
  export class Range {
    constructor(range: RangeInput, options?: OptionInput);
    raw: string;
    range: string;
    set: Comparator[][];
    options: Options;
    loose: boolean;
    includePrerelease: boolean;
    format(): string;
    toString(): string;
    test(version: Version): boolean;
    intersects(other: Range, options?: OptionInput): boolean;
  }
  export function parse(
    version: unknown,
    options?: OptionInput,
    throwErrors?: boolean,
  ): SemVer | null;
  export function valid(version: unknown, options?: OptionInput): string | null;
  export function clean(version: string, options?: OptionInput): string | null;
  export function prerelease(
    version: unknown,
    options?: OptionInput,
  ): Array<string | number> | null;
  export function coerce(
    version: unknown,
    options?: CoerceOptions,
  ): SemVer | null;
  export function diff(a: Version, b: Version): ReleaseType | null;
  export function compareIdentifiers(
    a: string | number,
    b: string | number,
  ): number;
  export function rcompareIdentifiers(
    a: string | number,
    b: string | number,
  ): number;
  export function compareLoose(a: Version, b: Version): number;
  export function cmp(
    a: Version,
    operator: string,
    b: Version,
    options?: OptionInput,
  ): boolean;
  export function satisfies(
    version: Version,
    range: RangeInput,
    options?: OptionInput,
  ): boolean;
  export function validRange(
    range: RangeInput,
    options?: OptionInput,
  ): string | null;
  export function intersects(
    a: RangeInput,
    b: RangeInput,
    options?: OptionInput,
  ): boolean;
  export function toComparators(
    range: RangeInput,
    options?: OptionInput,
  ): string[][];
  export function maxSatisfying(
    versions: readonly string[],
    range: RangeInput,
    options?: OptionInput,
  ): string | null;
  export function minSatisfying(
    versions: readonly string[],
    range: RangeInput,
    options?: OptionInput,
  ): string | null;
  export const SEMVER_SPEC_VERSION: "2.0.0";
  export function compare(
    a: Version,
    b: Version,
    options?: OptionInput,
  ): number;
  export function rcompare(
    a: Version,
    b: Version,
    options?: OptionInput,
  ): number;
  export function compareBuild(
    a: Version,
    b: Version,
    options?: OptionInput,
  ): number;
  export function gt(a: Version, b: Version, options?: OptionInput): boolean;
  export function gte(a: Version, b: Version, options?: OptionInput): boolean;
  export function lt(a: Version, b: Version, options?: OptionInput): boolean;
  export function lte(a: Version, b: Version, options?: OptionInput): boolean;
  export function eq(a: Version, b: Version, options?: OptionInput): boolean;
  export function neq(a: Version, b: Version, options?: OptionInput): boolean;
  export function major(version: Version, options?: OptionInput): number;
  export function minor(version: Version, options?: OptionInput): number;
  export function patch(version: Version, options?: OptionInput): number;
  export function sort<T extends Version>(
    versions: T[],
    options?: OptionInput,
  ): T[];
  export function rsort<T extends Version>(
    versions: T[],
    options?: OptionInput,
  ): T[];
}
export = semver;
