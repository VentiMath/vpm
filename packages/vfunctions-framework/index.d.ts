// Derived from Functions Framework 5.0.2, Apache-2.0; modified for portable VPM types.
import { Request as ExpressRequest, Response } from 'vexpress';
import type { ByteBuffer } from 'vbody-parser';
/** CloudEvents 1.0 data envelope; this does not perform runtime validation. */
interface CloudEvent<T = unknown> {
    id: string;
    specversion: string;
    source: string;
    type: string;
    datacontenttype?: string;
    dataschema?: string;
    subject?: string;
    time?: string;
    data?: T;
    data_base64?: string;
    [extension: string]: unknown;
}
/** Portable subset of the native cancellation interfaces. */
export interface CancellationSignal {
    readonly aborted: boolean;
    readonly reason: any;
    throwIfAborted(): void;
    addEventListener(type: 'abort', listener: () => void, options?: boolean | { once?: boolean }): void;
    removeEventListener(type: 'abort', listener: () => void): void;
}
export interface CancellationController {
    readonly signal: CancellationSignal;
    abort(reason?: any): void;
}
export type DoneCallback = (error?: unknown, result?: unknown) => void;
/**
 * @public
 */
export { CloudEvent };
/**
 * @public
 */
export interface Request extends ExpressRequest {
    /**
     * A buffer which provides access to the request's raw HTTP body.
     */
    rawBody?: ByteBuffer;
    /**
     * Request-specified execution ID.
     */
    executionId?: string;
    /**
     * Cloud Trace span ID.
     */
    spanId?: string;
    /**
     * An AbortController used to signal cancellation of a function invocation (e.g. in case of time out).
     */
    abortController?: CancellationController;
}
/**
 * @public
 */
export { Response };
/**
 * A HTTP function handler.
 * @public
 */
export interface HttpFunction {
    (req: Request, res: Response): any;
}
/**
 * A legacy event function handler.
 * @public
 */
export interface EventFunction {
    (data: {}, context: Context): any;
}
/**
 * A legacy event function handler with callback.
 * @public
 */
export interface EventFunctionWithCallback {
    (data: {}, context: Context, callback: DoneCallback): any;
}
/**
 * A CloudEvent function handler.
 * @public
 */
export interface CloudEventFunction<T = unknown> {
    (cloudEvent: CloudEvent<T>): any;
}
/**
 * A CloudEvent function handler with callback.
 * @public
 */
export interface CloudEventFunctionWithCallback<T = unknown> {
    (cloudEvent: CloudEvent<T>, callback: DoneCallback): any;
}
/**
 * A function handler.
 * @public
 */
export type HandlerFunction<T = unknown> = HttpFunction | EventFunction | EventFunctionWithCallback | CloudEventFunction<T> | CloudEventFunctionWithCallback<T>;
/**
 * A legacy event.
 * @public
 */
export interface LegacyEvent {
    data: {
        [key: string]: any;
    };
    context: CloudFunctionsContext;
}
/**
 * A data object used for legacy event functions.
 * @public
 */
export interface Data {
    data: object;
}
/**
 * A legacy event function context.
 * @public
 */
export type LegacyCloudFunctionsContext = CloudFunctionsContext | Data;
/**
 * The Cloud Functions context object for the event.
 * {@link https://cloud.google.com/functions/docs/writing/background#function_parameters}
 * @public
 */
export interface CloudFunctionsContext {
    /**
     * A unique ID for the event. For example: "70172329041928".
     */
    eventId?: string;
    /**
     * The date/time this event was created. For example: "2018-04-09T07:56:12.975Z"
     * This will be formatted as ISO 8601.
     */
    timestamp?: string;
    /**
     * The type of the event. For example: "google.pubsub.topic.publish".
     */
    eventType?: string;
    /**
     * The resource that emitted the event.
     */
    resource?: string | {
        [key: string]: string;
    };
}
/**
 * The function's context.
 * @public
 */
export type Context = CloudFunctionsContext | CloudEvent<unknown>;
/**
 * InvocationRequest represents the properties of an invocation over HTTP.
 * @public
 */
export interface InvocationRequest {
    /** Returns the request body as either a string or a ByteBuffer if the body is binary. */
    body(): string | ByteBuffer;
    /** Header returns the value of the specified header */
    header(header: string): string | undefined;
}
/**
 * InvocationResponse interface describes the properties that can be set on
 * an invocation response.
 * @public
 */
export interface InvocationResponse {
    /** Sets a header on the response. */
    setHeader(key: string, value: string): void;
    /** Writes a chunk of data to the response. */
    write(data: string | ByteBuffer): void;
    /** Ends the response, must be called once at the end of writing. */
    end(data: string | ByteBuffer): void;
}

export function http(functionName: string, handler: HttpFunction): void;
export function cloudEvent<T = unknown>(functionName: string, handler: CloudEventFunction<T>): void;
export function cloudEvent<T = unknown>(functionName: string, handler: CloudEventFunctionWithCallback<T>): void;
