import type * as React from "react";
type OmitEach<T,K extends PropertyKey> = T extends unknown ? Omit<T,K> : never;
export type InternalStandardProps<P, Remove extends keyof P = never> = OmitEach<P,"classes"|Remove> & {
 ref?: P extends {ref?:infer Ref} ? Ref : React.Ref<unknown>;
 className?:string;
 style?:React.CSSProperties;
 classes?:Record<never,string>;
};
