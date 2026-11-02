import type {Buffer} from './platform';
/** Incremental gRPC framing. Returned buffers and pending bytes are owned. */
export declare class StreamDecoder {
    #private;
    constructor(maxReadMessageLength: number);
    write(data: Buffer): Buffer[];
}
