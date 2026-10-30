declare function anynum(value: string): string;
declare function anynum<T>(value: T): T extends string ? string : T;
declare namespace anynum {
  export { anynum };
}
export = anynum;
