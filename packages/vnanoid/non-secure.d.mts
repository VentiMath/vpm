export function nanoid<T extends string = string>(size?: number): T;
export function customAlphabet<T extends string = string>(alphabet: string, defaultSize?: number): (size?: number) => T;
