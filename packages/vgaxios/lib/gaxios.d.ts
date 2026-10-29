type Agent = {destroy(): void};
import type {URLLike as URL} from 'vnode-fetch';
import { GaxiosOptions, GaxiosPromise, GaxiosResponse } from './common';
import { GaxiosInterceptorManager } from './interceptor';
export declare class Gaxios {
    protected agentCache: Map<string, Agent>;
    defaults: GaxiosOptions;
    interceptors: {
        request: GaxiosInterceptorManager<import('./common').GaxiosOptionsPrepared>;
        response: GaxiosInterceptorManager<GaxiosResponse>;
    };
    constructor(defaults?: GaxiosOptions);
    destroy(): void;
    request<T = any>(opts?: GaxiosOptions): GaxiosPromise<T>;
    fetch<T = any>(input: import('./common').FetchRequestInfo | GaxiosOptions, init?: GaxiosOptions): GaxiosPromise<T>;
    static mergeHeaders(base?: import('./common').HeadersInit, ...append: (import('./common').HeadersInit | undefined)[]): import('./common').Headers;
    protected _request<T = any>(opts: import('./common').GaxiosOptionsPrepared): GaxiosPromise<T>;
}
