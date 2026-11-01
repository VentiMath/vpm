declare namespace clsx {
  type ClassValue = string | number | bigint | boolean | null | undefined | ClassDictionary | ClassArray;
  type ClassDictionary = Record<string, any>;
  type ClassArray = readonly ClassValue[];
  function clsx(...inputs: ClassValue[]): string;
}
declare function clsx(...inputs: clsx.ClassValue[]): string;
export = clsx;
