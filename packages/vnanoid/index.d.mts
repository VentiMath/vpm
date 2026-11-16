export function nanoid<T extends string = string>(size?: number): T;
export function customAlphabet<T extends string = string>(alphabet: string, defaultSize?: number): (size?: number) => T;
export function customRandom<T extends string = string>(alphabet: string, defaultSize: number, random: (bytes: number) => Uint8Array): (size?: number) => T;
export function random(bytes: number): Uint8Array;
export const urlAlphabet: string;
