import type { Resolver } from "./index.cjs";
/** Full Zod 3 and 4 schemas expose these public parsing methods and type markers. */
export interface ZodSchema {
  readonly _input: any;
  readonly _output: any;
  safeParse: (input: any, options?: any) => any;
  safeParseAsync: (input: any, options?: any) => Promise<any>;
}
export declare function zodResolver<S extends ZodSchema>(
  schema: S,
  schemaOptions?: Parameters<S["safeParse"]>[1],
  resolverOptions?: { mode?: "sync" | "async"; raw?: false },
): Resolver<S["_input"], S["_output"]>;
export declare function zodResolver<S extends ZodSchema>(
  schema: S,
  schemaOptions: Parameters<S["safeParse"]>[1] | undefined,
  resolverOptions: { mode?: "sync" | "async"; raw: true },
): Resolver<S["_input"], S["_input"]>;
export declare function zodResolver<S extends ZodSchema>(
  schema: S,
  schemaOptions: Parameters<S["safeParse"]>[1] | undefined,
  resolverOptions: { mode?: "sync" | "async"; raw: boolean },
): Resolver<S["_input"], S["_input"] | S["_output"]>;
