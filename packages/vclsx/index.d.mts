export type ClassValue = string | number | bigint | boolean | null | undefined | ClassDictionary | ClassArray;
export type ClassDictionary = Record<string, any>;
export type ClassArray = readonly ClassValue[];
export declare function clsx(...inputs: ClassValue[]): string;
export default clsx;
