interface BaseOptions {
}
interface BaseOptionsRefined {
}
interface EventSourceOptions {
}
interface EventSourceOptionsRefined {
}
interface EventRefiners {
}
type RawOptionsFromRefiners<Refiners extends GenericRefiners> = {
    [Prop in keyof Refiners]?: Refiners[Prop] extends ((input: infer RawType, optionName: string) => infer RefinedType) ? (any extends RawType ? RefinedType : RawType) : never;
};
type RefinedOptionsFromRefiners<Refiners extends GenericRefiners> = {
    [Prop in keyof Refiners]?: Refiners[Prop] extends ((input: any, optionName: string) => infer RefinedType) ? RefinedType : never;
};
type GenericRefiners = {
    [propName: string]: (input: any, propName: string) => any;
};
type Identity<T = any> = (raw: T) => T;
/**
 * The runtime's fetch `Response`. Without DOM or Node types it is the part
 * FullCalendar reads.
 */
type FetchResponse = typeof globalThis extends {
    Response: {
        prototype: infer R;
    };
} ? R : {
    readonly ok: boolean;
    readonly status: number;
    readonly statusText: string;
    readonly url: string;
    json(): Promise<any>;
    text(): Promise<string>;
};
declare class JsonRequestError extends Error {
    response: FetchResponse;
    constructor(message: string, response: FetchResponse);
}
declare function requestJson<ParsedResponse>(method: string, url: string, params: Record<string, any>): Promise<[ParsedResponse, FetchResponse]>;
declare function identity<T>(raw: T): T;

export { BaseOptions, BaseOptionsRefined, EventRefiners, EventSourceOptions, EventSourceOptionsRefined, FetchResponse, Identity, JsonRequestError, RawOptionsFromRefiners, RefinedOptionsFromRefiners, identity, requestJson };
